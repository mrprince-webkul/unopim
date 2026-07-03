"""Admin cache management: stats, clear (all / group / tags), warm."""

from __future__ import annotations

from fastapi import APIRouter, Depends

from app.api.deps import get_current_admin
from app.core import cache
from app.models.user import User
from app.schemas.cache import CacheActionResult, CacheStats, ClearGroupRequest, WarmResult

router = APIRouter()


@router.get("/stats", response_model=CacheStats)
async def cache_stats(_: User = Depends(get_current_admin)) -> CacheStats:
    return CacheStats(**await cache.cache_stats())


@router.post("/clear", response_model=CacheActionResult)
async def clear_all(_: User = Depends(get_current_admin)) -> CacheActionResult:
    cleared = await cache.clear_all()
    return CacheActionResult(cleared=cleared, detail=f"Cleared {cleared} cache entries")


@router.post("/clear-group", response_model=CacheActionResult)
async def clear_group(body: ClearGroupRequest, _: User = Depends(get_current_admin)) -> CacheActionResult:
    cleared = await cache.clear_group(body.group)
    return CacheActionResult(cleared=cleared, detail=f"Cleared group '{body.group}' ({cleared} entries)")


@router.post("/reset-stats", response_model=CacheActionResult)
async def reset_stats(_: User = Depends(get_current_admin)) -> CacheActionResult:
    await cache.reset_stats()
    return CacheActionResult(detail="Cache statistics reset")


@router.post("/warm", response_model=WarmResult)
async def warm(_: User = Depends(get_current_admin)) -> WarmResult:
    result = await cache.warm_all()
    return WarmResult(warmed=result["warmed"], count=result["count"])
