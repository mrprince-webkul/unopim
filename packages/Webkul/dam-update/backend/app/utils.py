"""Small stateless helpers used across the app: slugify and reading-time estimation."""

from __future__ import annotations

import re
from collections.abc import Awaitable, Callable
from datetime import datetime, timezone

_SLUG_INVALID_CHARS = re.compile(r"[^a-z0-9]+")


def slugify(text: str) -> str:
    """Turn arbitrary text into a lowercase, hyphen-separated URL slug."""
    text = text.strip().lower()
    text = _SLUG_INVALID_CHARS.sub("-", text)
    text = text.strip("-")
    return text or "item"


async def unique_slugify(
    text: str,
    exists: Callable[[str], Awaitable[bool]],
) -> str:
    """Generate a slug from `text`, appending `-2`, `-3`, ... until `exists()` returns False.

    `exists` is an async predicate that checks whether a given candidate slug
    is already taken (optionally excluding the current row being updated).
    """
    base = slugify(text)
    candidate = base
    suffix = 2
    while await exists(candidate):
        candidate = f"{base}-{suffix}"
        suffix += 1
    return candidate


_WORD_RE = re.compile(r"\S+")


def reading_time(text: str, words_per_minute: int = 200) -> int:
    """Estimate reading time in whole minutes (minimum 1) from word count."""
    if not text:
        return 1
    word_count = len(_WORD_RE.findall(text))
    minutes = max(1, round(word_count / words_per_minute))
    return minutes


def ensure_aware(dt: datetime) -> datetime:
    """Normalize a possibly-naive datetime (e.g. round-tripped through SQLite) to UTC-aware."""
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt
