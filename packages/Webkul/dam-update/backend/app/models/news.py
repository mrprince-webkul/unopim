"""NewsArticle model — items ingested by the scheduled news fetcher."""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class NewsArticle(Base):
    __tablename__ = "news_articles"

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    summary: Mapped[str] = mapped_column(Text, nullable=False)
    image_url: Mapped[str | None] = mapped_column(String(1000))
    source_url: Mapped[str] = mapped_column(String(1000), unique=True, index=True, nullable=False)
    source_name: Mapped[str] = mapped_column(String(200), nullable=False)
    category: Mapped[str] = mapped_column(String(100), index=True, nullable=False)
    # Comma-separated AI-generated tags (e.g. "python,async,web").
    tags: Mapped[str] = mapped_column(Text, default="", server_default="")
    reading_time: Mapped[int] = mapped_column(Integer, default=1, server_default="1")
    published_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
