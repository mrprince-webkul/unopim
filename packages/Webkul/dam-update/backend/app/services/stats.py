"""Aggregate statistics for the admin dashboard and per-user profile stats.

Daily series are grouped in Python (not SQL `date_trunc`/`date()`) so the
same code works identically on PostgreSQL and SQLite.
"""

from __future__ import annotations

from collections import Counter
from datetime import datetime, timedelta, timezone

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.analytics import AnalyticsEvent
from app.models.announcement import Announcement, Bookmark, Like
from app.models.attachment import Attachment
from app.models.category import Category
from app.models.comment import Comment
from app.models.news import NewsArticle
from app.models.user import User
from app.utils import ensure_aware


def _daily_series(timestamps: list[datetime], days: int) -> list[dict]:
    """Zero-filled `[{"date": "YYYY-MM-DD", "count": n}, ...]` for the last `days` days."""
    today = datetime.now(timezone.utc).date()
    start = today - timedelta(days=days - 1)
    counts = Counter(ts.date().isoformat() for ts in timestamps if ts.date() >= start)
    series = []
    for offset in range(days):
        day = (start + timedelta(days=offset)).isoformat()
        series.append({"date": day, "count": counts.get(day, 0)})
    return series


async def get_admin_stats(db: AsyncSession) -> dict:
    users_total = (await db.execute(select(func.count()).select_from(User))).scalar_one()
    posts_total = (await db.execute(select(func.count()).select_from(Announcement))).scalar_one()
    comments_total = (await db.execute(select(func.count()).select_from(Comment))).scalar_one()
    news_total = (await db.execute(select(func.count()).select_from(NewsArticle))).scalar_one()

    now = datetime.now(timezone.utc)
    day_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    active_window = now - timedelta(days=30)
    # Active = signed in within the last 30 days (falls back to recent signups).
    active_users = (
        await db.execute(
            select(func.count()).select_from(User).where(
                (User.last_login_at >= active_window) | (User.created_at >= active_window)
            )
        )
    ).scalar_one()
    new_users_today = (
        await db.execute(
            select(func.count()).select_from(User).where(User.created_at >= day_start)
        )
    ).scalar_one()

    downloads_total = (
        await db.execute(select(func.coalesce(func.sum(Attachment.downloads_count), 0)))
    ).scalar_one()
    storage_bytes = (
        await db.execute(select(func.coalesce(func.sum(Attachment.size), 0)))
    ).scalar_one()
    files_count = (await db.execute(select(func.count()).select_from(Attachment))).scalar_one()

    likes_total = (await db.execute(select(func.count()).select_from(Like))).scalar_one()
    bookmarks_total = (await db.execute(select(func.count()).select_from(Bookmark))).scalar_one()
    views_total = (
        await db.execute(select(func.coalesce(func.sum(Announcement.views_count), 0)))
    ).scalar_one()

    since_30d = datetime.now(timezone.utc) - timedelta(days=30)
    user_created_rows = (
        await db.execute(select(User.created_at).where(User.created_at >= since_30d))
    ).all()
    post_created_rows = (
        await db.execute(
            select(Announcement.created_at).where(Announcement.created_at >= since_30d)
        )
    ).all()

    user_growth = _daily_series([ensure_aware(r[0]) for r in user_created_rows], 30)
    posts_per_day = _daily_series([ensure_aware(r[0]) for r in post_created_rows], 30)

    category_rows = (
        await db.execute(
            select(Category.name, func.count(Announcement.id))
            .select_from(Category)
            .outerjoin(Announcement, Announcement.category_id == Category.id)
            .group_by(Category.id, Category.name)
            .order_by(func.count(Announcement.id).desc())
        )
    ).all()
    popular_categories = [{"name": name, "count": count} for name, count in category_rows]

    return {
        "users": users_total,
        "active_users": active_users,
        "new_users_today": new_users_today,
        "posts": posts_total,
        "comments": comments_total,
        "news_count": news_total,
        "downloads": downloads_total,
        "storage_bytes": storage_bytes,
        "files_count": files_count,
        "user_growth": user_growth,
        "posts_per_day": posts_per_day,
        "popular_categories": popular_categories,
        "engagement": {
            "likes": likes_total,
            "comments": comments_total,
            "bookmarks": bookmarks_total,
            "views": views_total,
        },
    }


async def get_user_stats(db: AsyncSession, user_id: int) -> dict:
    ann_rows = (
        await db.execute(
            select(
                Announcement.id,
                Announcement.views_count,
                Announcement.likes_count,
                Announcement.bookmarks_count,
            ).where(Announcement.author_id == user_id)
        )
    ).all()
    announcement_ids = [row[0] for row in ann_rows]
    posts = len(announcement_ids)
    views = sum(row[1] for row in ann_rows)
    likes = sum(row[2] for row in ann_rows)
    bookmarks = sum(row[3] for row in ann_rows)

    downloads = 0
    if announcement_ids:
        downloads = (
            await db.execute(
                select(func.coalesce(func.sum(Attachment.downloads_count), 0)).where(
                    Attachment.announcement_id.in_(announcement_ids)
                )
            )
        ).scalar_one()

    now = datetime.now(timezone.utc)
    week_ago = now - timedelta(days=7)
    month_ago = now - timedelta(days=30)

    # Zero-filled defaults so charts always have a full axis, even with no posts.
    weekly_views = _daily_series([], 7)
    monthly_engagement = [
        {"date": p["date"], "views": 0, "likes": 0, "comments": 0} for p in _daily_series([], 30)
    ]
    recent_activity: list[dict] = []

    if announcement_ids:
        view_events = (
            await db.execute(
                select(AnalyticsEvent.created_at).where(
                    AnalyticsEvent.event_type == "view",
                    AnalyticsEvent.announcement_id.in_(announcement_ids),
                    AnalyticsEvent.created_at >= week_ago,
                )
            )
        ).all()
        weekly_series = _daily_series([ensure_aware(r[0]) for r in view_events], 7)
        weekly_views = [{"date": p["date"], "count": p["count"]} for p in weekly_series]

        month_view_events = (
            await db.execute(
                select(AnalyticsEvent.created_at).where(
                    AnalyticsEvent.event_type == "view",
                    AnalyticsEvent.announcement_id.in_(announcement_ids),
                    AnalyticsEvent.created_at >= month_ago,
                )
            )
        ).all()
        month_likes = (
            await db.execute(
                select(Like.created_at).where(
                    Like.announcement_id.in_(announcement_ids), Like.created_at >= month_ago
                )
            )
        ).all()
        month_comments = (
            await db.execute(
                select(Comment.created_at).where(
                    Comment.announcement_id.in_(announcement_ids), Comment.created_at >= month_ago
                )
            )
        ).all()

        views_by_day = Counter(ensure_aware(r[0]).date().isoformat() for r in month_view_events)
        likes_by_day = Counter(ensure_aware(r[0]).date().isoformat() for r in month_likes)
        comments_by_day = Counter(ensure_aware(r[0]).date().isoformat() for r in month_comments)

        start = now.date() - timedelta(days=29)
        for offset in range(30):
            day = (start + timedelta(days=offset)).isoformat()
            monthly_engagement.append(
                {
                    "date": day,
                    "views": views_by_day.get(day, 0),
                    "likes": likes_by_day.get(day, 0),
                    "comments": comments_by_day.get(day, 0),
                }
            )

        recent_activity = await _recent_activity(db, announcement_ids)

    return {
        "posts": posts,
        "views": views,
        "likes": likes,
        "bookmarks": bookmarks,
        "downloads": downloads,
        "weekly_views": weekly_views,
        "monthly_engagement": monthly_engagement,
        "recent_activity": recent_activity,
    }


async def _recent_activity(db: AsyncSession, announcement_ids: list[int]) -> list[dict]:
    """Latest 10 likes/comments received on the given announcements."""
    like_rows = (
        await db.execute(
            select(Like.created_at, User.username, Announcement.title)
            .join(User, Like.user_id == User.id)
            .join(Announcement, Like.announcement_id == Announcement.id)
            .where(Like.announcement_id.in_(announcement_ids))
            .order_by(Like.created_at.desc())
            .limit(10)
        )
    ).all()
    comment_rows = (
        await db.execute(
            select(Comment.created_at, User.username, Announcement.title)
            .join(User, Comment.author_id == User.id)
            .join(Announcement, Comment.announcement_id == Announcement.id)
            .where(Comment.announcement_id.in_(announcement_ids))
            .order_by(Comment.created_at.desc())
            .limit(10)
        )
    ).all()

    activity = [
        {
            "action": "like",
            "detail": f'{username} liked "{title}"',
            "created_at": ensure_aware(created_at),
        }
        for created_at, username, title in like_rows
    ] + [
        {
            "action": "comment",
            "detail": f'{username} commented on "{title}"',
            "created_at": ensure_aware(created_at),
        }
        for created_at, username, title in comment_rows
    ]
    activity.sort(key=lambda item: item["created_at"], reverse=True)
    return activity[:10]
