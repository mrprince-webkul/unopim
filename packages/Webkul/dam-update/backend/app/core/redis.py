"""Redis client wrapper with an in-process fallback.

Every helper degrades gracefully to an in-memory dict-backed store when
Redis is unreachable, so the app (and its test suite) works with zero
external services. This is used for: rate limiting, view-count dedupe,
and the refresh-token jti allowlist.
"""

from __future__ import annotations

import asyncio
import time
from functools import lru_cache

import redis.asyncio as aioredis

from app.core.config import settings


class _LocalStore:
    """Minimal in-process substitute for the Redis commands we rely on."""

    def __init__(self) -> None:
        self._data: dict[str, tuple[str, float | None]] = {}
        self._sets: dict[str, set[str]] = {}
        self._lock = asyncio.Lock()

    def _expired(self, key: str) -> bool:
        entry = self._data.get(key)
        if entry is None:
            return True
        _, expires_at = entry
        return expires_at is not None and expires_at < time.time()

    async def get(self, key: str) -> str | None:
        async with self._lock:
            if self._expired(key):
                self._data.pop(key, None)
                return None
            return self._data[key][0]

    async def set(self, key: str, value: str, ex: int | None = None) -> bool:
        async with self._lock:
            expires_at = time.time() + ex if ex else None
            self._data[key] = (str(value), expires_at)
            return True

    async def incr(self, key: str) -> int:
        async with self._lock:
            if self._expired(key):
                self._data[key] = ("1", None)
                return 1
            value, expires_at = self._data[key]
            new_value = int(value) + 1
            self._data[key] = (str(new_value), expires_at)
            return new_value

    async def expire(self, key: str, seconds: int) -> bool:
        async with self._lock:
            if key in self._data and not self._expired(key):
                value, _ = self._data[key]
                self._data[key] = (value, time.time() + seconds)
                return True
            return False

    async def delete(self, key: str) -> int:
        async with self._lock:
            existed = key in self._data and not self._expired(key)
            self._data.pop(key, None)
            return 1 if existed else 0

    async def exists(self, key: str) -> int:
        async with self._lock:
            if self._expired(key):
                self._data.pop(key, None)
                return 0
            return 1

    async def sadd(self, key: str, *members: str) -> int:
        async with self._lock:
            bucket = self._sets.setdefault(key, set())
            before = len(bucket)
            bucket.update(members)
            return len(bucket) - before

    async def smembers(self, key: str) -> set[str]:
        async with self._lock:
            return set(self._sets.get(key, set()))

    async def srem(self, key: str, *members: str) -> int:
        async with self._lock:
            bucket = self._sets.get(key)
            if not bucket:
                return 0
            removed = sum(1 for m in members if m in bucket)
            bucket.difference_update(members)
            return removed

    async def scan_keys(self, pattern: str) -> list[str]:
        import fnmatch

        async with self._lock:
            live = [k for k in self._data if not self._expired(k)]
        return [k for k in live if fnmatch.fnmatch(k, pattern)]


class RedisWrapper:
    """Wraps redis-py's async client, transparently falling back to memory."""

    def __init__(self, url: str) -> None:
        self._url = url
        self._client: aioredis.Redis | None = None
        self._local = _LocalStore()

    def _get_client(self) -> aioredis.Redis:
        if self._client is None:
            self._client = aioredis.from_url(
                self._url,
                decode_responses=True,
                socket_connect_timeout=1.5,
                socket_timeout=1.5,
            )
        return self._client

    async def get(self, key: str) -> str | None:
        try:
            return await self._get_client().get(key)
        except Exception:
            return await self._local.get(key)

    async def set(self, key: str, value: str, ex: int | None = None) -> bool:
        try:
            return bool(await self._get_client().set(key, value, ex=ex))
        except Exception:
            return await self._local.set(key, value, ex=ex)

    async def incr(self, key: str) -> int:
        try:
            return await self._get_client().incr(key)
        except Exception:
            return await self._local.incr(key)

    async def expire(self, key: str, seconds: int) -> bool:
        try:
            return bool(await self._get_client().expire(key, seconds))
        except Exception:
            return await self._local.expire(key, seconds)

    async def delete(self, key: str) -> int:
        try:
            return await self._get_client().delete(key)
        except Exception:
            return await self._local.delete(key)

    async def exists(self, key: str) -> int:
        try:
            return await self._get_client().exists(key)
        except Exception:
            return await self._local.exists(key)

    async def set_if_absent(self, key: str, value: str, ex: int | None = None) -> bool:
        """SET NX — returns True if the key was newly set (didn't previously exist)."""
        try:
            return bool(await self._get_client().set(key, value, ex=ex, nx=True))
        except Exception:
            if await self._local.exists(key):
                return False
            await self._local.set(key, value, ex=ex)
            return True

    async def sadd(self, key: str, *members: str) -> int:
        try:
            return int(await self._get_client().sadd(key, *members))
        except Exception:
            return await self._local.sadd(key, *members)

    async def smembers(self, key: str) -> set[str]:
        try:
            return set(await self._get_client().smembers(key))
        except Exception:
            return await self._local.smembers(key)

    async def srem(self, key: str, *members: str) -> int:
        try:
            return int(await self._get_client().srem(key, *members))
        except Exception:
            return await self._local.srem(key, *members)

    async def scan_keys(self, pattern: str) -> list[str]:
        """Return all keys matching a glob pattern (SCAN-based, cursor-safe)."""
        try:
            client = self._get_client()
            found: list[str] = []
            cursor = 0
            while True:
                cursor, batch = await client.scan(cursor=cursor, match=pattern, count=500)
                found.extend(batch)
                if cursor == 0:
                    break
            return found
        except Exception:
            return await self._local.scan_keys(pattern)

    async def ping(self) -> bool:
        """True only if a real Redis server answered (not the in-memory fallback)."""
        try:
            return bool(await self._get_client().ping())
        except Exception:
            return False

    async def info(self) -> dict:
        """Return the real Redis INFO dict, or {} when using the fallback."""
        try:
            return dict(await self._get_client().info())
        except Exception:
            return {}

    async def delete_many(self, keys: list[str]) -> int:
        if not keys:
            return 0
        try:
            return int(await self._get_client().delete(*keys))
        except Exception:
            removed = 0
            for k in keys:
                removed += await self._local.delete(k)
            return removed

    async def close(self) -> None:
        if self._client is not None:
            try:
                await self._client.aclose()
            except Exception:
                pass


@lru_cache
def get_redis() -> RedisWrapper:
    return RedisWrapper(settings.REDIS_URL)
