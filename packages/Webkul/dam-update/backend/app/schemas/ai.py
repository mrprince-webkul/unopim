"""Schemas for the multi-provider AI news engine (providers, tests, status)."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict


class ProviderConfig(BaseModel):
    """A single AI provider entry (mirrors the dicts stored in `AI_PROVIDERS`)."""

    # `model` collides with pydantic's protected `model_` namespace; disable it.
    model_config = ConfigDict(protected_namespaces=(), extra="ignore")

    id: str
    type: Literal["openai_compatible", "anthropic"] = "openai_compatible"
    label: str = ""
    api_key: str = ""
    base_url: str = ""
    model: str = ""
    temperature: float = 0.4
    max_tokens: int = 500
    timeout: int = 30
    daily_limit: int = 0
    enabled: bool = False


class ActiveProviderUpdate(BaseModel):
    """Body for selecting the active provider."""

    id: str


class ProviderTestResult(BaseModel):
    """Result of a live provider connectivity/completion test."""

    ok: bool
    latency_ms: int
    error: str | None = None
    sample: str = ""


class AIStatus(BaseModel):
    """Snapshot of the AI news engine configuration."""

    active_provider: str | None = None
    enabled_count: int = 0
    ai_news_enabled: bool = False
