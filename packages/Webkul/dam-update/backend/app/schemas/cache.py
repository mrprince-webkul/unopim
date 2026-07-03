"""Schemas for the admin cache dashboard."""

from __future__ import annotations

from pydantic import BaseModel


class CacheStats(BaseModel):
    hits: int
    misses: int
    stale_served: int
    invalidations: int
    hit_ratio: float
    keys: int
    groups: dict[str, int]
    ttls: dict[str, int]


class CacheActionResult(BaseModel):
    ok: bool = True
    cleared: int = 0
    detail: str = ""


class ClearGroupRequest(BaseModel):
    group: str


class WarmResult(BaseModel):
    ok: bool = True
    warmed: list[str]
    count: int
