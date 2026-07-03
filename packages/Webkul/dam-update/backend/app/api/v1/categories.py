"""Public category listing."""

from __future__ import annotations

from fastapi import APIRouter

from app.schemas.announcement import CategoryRead
from app.services.cache_loaders import categories_list

router = APIRouter()


@router.get("", response_model=list[CategoryRead])
async def list_categories() -> list[CategoryRead]:
    # Served from the Redis cache layer (tag: categories); invalidated on
    # category create/update/delete in the admin API. Hidden categories are
    # filtered out of the public listing (kept in cache for the admin view).
    data = await categories_list()
    return [CategoryRead(**row) for row in data if not row.get("is_hidden")]
