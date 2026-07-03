"""Schema for a configurable RSS / trending news source."""

from __future__ import annotations

from pydantic import BaseModel


class NewsSource(BaseModel):
    """A single news source (mirrors the dicts stored in `NEWS_SOURCES`)."""

    name: str
    url: str
    enabled: bool = True
