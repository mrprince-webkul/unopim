"""Public, non-secret settings — branding, theme, and maintenance flags.

Consumed by the frontend (server + client) so branding/theme changes made in
the admin panel take effect immediately, with no redeploy. Only whitelisted,
non-secret keys are ever exposed here.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.services import settings_service

router = APIRouter()

# Only keys with these prefixes (and never `is_secret`) are exposed publicly.
_PUBLIC_PREFIXES = ("BRAND_", "THEME_", "CONFIG_TIMEZONE", "CONFIG_DATE_FORMAT", "CONFIG_MAINTENANCE")


@router.get("/public")
async def public_settings(db: AsyncSession = Depends(get_db)) -> dict:
    rows = await settings_service.list_settings(db)
    out: dict[str, str] = {}
    for row in rows:
        if row.is_secret:
            continue
        if any(row.key.startswith(p) for p in _PUBLIC_PREFIXES):
            out[row.key] = row.value
    return out
