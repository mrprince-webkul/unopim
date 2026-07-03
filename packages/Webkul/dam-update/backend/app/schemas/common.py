"""Shared response envelopes."""

from __future__ import annotations

from typing import Generic, TypeVar

from pydantic import BaseModel

T = TypeVar("T")


class Paginated(BaseModel, Generic[T]):
    """Standard pagination envelope: `{items, total, page, pages, size}`."""

    items: list[T]
    total: int
    page: int
    pages: int
    size: int


class Message(BaseModel):
    message: str


def paginate(items: list, total: int, page: int, size: int) -> dict:
    """Build the dict for a Paginated[...] response given raw query results."""
    pages = (total + size - 1) // size if size else 0
    return {
        "items": items,
        "total": total,
        "page": page,
        "pages": max(pages, 0),
        "size": size,
    }
