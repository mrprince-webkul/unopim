"""Admin: system health snapshot (DB, Redis, storage, AI, queue)."""

from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_admin
from app.core.database import get_db
from app.models.user import User
from app.services import health as health_service

router = APIRouter()


@router.get("/health")
async def admin_system_health(
    db: AsyncSession = Depends(get_db), _: User = Depends(get_current_admin)
) -> dict:
    return await health_service.system_health(db)
