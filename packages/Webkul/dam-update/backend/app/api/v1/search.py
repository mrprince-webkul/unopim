"""Unified search across announcements, news, and users."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user_optional
from app.api.v1.announcements import build_announcement_list_response
from app.core.database import get_db
from app.models.user import User
from app.schemas.common import paginate
from app.schemas.news import NewsArticleRead
from app.services import search as search_service

router = APIRouter()


def _empty_page(page: int, size: int) -> dict:
    return paginate([], 0, page, size)


@router.get("")
async def search(
    q: str = Query(""),
    type: str = Query("all", pattern="^(all|announcements|news|users)$"),  # noqa: A002
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
    viewer: User | None = Depends(get_current_user_optional),
) -> dict:
    announcements_page = _empty_page(page, size)
    news_page = _empty_page(page, size)
    users_page = _empty_page(page, size)

    if type in ("all", "announcements"):
        items, total = await search_service.search_announcements(db, q, page, size)
        announcements_page = await build_announcement_list_response(
            db, items, total, page, size, viewer.id if viewer else None
        )

    if type in ("all", "news"):
        items, total = await search_service.search_news(db, q, page, size)
        news_page = paginate([NewsArticleRead.model_validate(i) for i in items], total, page, size)

    if type in ("all", "users"):
        profiles, total = await search_service.search_users(
            db, q, page, size, viewer.id if viewer else None
        )
        users_page = paginate(profiles, total, page, size)

    return {"announcements": announcements_page, "news": news_page, "users": users_page}
