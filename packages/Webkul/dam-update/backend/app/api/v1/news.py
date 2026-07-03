"""Dev news listing (populated by the scheduled fetch job)."""

from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import distinct, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import PageParams
from app.core.database import fetch_page, get_db
from app.models.news import NewsArticle
from app.schemas.common import Paginated, paginate
from app.schemas.news import NewsArticleRead

router = APIRouter()


def news_query(category: str | None = None, q: str | None = None):
    stmt = select(NewsArticle)
    if category:
        stmt = stmt.where(NewsArticle.category == category)
    if q:
        pattern = f"%{q}%"
        stmt = stmt.where(or_(NewsArticle.title.ilike(pattern), NewsArticle.summary.ilike(pattern)))
    return stmt.order_by(NewsArticle.published_at.desc())


@router.get("", response_model=Paginated[NewsArticleRead])
async def list_news(
    page_params: PageParams = Depends(),
    category: str | None = None,
    q: str | None = None,
    db: AsyncSession = Depends(get_db),
) -> dict:
    stmt = news_query(category, q)
    items, total = await fetch_page(db, stmt, page_params.page, page_params.size)
    return paginate(items, total, page_params.page, page_params.size)


@router.get("/categories", response_model=list[str])
async def list_news_categories(db: AsyncSession = Depends(get_db)) -> list[str]:
    result = await db.execute(
        select(distinct(NewsArticle.category)).order_by(NewsArticle.category.asc())
    )
    return [row[0] for row in result.all()]
