"""Cached loaders for hot read paths, shared by endpoints and cache warming.

Each loader opens its OWN DB session (via AsyncSessionLocal) rather than
capturing a request-scoped session, so stale-while-revalidate background
refreshes don't touch a session that's already been closed.
"""

from __future__ import annotations

from sqlalchemy import func, select

from app.core.cache import cached
from app.core.database import AsyncSessionLocal
from app.models.announcement import Announcement
from app.models.category import Category
from app.models.news import NewsArticle


async def _load_categories() -> list[dict]:
    async with AsyncSessionLocal() as db:
        rows = (
            await db.execute(
                select(Category, func.count(Announcement.id))
                .outerjoin(
                    Announcement,
                    (Announcement.category_id == Category.id) & (Announcement.status == "published"),
                )
                .group_by(Category.id)
                .order_by(Category.position.asc(), Category.name.asc())
            )
        ).all()
        return [
            {
                "id": category.id,
                "name": category.name,
                "slug": category.slug,
                "description": category.description,
                "icon": category.icon,
                "color": category.color,
                "position": category.position,
                "is_hidden": category.is_hidden,
                "is_featured": category.is_featured,
                "posts_count": count,
            }
            for category, count in rows
        ]


async def categories_list() -> list[dict]:
    """Cached category list with post counts (tag: categories)."""
    return await cached("cache:categories:list", _load_categories, tags=("categories",))


async def _load_news_latest() -> list[dict]:
    async with AsyncSessionLocal() as db:
        rows = (
            await db.execute(
                select(NewsArticle).order_by(NewsArticle.published_at.desc()).limit(20)
            )
        ).scalars().all()
        return [
            {
                "id": n.id,
                "title": n.title,
                "summary": n.summary,
                "category": n.category,
                "source_name": n.source_name,
                "source_url": n.source_url,
                "image_url": n.image_url,
                "reading_time": n.reading_time,
            }
            for n in rows
        ]


async def news_latest() -> list[dict]:
    """Cached latest-news list (tag: news)."""
    return await cached("cache:news:latest", _load_news_latest, tags=("news",))


async def warm(db=None) -> list[str]:
    """Preload popular pages. Returns the list of warmed cache identifiers."""
    warmed: list[str] = []
    for label, loader in (("categories:list", categories_list), ("news:latest", news_latest)):
        try:
            await loader()
            warmed.append(label)
        except Exception:  # noqa: BLE001
            pass
    return warmed
