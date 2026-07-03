"""Full-text search across announcements, news, and users.

On PostgreSQL, announcement search uses `tsvector`/`plainto_tsquery`
(`search_vector`, kept up to date by a DB trigger) plus author username and
tag matches. On other dialects (SQLite, used in tests) it falls back to a
simple ILIKE scan across title/description/content.
"""

from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import dialect_name, fetch_page
from app.models.announcement import Announcement, Tag, announcement_tags
from app.models.user import Follow, User
from app.schemas.user import PublicProfile


async def search_announcements(
    db: AsyncSession, q: str, page: int, size: int
) -> tuple[list[Announcement], int]:
    now = datetime.now(timezone.utc)
    filters = [Announcement.status == "published", Announcement.publish_date <= now]

    if not q:
        stmt = select(Announcement).where(*filters).order_by(Announcement.publish_date.desc())
        return await fetch_page(db, stmt, page, size)

    pattern = f"%{q}%"
    if dialect_name(db) == "postgresql":
        ts_query = func.plainto_tsquery("english", q)
        author_ids = select(User.id).where(User.username.ilike(pattern))
        tag_ann_ids = (
            select(announcement_tags.c.announcement_id)
            .join(Tag, Tag.id == announcement_tags.c.tag_id)
            .where(Tag.name.ilike(pattern))
        )
        rank = func.ts_rank(Announcement.search_vector, ts_query)
        stmt = (
            select(Announcement)
            .where(
                *filters,
                or_(
                    Announcement.search_vector.op("@@")(ts_query),
                    Announcement.author_id.in_(author_ids),
                    Announcement.id.in_(tag_ann_ids),
                ),
            )
            .order_by(rank.desc())
        )
    else:
        stmt = (
            select(Announcement)
            .where(
                *filters,
                or_(
                    Announcement.title.ilike(pattern),
                    Announcement.description.ilike(pattern),
                    Announcement.content.ilike(pattern),
                ),
            )
            .order_by(Announcement.publish_date.desc())
        )
    return await fetch_page(db, stmt, page, size)


async def search_news(db: AsyncSession, q: str, page: int, size: int):
    from app.models.news import NewsArticle

    stmt = select(NewsArticle)
    if q:
        pattern = f"%{q}%"
        stmt = stmt.where(or_(NewsArticle.title.ilike(pattern), NewsArticle.summary.ilike(pattern)))
    stmt = stmt.order_by(NewsArticle.published_at.desc())
    return await fetch_page(db, stmt, page, size)


async def search_users(
    db: AsyncSession, q: str, page: int, size: int, viewer_id: int | None = None
) -> tuple[list[PublicProfile], int]:
    stmt = select(User)
    if q:
        pattern = f"%{q}%"
        stmt = stmt.where(
            or_(
                User.username.ilike(pattern),
                User.full_name.ilike(pattern),
                User.bio.ilike(pattern),
            )
        )
    stmt = stmt.order_by(User.username.asc())
    users, total = await fetch_page(db, stmt, page, size)
    profiles = [await build_public_profile(db, user, viewer_id) for user in users]
    return profiles, total


async def build_public_profile(
    db: AsyncSession, user: User, viewer_id: int | None = None
) -> PublicProfile:
    """Build a PublicProfile for `user`, resolving counts + is_following for `viewer_id`."""
    followers_count = (
        await db.execute(
            select(func.count()).select_from(Follow).where(Follow.following_id == user.id)
        )
    ).scalar_one()
    following_count = (
        await db.execute(
            select(func.count()).select_from(Follow).where(Follow.follower_id == user.id)
        )
    ).scalar_one()
    posts_count = (
        await db.execute(
            select(func.count())
            .select_from(Announcement)
            .where(Announcement.author_id == user.id, Announcement.status == "published")
        )
    ).scalar_one()
    is_following = False
    if viewer_id is not None:
        exists_result = await db.execute(
            select(func.count())
            .select_from(Follow)
            .where(Follow.follower_id == viewer_id, Follow.following_id == user.id)
        )
        is_following = exists_result.scalar_one() > 0

    return PublicProfile(
        **{
            "id": user.id,
            "email": user.email,
            "username": user.username,
            "full_name": user.full_name,
            "avatar_url": user.avatar_url,
            "bio": user.bio,
            "github_url": user.github_url,
            "linkedin_url": user.linkedin_url,
            "website_url": user.website_url,
            "role": user.role,
            "is_verified": user.is_verified,
            "is_banned": user.is_banned,
            "created_at": user.created_at,
            "followers_count": followers_count,
            "following_count": following_count,
            "posts_count": posts_count,
            "is_following": is_following,
        }
    )
