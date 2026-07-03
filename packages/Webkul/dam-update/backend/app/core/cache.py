"""Production cache layer over Redis (with the in-process fallback in redis.py).

Features
--------
- Cache-aside via ``cached(key, ttl, loader, tags=..., swr=...)``.
- Tag-based invalidation: each cached key is registered in a Redis SET per tag,
  so ``invalidate_tags("news")`` drops every key touched by the news domain.
- Stale-while-revalidate: values are stored with a soft ``fresh_until`` inside a
  JSON envelope and a hard TTL of ``ttl + swr``. A read past ``fresh_until`` but
  within the hard TTL returns the stale value immediately and refreshes in the
  background (single-flight guarded by a lock key), so users never wait.
- Hit / miss / stale / invalidation counters for the admin cache dashboard.

All values must be JSON-serialisable. Group is the first path segment of the key
(``cache:<group>:<ident>``) and is used for "clear this group" operations.
"""

from __future__ import annotations

import asyncio
import json
import logging
import time
from typing import Any, Awaitable, Callable, Iterable

from app.core.redis import get_redis

logger = logging.getLogger("devannounce.cache")

PREFIX = "cache:"
_TAG_PREFIX = "cache:tag:"
_LOCK_PREFIX = "cache:lock:"
_STATS = "cache:stats"  # hash-like counters stored as individual keys

# Default TTLs (seconds) per logical group — tune via admin later.
DEFAULT_TTL = 60
GROUP_TTL: dict[str, int] = {
    "home": 30,
    "announcements": 45,
    "trending": 60,
    "news": 120,
    "categories": 300,
    "profile": 60,
    "search": 30,
    "stats": 30,
}


def group_of(key: str) -> str:
    parts = key.split(":")
    return parts[1] if len(parts) > 1 else "misc"


def ttl_for(key: str, override: int | None = None) -> int:
    if override is not None:
        return override
    return GROUP_TTL.get(group_of(key), DEFAULT_TTL)


async def _bump(counter: str, amount: int = 1) -> None:
    try:
        await get_redis().incr(f"{_STATS}:{counter}")
    except Exception:  # noqa: BLE001
        pass


async def _register_tags(key: str, tags: Iterable[str], hard_ttl: int) -> None:
    redis = get_redis()
    for tag in tags:
        tag_key = f"{_TAG_PREFIX}{tag}"
        try:
            await redis.sadd(tag_key, key)
            # keep the tag set alive a little longer than the values it tracks
            await redis.expire(tag_key, hard_ttl + 300)
        except Exception:  # noqa: BLE001
            pass


async def _store(key: str, value: Any, ttl: int, swr: int, tags: Iterable[str]) -> None:
    envelope = json.dumps({"v": value, "f": time.time() + ttl})
    hard_ttl = ttl + max(swr, 0)
    await get_redis().set(key, envelope, ex=hard_ttl)
    await _register_tags(key, tags, hard_ttl)


async def _refresh(key: str, loader: Callable[[], Awaitable[Any]], ttl: int, swr: int, tags: Iterable[str]) -> None:
    """Background single-flight refresh guarded by a short lock key."""
    lock_key = f"{_LOCK_PREFIX}{key}"
    got = await get_redis().set_if_absent(lock_key, "1", ex=30)
    if not got:
        return
    try:
        value = await loader()
        await _store(key, value, ttl, swr, tags)
    except Exception:  # noqa: BLE001
        logger.warning("Background cache refresh failed for %s", key, exc_info=True)
    finally:
        await get_redis().delete(lock_key)


async def cached(
    key: str,
    loader: Callable[[], Awaitable[Any]],
    *,
    ttl: int | None = None,
    swr: int = 30,
    tags: Iterable[str] = (),
) -> Any:
    """Return a cached value or compute + store it. See module docstring."""
    resolved_ttl = ttl_for(key, ttl)
    tags = tuple(tags)
    redis = get_redis()

    try:
        raw = await redis.get(key)
    except Exception:  # noqa: BLE001
        raw = None

    if raw is not None:
        try:
            env = json.loads(raw)
            value, fresh_until = env["v"], env["f"]
        except (ValueError, KeyError, TypeError):
            value, fresh_until = None, 0
            raw = None
        if raw is not None:
            if time.time() <= fresh_until:
                await _bump("hits")
                return value
            # stale but usable → serve now, refresh in the background
            await _bump("stale")
            asyncio.create_task(_refresh(key, loader, resolved_ttl, swr, tags))
            return value

    await _bump("misses")
    value = await loader()
    try:
        await _store(key, value, resolved_ttl, swr, tags)
    except Exception:  # noqa: BLE001
        logger.warning("Cache store failed for %s", key, exc_info=True)
    return value


async def invalidate_tags(*tags: str) -> int:
    """Delete every key registered under any of the given tags. Returns count."""
    redis = get_redis()
    removed = 0
    for tag in tags:
        tag_key = f"{_TAG_PREFIX}{tag}"
        try:
            members = await redis.smembers(tag_key)
            if members:
                removed += await redis.delete_many(list(members))
            await redis.delete(tag_key)
        except Exception:  # noqa: BLE001
            logger.warning("Tag invalidation failed for %s", tag, exc_info=True)
    if removed:
        await _bump("invalidations", removed)
    return removed


async def clear_group(group: str) -> int:
    redis = get_redis()
    keys = await redis.scan_keys(f"{PREFIX}{group}:*")
    return await redis.delete_many(keys)


async def clear_all() -> int:
    """Drop all cached values + tag sets (keeps stats counters)."""
    redis = get_redis()
    keys = await redis.scan_keys(f"{PREFIX}*")
    keys = [k for k in keys if not k.startswith(_STATS)]
    return await redis.delete_many(keys)


async def cache_stats() -> dict:
    redis = get_redis()

    async def _count(name: str) -> int:
        try:
            raw = await redis.get(f"{_STATS}:{name}")
            return int(raw) if raw else 0
        except Exception:  # noqa: BLE001
            return 0

    hits = await _count("hits")
    misses = await _count("misses")
    stale = await _count("stale")
    invalidations = await _count("invalidations")
    total = hits + misses
    ratio = round(hits / total, 4) if total else 0.0

    try:
        all_keys = await redis.scan_keys(f"{PREFIX}*")
    except Exception:  # noqa: BLE001
        all_keys = []
    value_keys = [
        k for k in all_keys if not k.startswith(_STATS) and not k.startswith(_TAG_PREFIX) and not k.startswith(_LOCK_PREFIX)
    ]
    groups: dict[str, int] = {}
    for k in value_keys:
        groups[group_of(k)] = groups.get(group_of(k), 0) + 1

    return {
        "hits": hits,
        "misses": misses,
        "stale_served": stale,
        "invalidations": invalidations,
        "hit_ratio": ratio,
        "keys": len(value_keys),
        "groups": groups,
        "ttls": GROUP_TTL,
    }


async def reset_stats() -> None:
    redis = get_redis()
    for name in ("hits", "misses", "stale", "invalidations"):
        await redis.delete(f"{_STATS}:{name}")


async def warm_all() -> dict:
    """Preload popular pages so the first visitor after a deploy is fast."""
    from app.core.database import AsyncSessionLocal

    warmed: list[str] = []
    async with AsyncSessionLocal() as db:
        # Import lazily to avoid import cycles; each is best-effort.
        try:
            from app.services import cache_loaders

            warmed = await cache_loaders.warm(db)
        except Exception:  # noqa: BLE001
            logger.info("cache_loaders.warm unavailable; skipping warm", exc_info=True)
    return {"warmed": warmed, "count": len(warmed)}
