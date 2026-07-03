"""Admin: background jobs — registry, run history, run/retry, worker health."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_admin
from app.core.database import get_db
from app.models.job_run import JobRun
from app.models.user import User
from app.services import jobs as jobs_service

router = APIRouter()


@router.get("")
async def list_jobs(_: User = Depends(get_current_admin)) -> dict:
    """Registered jobs plus the live scheduler state (next run times)."""
    from app.scheduler import scheduler

    next_runs: dict[str, str | None] = {}
    running = scheduler.running
    if running:
        for job in scheduler.get_jobs():
            next_runs[job.id] = job.next_run_time.isoformat() if job.next_run_time else None

    jobs = [
        {
            "name": name,
            "label": meta["label"],
            "description": meta["description"],
            "next_run": next_runs.get(name),
        }
        for name, meta in jobs_service.JOBS.items()
    ]
    return {"worker_running": running, "scheduled": len(next_runs), "jobs": jobs}


@router.get("/runs")
async def list_runs(
    db: AsyncSession = Depends(get_db), _: User = Depends(get_current_admin)
) -> list[dict]:
    runs = await jobs_service.recent_runs(db, limit=50)
    return [
        {
            "id": r.id,
            "name": r.name,
            "status": r.status,
            "detail": r.detail,
            "items": r.items,
            "duration_ms": r.duration_ms,
            "trigger": r.trigger,
            "created_at": r.created_at,
        }
        for r in runs
    ]


@router.post("/run/{name}")
async def run_now(
    name: str, db: AsyncSession = Depends(get_db), _: User = Depends(get_current_admin)
) -> dict:
    if name not in jobs_service.JOBS:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Unknown job")
    return await jobs_service.run_job(name, trigger="manual", db=db)


@router.post("/runs/{run_id}/retry")
async def retry_run(
    run_id: int, db: AsyncSession = Depends(get_db), _: User = Depends(get_current_admin)
) -> dict:
    run = (await db.execute(select(JobRun).where(JobRun.id == run_id))).scalar_one_or_none()
    if run is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Run not found")
    if run.name not in jobs_service.JOBS:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Job no longer exists")
    return await jobs_service.run_job(run.name, trigger="retry", db=db)
