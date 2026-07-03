"""Multi-provider AI engine.

The admin configures any number of providers (OpenAI, Anthropic, Gemini,
DeepSeek, Grok, OpenRouter, Together, Ollama, LM Studio, or a custom
OpenAI-compatible endpoint). Exactly one may be *active*; every summarization /
tag-generation request is routed through it — switchable at runtime with no
restart. Three wire protocols are supported via `provider_type`:

* ``openai_compatible`` — ``POST {base_url}/chat/completions`` (OpenAI, DeepSeek,
  Grok, OpenRouter, Together, Ollama, LM Studio, custom).
* ``anthropic`` — ``POST {base_url}/v1/messages``.
* ``gemini`` — ``POST {base_url}/v1beta/models/{model}:generateContent``.

Provider failures never raise to the caller — the summarizer falls back to a
cleaned RSS description — so a misconfigured provider can't break news import.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.redis import get_redis
from app.models.ai_provider import AIProvider
from app.services.settings_service import MASK_CHAR, mask_secret

logger = logging.getLogger("devannounce.ai")

# Provider types that support a live "test" ping and share the chat protocol.
PROVIDER_TYPES = {"openai_compatible", "anthropic", "gemini"}

# Seeded catalogue — every provider the platform knows how to talk to.
DEFAULT_PROVIDERS: list[dict] = [
    {"key": "openai", "name": "OpenAI", "provider_type": "openai_compatible", "base_url": "https://api.openai.com/v1", "model": "gpt-4o-mini", "sort_order": 1},
    {"key": "anthropic", "name": "Claude (Anthropic)", "provider_type": "anthropic", "base_url": "https://api.anthropic.com", "model": "claude-haiku-4-5-20251001", "sort_order": 2},
    {"key": "gemini", "name": "Google Gemini", "provider_type": "gemini", "base_url": "https://generativelanguage.googleapis.com", "model": "gemini-1.5-flash", "sort_order": 3},
    {"key": "deepseek", "name": "DeepSeek", "provider_type": "openai_compatible", "base_url": "https://api.deepseek.com/v1", "model": "deepseek-chat", "sort_order": 4},
    {"key": "grok", "name": "Grok (xAI)", "provider_type": "openai_compatible", "base_url": "https://api.x.ai/v1", "model": "grok-2-latest", "sort_order": 5},
    {"key": "openrouter", "name": "OpenRouter", "provider_type": "openai_compatible", "base_url": "https://openrouter.ai/api/v1", "model": "openai/gpt-4o-mini", "sort_order": 6},
    {"key": "together", "name": "Together AI", "provider_type": "openai_compatible", "base_url": "https://api.together.xyz/v1", "model": "meta-llama/Llama-3.1-8B-Instruct-Turbo", "sort_order": 7},
    {"key": "ollama", "name": "Ollama (Local)", "provider_type": "openai_compatible", "base_url": "http://host.docker.internal:11434/v1", "model": "llama3.1", "sort_order": 8},
    {"key": "lmstudio", "name": "LM Studio (Local)", "provider_type": "openai_compatible", "base_url": "http://host.docker.internal:1234/v1", "model": "local-model", "sort_order": 9},
    {"key": "custom", "name": "Custom OpenAI-Compatible", "provider_type": "openai_compatible", "base_url": "", "model": "", "sort_order": 10},
]


async def seed_default_providers(db: AsyncSession) -> None:
    """Idempotently insert the provider catalogue."""
    existing = {row[0] for row in (await db.execute(select(AIProvider.key))).all()}
    added = False
    for defaults in DEFAULT_PROVIDERS:
        if defaults["key"] in existing:
            continue
        db.add(AIProvider(**defaults))
        added = True
    if added:
        await db.commit()


async def list_providers(db: AsyncSession) -> list[AIProvider]:
    await seed_default_providers(db)
    result = await db.execute(select(AIProvider).order_by(AIProvider.sort_order, AIProvider.id))
    return list(result.scalars().all())


def to_dict(p: AIProvider, *, mask: bool = True) -> dict:
    """Serialise a provider for the API, masking the API key by default."""
    return {
        "id": p.id,
        "key": p.key,
        "name": p.name,
        "provider_type": p.provider_type,
        "api_key": mask_secret(p.api_key) if mask else p.api_key,
        "has_key": bool(p.api_key),
        "base_url": p.base_url,
        "model": p.model,
        "temperature": p.temperature,
        "max_tokens": p.max_tokens,
        "timeout": p.timeout,
        "daily_limit": p.daily_limit,
        "enabled": p.enabled,
        "is_active": p.is_active,
        "sort_order": p.sort_order,
    }


async def get_provider(db: AsyncSession, provider_id: int) -> AIProvider | None:
    return (
        await db.execute(select(AIProvider).where(AIProvider.id == provider_id))
    ).scalar_one_or_none()


async def get_active_provider(db: AsyncSession) -> AIProvider | None:
    await seed_default_providers(db)
    return (
        await db.execute(
            select(AIProvider).where(AIProvider.is_active.is_(True), AIProvider.enabled.is_(True))
        )
    ).scalar_one_or_none()


async def update_provider(db: AsyncSession, provider: AIProvider, updates: dict) -> AIProvider:
    for field, value in updates.items():
        if field == "api_key" and isinstance(value, str) and MASK_CHAR in value:
            continue  # round-tripped masked value — keep the stored secret
        setattr(provider, field, value)
    await db.commit()
    await db.refresh(provider)
    return provider


async def set_active(db: AsyncSession, provider: AIProvider) -> AIProvider:
    """Make `provider` the sole active provider (also enables it)."""
    for p in await list_providers(db):
        p.is_active = p.id == provider.id
    provider.enabled = True
    await db.commit()
    await db.refresh(provider)
    return provider


# --------------------------------------------------------------------------
# Daily rate limiting (per provider, per UTC day) via Redis
# --------------------------------------------------------------------------


async def _usage_today(key: str) -> int:
    day = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    try:
        raw = await get_redis().get(f"ai:usage:{key}:{day}")
        return int(raw) if raw else 0
    except Exception:  # noqa: BLE001
        return 0


async def _bump_usage(key: str) -> None:
    day = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    try:
        await get_redis().incr(f"ai:usage:{key}:{day}")
        await get_redis().expire(f"ai:usage:{key}:{day}", 172800)
    except Exception:  # noqa: BLE001
        pass


async def usage_summary(db: AsyncSession) -> list[dict]:
    out = []
    for p in await list_providers(db):
        out.append({"key": p.key, "name": p.name, "used_today": await _usage_today(p.key), "daily_limit": p.daily_limit})
    return out


# --------------------------------------------------------------------------
# Chat completion dispatch
# --------------------------------------------------------------------------


async def _chat_openai(p: AIProvider, prompt: str) -> str:
    url = f"{p.base_url.rstrip('/')}/chat/completions"
    headers = {"content-type": "application/json"}
    if p.api_key:
        headers["authorization"] = f"Bearer {p.api_key}"
    body = {
        "model": p.model,
        "messages": [{"role": "user", "content": prompt}],
        "temperature": p.temperature,
        "max_tokens": p.max_tokens,
    }
    async with httpx.AsyncClient(timeout=float(p.timeout)) as client:
        r = await client.post(url, headers=headers, json=body)
        r.raise_for_status()
        data = r.json()
        return (data["choices"][0]["message"]["content"] or "").strip()


async def _chat_anthropic(p: AIProvider, prompt: str) -> str:
    url = f"{p.base_url.rstrip('/')}/v1/messages"
    headers = {
        "x-api-key": p.api_key,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
    }
    body = {
        "model": p.model,
        "max_tokens": p.max_tokens,
        "temperature": p.temperature,
        "messages": [{"role": "user", "content": prompt}],
    }
    async with httpx.AsyncClient(timeout=float(p.timeout)) as client:
        r = await client.post(url, headers=headers, json=body)
        r.raise_for_status()
        data = r.json()
        parts = data.get("content", [])
        return "".join(x.get("text", "") for x in parts if x.get("type") == "text").strip()


async def _chat_gemini(p: AIProvider, prompt: str) -> str:
    url = f"{p.base_url.rstrip('/')}/v1beta/models/{p.model}:generateContent?key={p.api_key}"
    body = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"temperature": p.temperature, "maxOutputTokens": p.max_tokens},
    }
    async with httpx.AsyncClient(timeout=float(p.timeout)) as client:
        r = await client.post(url, headers={"content-type": "application/json"}, json=body)
        r.raise_for_status()
        data = r.json()
        cands = data.get("candidates", [])
        if not cands:
            return ""
        parts = cands[0].get("content", {}).get("parts", [])
        return "".join(x.get("text", "") for x in parts).strip()


async def chat(provider: AIProvider, prompt: str) -> str:
    """Send a single-prompt chat request through `provider`. Raises on failure."""
    if provider.daily_limit and await _usage_today(provider.key) >= provider.daily_limit:
        raise RuntimeError(f"Provider '{provider.key}' hit its daily request limit")
    if provider.provider_type == "anthropic":
        text = await _chat_anthropic(provider, prompt)
    elif provider.provider_type == "gemini":
        text = await _chat_gemini(provider, prompt)
    else:
        text = await _chat_openai(provider, prompt)
    await _bump_usage(provider.key)
    return text


async def test_provider(provider: AIProvider) -> dict:
    """Fire a tiny prompt to verify credentials/connectivity."""
    try:
        reply = await chat(provider, "Reply with the single word: OK")
        return {"ok": True, "detail": (reply or "").strip()[:120] or "Empty response"}
    except httpx.HTTPStatusError as exc:
        return {"ok": False, "detail": f"HTTP {exc.response.status_code}: {exc.response.text[:160]}"}
    except Exception as exc:  # noqa: BLE001
        return {"ok": False, "detail": str(exc)[:200]}
