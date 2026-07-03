"""Background job runner + history.

A small registry of named jobs. `run_job` executes one, timing it and writing a
`JobRun` row (running → success/failed) so the admin can monitor queue health,
inspect history, and retry failures. The scheduler and the admin API both call
`run_job`, so every execution — scheduled or manual — is recorded identically.
"""

from __future__ import annotations

import logging
import time
from datetime import datetime, timedelta, timezone

from sqlalchemy import delete, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core import cache
from app.core.database import AsyncSessionLocal
from app.models.announcement import Announcement
from app.models.job_run import JobRun

logger = logging.getLogger("devannounce.jobs")


# --- Individual jobs: each returns (items_processed, human_detail) ---------


async def _job_news_fetch(db: AsyncSession) -> tuple[int, str]:
    from app.services.news_fetcher import fetch_news

    imported = await fetch_news(db)
    return imported, f"Imported {imported} new article(s)"


async def _job_cache_warm(db: AsyncSession) -> tuple[int, str]:
    result = await cache.warm_all()
    return result["count"], f"Warmed {result['count']} cache group(s): {', '.join(result['warmed']) or 'none'}"


async def _job_publish_scheduled(db: AsyncSession) -> tuple[int, str]:
    """Promote scheduled announcements whose publish_date has arrived."""
    now = datetime.now(timezone.utc)
    result = await db.execute(
        update(Announcement)
        .where(
            Announcement.status == "scheduled",
            Announcement.publish_date <= now,
            Announcement.deleted_at.is_(None),
        )
        .values(status="published")
    )
    await db.commit()
    count = result.rowcount or 0
    if count:
        await cache.invalidate_tags("home", "announcements", "trending")
    return count, f"Published {count} scheduled announcement(s)"


async def _job_cleanup(db: AsyncSession) -> tuple[int, str]:
    """Purge long-deleted announcements and trim old job history."""
    cutoff = datetime.now(timezone.utc) - timedelta(days=30)
    purged = (
        await db.execute(
            delete(Announcement).where(
                Announcement.deleted_at.is_not(None), Announcement.deleted_at < cutoff
            )
        )
    ).rowcount or 0
    # keep only the newest 500 job runs
    old_ids = (
        await db.execute(select(JobRun.id).order_by(JobRun.created_at.desc()).offset(500))
    ).scalars().all()
    if old_ids:
        await db.execute(delete(JobRun).where(JobRun.id.in_(old_ids)))
    await db.commit()
    return purged, f"Purged {purged} trashed post(s), trimmed {len(old_ids)} old job record(s)"


async def _job_analytics(db: AsyncSession) -> tuple[int, str]:
    """Recompute and warm the admin stats cache."""
    from app.services import cache_loaders

    warmed = await cache_loaders.warm(db)
    return len(warmed), "Aggregated analytics & refreshed stats cache"


JOBS: dict[str, dict] = {
    "news_fetch": {"fn": _job_news_fetch, "label": "AI News Fetch", "description": "Collect, summarize & import fresh developer news."},
    "cache_warm": {"fn": _job_cache_warm, "label": "Cache Warming", "description": "Preload popular pages into Redis."},
    "publish_scheduled": {"fn": _job_publish_scheduled, "label": "Scheduled Publishing", "description": "Publish announcements whose schedule time has arrived."},
    "cleanup": {"fn": _job_cleanup, "label": "Cleanup", "description": "Purge trashed content & trim job history."},
    "analytics": {"fn": _job_analytics, "label": "Analytics Aggregation", "description": "Recompute dashboard analytics."},
}


async def run_job(name: str, trigger: str = "manual", db: AsyncSession | None = None) -> dict:
    """Run a registered job, recording a JobRun. Owns its own session if none given."""
    if name not in JOBS:
        raise KeyError(f"Unknown job '{name}'")

    own_session = db is None
    session = db or AsyncSessionLocal()
    started = time.monotonic()
    run = JobRun(name=name, status="running", trigger=trigger)
    try:
        session.add(run)
        await session.commit()
        await session.refresh(run)
    except Exception:  # noqa: BLE001
        pass

    status, detail, items = "success", "", 0
    try:
        items, detail = await JOBS[name]["fn"](session)
    except Exception as exc:  # noqa: BLE001
        status, detail = "failed", str(exc)[:400]
        logger.exception("Job '%s' failed", name)

    duration_ms = int((time.monotonic() - started) * 1000)
    try:
        run.status = status
        run.detail = detail
        run.items = items
        run.duration_ms = duration_ms
        await session.commit()
    except Exception:  # noqa: BLE001
        await session.rollback()
    finally:
        if own_session:
            await session.close()

    return {"name": name, "status": status, "detail": detail, "items": items, "duration_ms": duration_ms}


async def recent_runs(db: AsyncSession, limit: int = 50) -> list[JobRun]:
    result = await db.execute(select(JobRun).order_by(JobRun.created_at.desc()).limit(limit))
    return list(result.scalars().all())
