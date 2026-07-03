"""APScheduler wiring.

Every scheduled trigger routes through `jobs.run_job(...)`, so scheduled and
manual runs share one recorded history. The news-fetch cadence is admin-driven
via the ``NEWS_FETCH_INTERVAL`` site setting (hourly / 6h / 12h / daily).
"""

from __future__ import annotations

import logging

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.interval import IntervalTrigger

from app.core.config import settings
from app.core.database import AsyncSessionLocal
from app.services import jobs, settings_service

logger = logging.getLogger("devannounce.scheduler")

scheduler = AsyncIOScheduler(timezone="UTC")


async def _run(name: str) -> None:
    await jobs.run_job(name, trigger="scheduled")


def _news_trigger(interval: str):
    interval = (interval or "daily").lower()
    if interval == "hourly":
        return IntervalTrigger(hours=1)
    if interval == "6h":
        return IntervalTrigger(hours=6)
    if interval == "12h":
        return IntervalTrigger(hours=12)
    return CronTrigger(hour=settings.NEWS_FETCH_HOUR_UTC, minute=settings.NEWS_FETCH_MINUTE_UTC)


async def start_scheduler() -> None:
    if scheduler.running:
        return

    async with AsyncSessionLocal() as db:
        interval = await settings_service.get_value(db, "NEWS_FETCH_INTERVAL", "daily")

    scheduler.add_job(
        _run, args=["news_fetch"], trigger=_news_trigger(interval),
        id="news_fetch", replace_existing=True, misfire_grace_time=3600,
    )
    scheduler.add_job(
        _run, args=["publish_scheduled"], trigger=IntervalTrigger(minutes=5),
        id="publish_scheduled", replace_existing=True, misfire_grace_time=300,
    )
    scheduler.add_job(
        _run, args=["cache_warm"], trigger=IntervalTrigger(minutes=15),
        id="cache_warm", replace_existing=True, misfire_grace_time=300,
    )
    scheduler.add_job(
        _run, args=["cleanup"], trigger=CronTrigger(hour=3, minute=0),
        id="cleanup", replace_existing=True, misfire_grace_time=3600,
    )
    scheduler.start()
    logger.info("Scheduler started (news interval=%s).", interval)


def reschedule_news(interval: str) -> None:
    """Apply a new news-fetch cadence at runtime (called when the setting changes)."""
    if scheduler.running:
        scheduler.reschedule_job("news_fetch", trigger=_news_trigger(interval))
        logger.info("Rescheduled news fetch to interval=%s.", interval)


def stop_scheduler() -> None:
    if scheduler.running:
        scheduler.shutdown(wait=False)
        logger.info("Scheduler stopped.")
