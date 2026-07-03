"""News article schema."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, field_validator


class NewsArticleRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    summary: str
    image_url: str | None = None
    source_url: str
    source_name: str
    category: str
    tags: list[str] = []
    reading_time: int
    published_at: datetime
    created_at: datetime

    @field_validator("tags", mode="before")
    @classmethod
    def _split_tags(cls, v):
        if isinstance(v, str):
            return [t.strip() for t in v.split(",") if t.strip()]
        return v or []
