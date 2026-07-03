"""AI provider configuration — the multi-provider news/summarization engine.

Each row is a provider the admin can configure (API key, model, limits…).
Exactly one provider may be `is_active` at a time; the summarizer routes all
requests through it. `provider_type` selects the wire protocol used to talk to
the provider's API (OpenAI-compatible, Anthropic Messages, or Google Gemini).
"""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import Boolean, DateTime, Float, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class AIProvider(Base):
    __tablename__ = "ai_providers"

    id: Mapped[int] = mapped_column(primary_key=True)
    key: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    provider_type: Mapped[str] = mapped_column(
        String(30), default="openai_compatible", server_default="openai_compatible"
    )
    api_key: Mapped[str] = mapped_column(Text, default="", server_default="")
    base_url: Mapped[str] = mapped_column(String(500), default="", server_default="")
    model: Mapped[str] = mapped_column(String(200), default="", server_default="")
    temperature: Mapped[float] = mapped_column(Float, default=0.7, server_default="0.7")
    max_tokens: Mapped[int] = mapped_column(Integer, default=600, server_default="600")
    timeout: Mapped[int] = mapped_column(Integer, default=30, server_default="30")
    daily_limit: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    enabled: Mapped[bool] = mapped_column(Boolean, default=False, server_default="0")
    is_active: Mapped[bool] = mapped_column(Boolean, default=False, server_default="0")
    sort_order: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
