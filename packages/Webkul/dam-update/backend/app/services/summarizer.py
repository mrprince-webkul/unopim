"""AI summarization of news articles via the Anthropic Messages API.

Falls back to a cleaned/truncated version of the RSS description on any
failure (missing key, network error, bad response, disabled setting) so a
flaky summarizer never breaks the news fetch.
"""

from __future__ import annotations

import logging
import re

import httpx

ANTHROPIC_MODEL = "claude-haiku-4-5-20251001"
ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages"
ANTHROPIC_VERSION = "2023-06-01"

logger = logging.getLogger("devannounce.summarizer")

_HTML_TAG_RE = re.compile(r"<[^>]+>")
_WHITESPACE_RE = re.compile(r"\s+")


def clean_description(raw: str, max_chars: int = 400) -> str:
    """Strip HTML tags/entities and truncate raw RSS description text."""
    if not raw:
        return ""
    text = _HTML_TAG_RE.sub(" ", raw)
    text = (
        text.replace("&amp;", "&")
        .replace("&lt;", "<")
        .replace("&gt;", ">")
        .replace("&quot;", '"')
        .replace("&#39;", "'")
        .replace("&nbsp;", " ")
    )
    text = _WHITESPACE_RE.sub(" ", text).strip()
    if len(text) > max_chars:
        text = text[:max_chars].rsplit(" ", 1)[0].rstrip(",.;:") + "..."
    return text


async def summarize_article(
    title: str,
    description: str,
    api_key: str | None,
    enabled: bool,
) -> str:
    """Return a 2-3 sentence developer-focused summary, or the cleaned RSS description."""
    fallback = clean_description(description) or title
    if not enabled or not api_key:
        return fallback

    prompt = (
        "Write a concise 2-3 sentence summary of this developer news article, "
        "aimed at software engineers. Be factual and specific, no fluff or "
        "marketing language.\n\n"
        f"Title: {title}\n\nDescription: {clean_description(description, 1200)}"
    )

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(
                ANTHROPIC_API_URL,
                headers={
                    "x-api-key": api_key,
                    "anthropic-version": ANTHROPIC_VERSION,
                    "content-type": "application/json",
                },
                json={
                    "model": ANTHROPIC_MODEL,
                    "max_tokens": 300,
                    "messages": [{"role": "user", "content": prompt}],
                },
            )
            response.raise_for_status()
            data = response.json()
            parts = data.get("content", [])
            text = "".join(p.get("text", "") for p in parts if p.get("type") == "text").strip()
            return text or fallback
    except Exception as exc:  # noqa: BLE001
        logger.warning("Anthropic summarization failed, using fallback: %s", exc)
        return fallback


async def summarize_via_provider(provider, title: str, description: str, template: str) -> str:
    """Summarize using the active multi-provider AI engine, with RSS fallback."""
    from app.services import ai_providers

    fallback = clean_description(description) or title
    content = clean_description(description, 1200)
    tmpl = template or (
        "Write a concise 2-3 sentence summary of this developer news article, aimed "
        "at software engineers. Be factual and specific, no fluff.\n\n"
        "Title: {title}\n\nContent: {content}"
    )
    try:
        prompt = tmpl.format(title=title, content=content)
    except (KeyError, IndexError):
        prompt = f"{tmpl}\n\nTitle: {title}\n\nContent: {content}"
    try:
        text = (await ai_providers.chat(provider, prompt)).strip()
        return text or fallback
    except Exception as exc:  # noqa: BLE001
        logger.warning("Provider summarization failed (%s), using fallback: %s", provider.key, exc)
        return fallback


async def generate_tags(provider, title: str, summary: str) -> str:
    """Ask the active provider for 3-5 lowercase tags, comma-separated."""
    from app.services import ai_providers

    prompt = (
        "Extract 3-5 short lowercase topic tags (single words or short phrases) for "
        "this developer news item. Respond with ONLY the tags, comma-separated, no "
        f"other text.\n\nTitle: {title}\nSummary: {summary}"
    )
    try:
        raw = (await ai_providers.chat(provider, prompt)).strip()
        parts = [t.strip().lower().lstrip("#") for t in raw.replace("\n", ",").split(",")]
        tags = [t for t in parts if t and len(t) <= 30][:5]
        return ",".join(tags)
    except Exception as exc:  # noqa: BLE001
        logger.warning("Tag generation failed (%s): %s", provider.key, exc)
        return ""
