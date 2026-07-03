"""System health probes for the admin dashboard: DB, Redis, storage, AI, queue."""

from __future__ import annotations

import logging

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.redis import get_redis
from app.services import ai_providers

logger = logging.getLogger("devannounce.health")


async def check_database(db: AsyncSession) -> dict:
    try:
        await db.execute(text("SELECT 1"))
        return {"status": "ok", "detail": "Connected"}
    except Exception as exc:  # noqa: BLE001
        return {"status": "down", "detail": str(exc)[:160]}


async def check_redis() -> dict:
    redis = get_redis()
    if await redis.ping():
        info = await redis.info()
        used = info.get("used_memory_human", "?")
        clients = info.get("connected_clients", "?")
        return {"status": "ok", "detail": f"{used} used · {clients} clients"}
    # Wrapper degrades to an in-memory store — functional but not real Redis.
    return {"status": "degraded", "detail": "In-memory fallback (Redis unreachable)"}


async def check_storage() -> dict:
    from app.services.storage import storage_service

    try:
        import asyncio

        exists = await asyncio.to_thread(
            storage_service._client.bucket_exists, storage_service.bucket
        )
        return {
            "status": "ok" if exists else "degraded",
            "detail": f"Bucket '{storage_service.bucket}'" + ("" if exists else " missing"),
        }
    except Exception as exc:  # noqa: BLE001
        return {"status": "down", "detail": str(exc)[:160]}


async def check_ai(db: AsyncSession) -> dict:
    provider = await ai_providers.get_active_provider(db)
    if provider is None:
        return {"status": "idle", "detail": "No active AI provider", "provider": None}
    ready = bool(provider.api_key) or provider.provider_type == "openai_compatible"
    return {
        "status": "ok" if ready else "needs_key",
        "detail": f"{provider.name} · {provider.model}",
        "provider": provider.name,
    }


async def check_queue() -> dict:
    try:
        from app.scheduler import scheduler

        if scheduler.running:
            jobs = scheduler.get_jobs()
            return {"status": "ok", "detail": f"{len(jobs)} scheduled job(s)", "jobs": len(jobs)}
        return {"status": "stopped", "detail": "Scheduler not running", "jobs": 0}
    except Exception as exc:  # noqa: BLE001
        return {"status": "down", "detail": str(exc)[:160], "jobs": 0}


async def system_health(db: AsyncSession) -> dict:
    return {
        "database": await check_database(db),
        "redis": await check_redis(),
        "storage": await check_storage(),
        "ai": await check_ai(db),
        "queue": await check_queue(),
    }
