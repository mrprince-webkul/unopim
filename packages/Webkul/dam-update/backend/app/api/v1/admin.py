"""Admin-only endpoints: moderation, stats, settings, activity log.

Every mutation here writes an `ActivityLog` row for audit purposes.
"""

from __future__ import annotations

import secrets
from collections.abc import Awaitable, Callable
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import PageParams, get_current_admin
from app.api.v1.announcements import (
    build_announcement_read,
    build_comment_read,
    get_announcement_or_404,
)
from app.api.v1.news import news_query
from app.core import cache
from app.core.database import fetch_page, get_db
from app.core.security import hash_password
from app.models.activity import ActivityLog
from app.models.announcement import Announcement
from app.models.category import Category
from app.models.comment import Comment
from app.models.login_history import LoginHistory
from app.models.news import NewsArticle
from app.models.user import User
from app.schemas.admin import (
    ActivityLogRead,
    AdminStats,
    CategoryCreate,
    CategoryReorder,
    CategoryUpdate,
    NewsFetchResult,
    SiteSettingRead,
    SiteSettingsUpdate,
)
from app.schemas.announcement import AnnouncementRead, CategoryRead
from app.schemas.comment import CommentRead
from app.schemas.common import Paginated, paginate
from app.schemas.news import NewsArticleRead
from app.schemas.user import UserRead
from app.services import settings_service
from app.services import stats as stats_service
from app.services.news_fetcher import fetch_news
from app.utils import unique_slugify

router = APIRouter()


async def _get_user_or_404(db: AsyncSession, user_id: int) -> User:
    user = (await db.execute(select(User).where(User.id == user_id))).scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return user


async def _log(db: AsyncSession, admin: User, action: str, detail: str) -> None:
    db.add(ActivityLog(user_id=admin.id, action=action, detail=detail))
    await db.commit()


def _category_slug_exists_checker(
    db: AsyncSession, exclude_id: int | None = None
) -> Callable[[str], Awaitable[bool]]:
    async def _exists(candidate: str) -> bool:
        stmt = select(Category.id).where(Category.slug == candidate)
        if exclude_id is not None:
            stmt = stmt.where(Category.id != exclude_id)
        return (await db.execute(stmt)).scalar_one_or_none() is not None

    return _exists


async def _get_comment_or_404(db: AsyncSession, comment_id: int) -> Comment:
    comment = (
        await db.execute(select(Comment).where(Comment.id == comment_id))
    ).scalar_one_or_none()
    if comment is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Comment not found")
    return comment


# --------------------------------------------------------------------------
# Stats
# --------------------------------------------------------------------------


@router.get("/stats", response_model=AdminStats)
async def get_admin_stats(
    db: AsyncSession = Depends(get_db), admin: User = Depends(get_current_admin)
) -> dict:
    return await stats_service.get_admin_stats(db)


# --------------------------------------------------------------------------
# Users
# --------------------------------------------------------------------------


@router.get("/users", response_model=Paginated[UserRead])
async def list_users(
    q: str | None = None,
    page_params: PageParams = Depends(),
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin),
) -> dict:
    stmt = select(User)
    if q:
        pattern = f"%{q}%"
        stmt = stmt.where(
            or_(
                User.username.ilike(pattern),
                User.email.ilike(pattern),
                User.full_name.ilike(pattern),
            )
        )
    stmt = stmt.order_by(User.created_at.desc())
    items, total = await fetch_page(db, stmt, page_params.page, page_params.size)
    return paginate(items, total, page_params.page, page_params.size)


@router.post("/users/{user_id}/ban", response_model=UserRead)
async def ban_user(
    user_id: int, db: AsyncSession = Depends(get_db), admin: User = Depends(get_current_admin)
) -> User:
    target = (await db.execute(select(User).where(User.id == user_id))).scalar_one_or_none()
    if target is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    if target.role == "admin":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot ban an admin")
    target.is_banned = True
    await db.commit()
    await db.refresh(target)
    await _log(db, admin, "ban_user", f"Banned user '{target.username}'")
    return target


@router.post("/users/{user_id}/unban", response_model=UserRead)
async def unban_user(
    user_id: int, db: AsyncSession = Depends(get_db), admin: User = Depends(get_current_admin)
) -> User:
    target = (await db.execute(select(User).where(User.id == user_id))).scalar_one_or_none()
    if target is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    target.is_banned = False
    await db.commit()
    await db.refresh(target)
    await _log(db, admin, "unban_user", f"Unbanned user '{target.username}'")
    return target


# --------------------------------------------------------------------------
# Announcements
# --------------------------------------------------------------------------


async def _set_announcement_flag(
    db: AsyncSession, admin: User, announcement_id: int, field: str, value: bool, action: str
) -> AnnouncementRead:
    announcement = await get_announcement_or_404(db, announcement_id)
    setattr(announcement, field, value)
    await db.commit()
    await db.refresh(announcement)
    await _log(db, admin, action, f"{action.replace('_', ' ').title()}: '{announcement.title}'")
    return build_announcement_read(announcement)


@router.post("/announcements/{announcement_id}/pin", response_model=AnnouncementRead)
async def pin_announcement(
    announcement_id: int,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin),
) -> AnnouncementRead:
    return await _set_announcement_flag(
        db, admin, announcement_id, "is_pinned", True, "pin_announcement"
    )


@router.post("/announcements/{announcement_id}/unpin", response_model=AnnouncementRead)
async def unpin_announcement(
    announcement_id: int,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin),
) -> AnnouncementRead:
    return await _set_announcement_flag(
        db, admin, announcement_id, "is_pinned", False, "unpin_announcement"
    )


@router.post("/announcements/{announcement_id}/feature", response_model=AnnouncementRead)
async def feature_announcement(
    announcement_id: int,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin),
) -> AnnouncementRead:
    return await _set_announcement_flag(
        db, admin, announcement_id, "is_featured", True, "feature_announcement"
    )


@router.post("/announcements/{announcement_id}/unfeature", response_model=AnnouncementRead)
async def unfeature_announcement(
    announcement_id: int,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin),
) -> AnnouncementRead:
    return await _set_announcement_flag(
        db, admin, announcement_id, "is_featured", False, "unfeature_announcement"
    )


# --------------------------------------------------------------------------
# Comments (moderation)
# --------------------------------------------------------------------------


@router.get("/comments", response_model=Paginated[CommentRead])
async def list_all_comments(
    hidden: bool | None = None,
    page_params: PageParams = Depends(),
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin),
) -> dict:
    stmt = select(Comment)
    if hidden is not None:
        stmt = stmt.where(Comment.is_hidden == hidden)
    stmt = stmt.order_by(Comment.created_at.desc())
    items, total = await fetch_page(db, stmt, page_params.page, page_params.size)
    return paginate(
        [build_comment_read(c, []) for c in items], total, page_params.page, page_params.size
    )


@router.post("/comments/{comment_id}/hide", response_model=CommentRead)
async def hide_comment(
    comment_id: int, db: AsyncSession = Depends(get_db), admin: User = Depends(get_current_admin)
) -> CommentRead:
    comment = await _get_comment_or_404(db, comment_id)
    comment.is_hidden = True
    await db.commit()
    await db.refresh(comment)
    await _log(db, admin, "hide_comment", f"Hid comment #{comment.id}")
    return build_comment_read(comment, [])


@router.post("/comments/{comment_id}/show", response_model=CommentRead)
async def show_comment(
    comment_id: int, db: AsyncSession = Depends(get_db), admin: User = Depends(get_current_admin)
) -> CommentRead:
    comment = await _get_comment_or_404(db, comment_id)
    comment.is_hidden = False
    await db.commit()
    await db.refresh(comment)
    await _log(db, admin, "show_comment", f"Unhid comment #{comment.id}")
    return build_comment_read(comment, [])


# --------------------------------------------------------------------------
# News
# --------------------------------------------------------------------------


@router.get("/news", response_model=Paginated[NewsArticleRead])
async def list_all_news(
    category: str | None = None,
    q: str | None = None,
    page_params: PageParams = Depends(),
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin),
) -> dict:
    stmt = news_query(category, q)
    items, total = await fetch_page(db, stmt, page_params.page, page_params.size)
    return paginate(items, total, page_params.page, page_params.size)


@router.post("/news/fetch", response_model=NewsFetchResult)
async def trigger_news_fetch(
    db: AsyncSession = Depends(get_db), admin: User = Depends(get_current_admin)
) -> NewsFetchResult:
    imported = await fetch_news(db)
    await _log(
        db, admin, "fetch_news", f"Manually triggered news fetch: {imported} article(s) imported"
    )
    message = f"Imported {imported} new article(s)." if imported else "No new articles found."
    return NewsFetchResult(imported=imported, message=message)


@router.delete("/news/{news_id}", status_code=status.HTTP_204_NO_CONTENT, response_model=None)
async def delete_news(
    news_id: int, db: AsyncSession = Depends(get_db), admin: User = Depends(get_current_admin)
) -> None:
    article = (
        await db.execute(select(NewsArticle).where(NewsArticle.id == news_id))
    ).scalar_one_or_none()
    if article is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="News article not found")
    title = article.title
    await db.delete(article)
    await db.commit()
    await _log(db, admin, "delete_news", f"Deleted news article '{title}'")


# --------------------------------------------------------------------------
# Categories
# --------------------------------------------------------------------------


@router.get("/categories", response_model=list[CategoryRead])
async def admin_list_categories(
    db: AsyncSession = Depends(get_db), admin: User = Depends(get_current_admin)
) -> list[CategoryRead]:
    """All categories (including hidden), ordered by position, with post counts."""
    rows = (
        await db.execute(
            select(Category, func.count(Announcement.id))
            .outerjoin(
                Announcement,
                (Announcement.category_id == Category.id)
                & (Announcement.status == "published")
                & (Announcement.deleted_at.is_(None)),
            )
            .group_by(Category.id)
            .order_by(Category.position.asc(), Category.name.asc())
        )
    ).all()
    return [
        CategoryRead(
            id=c.id, name=c.name, slug=c.slug, description=c.description, icon=c.icon,
            color=c.color, position=c.position, is_hidden=c.is_hidden,
            is_featured=c.is_featured, posts_count=count,
        )
        for c, count in rows
    ]


@router.post("/categories/reorder", response_model=list[CategoryRead])
async def reorder_categories(
    payload: CategoryReorder,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin),
) -> list[CategoryRead]:
    rows = {c.id: c for c in (await db.execute(select(Category))).scalars().all()}
    for position, cat_id in enumerate(payload.order):
        if cat_id in rows:
            rows[cat_id].position = position
    await db.commit()
    await cache.invalidate_tags("categories")
    await _log(db, admin, "reorder_categories", f"Reordered {len(payload.order)} categories")
    return await admin_list_categories(db, admin)


@router.post("/categories", response_model=CategoryRead, status_code=status.HTTP_201_CREATED)
async def create_category(
    payload: CategoryCreate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin),
) -> CategoryRead:
    existing = (
        await db.execute(select(Category).where(Category.name == payload.name))
    ).scalar_one_or_none()
    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Category with this name already exists"
        )
    slug = await unique_slugify(payload.name, _category_slug_exists_checker(db))
    category = Category(
        name=payload.name,
        slug=slug,
        description=payload.description,
        icon=payload.icon,
        color=payload.color,
    )
    db.add(category)
    await db.commit()
    await db.refresh(category)
    await cache.invalidate_tags("categories")
    await _log(db, admin, "create_category", f"Created category '{category.name}'")
    return CategoryRead(
        id=category.id,
        name=category.name,
        slug=category.slug,
        description=category.description,
        icon=category.icon,
        color=category.color,
        position=category.position,
        is_hidden=category.is_hidden,
        is_featured=category.is_featured,
        posts_count=0,
    )


@router.put("/categories/{category_id}", response_model=CategoryRead)
async def update_category(
    category_id: int,
    payload: CategoryUpdate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin),
) -> CategoryRead:
    category = (
        await db.execute(select(Category).where(Category.id == category_id))
    ).scalar_one_or_none()
    if category is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")

    data = payload.model_dump(exclude_unset=True)
    new_name = data.get("name")
    if new_name and new_name != category.name:
        category.slug = await unique_slugify(
            new_name, _category_slug_exists_checker(db, exclude_id=category.id)
        )
    for field, value in data.items():
        setattr(category, field, value)
    await db.commit()
    await db.refresh(category)

    posts_count = (
        await db.execute(
            select(func.count())
            .select_from(Announcement)
            .where(Announcement.category_id == category.id, Announcement.status == "published")
        )
    ).scalar_one()
    await cache.invalidate_tags("categories")
    await _log(db, admin, "update_category", f"Updated category '{category.name}'")
    return CategoryRead(
        id=category.id,
        name=category.name,
        slug=category.slug,
        description=category.description,
        icon=category.icon,
        color=category.color,
        position=category.position,
        is_hidden=category.is_hidden,
        is_featured=category.is_featured,
        posts_count=posts_count,
    )


@router.delete(
    "/categories/{category_id}", status_code=status.HTTP_204_NO_CONTENT, response_model=None
)
async def delete_category(
    category_id: int, db: AsyncSession = Depends(get_db), admin: User = Depends(get_current_admin)
) -> None:
    category = (
        await db.execute(select(Category).where(Category.id == category_id))
    ).scalar_one_or_none()
    if category is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")
    name = category.name
    await db.delete(category)
    await db.commit()
    await cache.invalidate_tags("categories")
    await _log(db, admin, "delete_category", f"Deleted category '{name}'")


# --------------------------------------------------------------------------
# Settings
# --------------------------------------------------------------------------


@router.get("/settings", response_model=list[SiteSettingRead])
async def get_settings(
    db: AsyncSession = Depends(get_db), admin: User = Depends(get_current_admin)
) -> list[dict]:
    return await settings_service.list_settings_masked(db)


@router.put("/settings", response_model=list[SiteSettingRead])
async def update_settings(
    payload: SiteSettingsUpdate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin),
) -> list[dict]:
    result = await settings_service.update_settings(db, payload.settings)
    # Apply side effects for settings that change runtime behaviour.
    if "NEWS_FETCH_INTERVAL" in payload.settings:
        try:
            from app.scheduler import reschedule_news

            reschedule_news(payload.settings["NEWS_FETCH_INTERVAL"])
        except Exception:  # noqa: BLE001
            pass
    if "NEWS_SOURCES" in payload.settings:
        await cache.invalidate_tags("news")
    await _log(
        db, admin, "update_settings", f"Updated settings: {', '.join(payload.settings.keys())}"
    )
    return result


# --------------------------------------------------------------------------
# Activity logs
# --------------------------------------------------------------------------


@router.get("/logs", response_model=Paginated[ActivityLogRead])
async def list_logs(
    page_params: PageParams = Depends(),
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin),
) -> dict:
    stmt = select(ActivityLog).order_by(ActivityLog.created_at.desc())
    items, total = await fetch_page(db, stmt, page_params.page, page_params.size)
    return paginate(items, total, page_params.page, page_params.size)


# --------------------------------------------------------------------------
# Users — moderation (suspend / delete / promote / reset / history)
# --------------------------------------------------------------------------


@router.post("/users/{user_id}/suspend", response_model=UserRead)
async def suspend_user(
    user_id: int, db: AsyncSession = Depends(get_db), admin: User = Depends(get_current_admin)
) -> User:
    target = await _get_user_or_404(db, user_id)
    if target.role == "admin":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot suspend an admin")
    target.is_suspended = True
    target.suspended_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(target)
    await _log(db, admin, "suspend_user", f"Suspended user '{target.username}'")
    return target


@router.post("/users/{user_id}/unsuspend", response_model=UserRead)
async def unsuspend_user(
    user_id: int, db: AsyncSession = Depends(get_db), admin: User = Depends(get_current_admin)
) -> User:
    target = await _get_user_or_404(db, user_id)
    target.is_suspended = False
    target.suspended_at = None
    await db.commit()
    await db.refresh(target)
    await _log(db, admin, "unsuspend_user", f"Unsuspended user '{target.username}'")
    return target


@router.post("/users/{user_id}/promote", response_model=UserRead)
async def promote_user(
    user_id: int,
    role: str = "moderator",
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin),
) -> User:
    if role not in {"user", "moderator", "admin"}:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid role")
    target = await _get_user_or_404(db, user_id)
    target.role = role
    await db.commit()
    await db.refresh(target)
    await _log(db, admin, "set_role", f"Set '{target.username}' role to {role}")
    return target


@router.post("/users/{user_id}/reset-password")
async def admin_reset_password(
    user_id: int, db: AsyncSession = Depends(get_db), admin: User = Depends(get_current_admin)
) -> dict:
    """Set a random temporary password and return it once for the admin to share."""
    target = await _get_user_or_404(db, user_id)
    temp = secrets.token_urlsafe(9)
    target.password_hash = hash_password(temp)
    await db.commit()
    await _log(db, admin, "reset_password", f"Reset password for '{target.username}'")
    return {"username": target.username, "temporary_password": temp}


@router.get("/users/{user_id}/login-history")
async def user_login_history(
    user_id: int, db: AsyncSession = Depends(get_db), admin: User = Depends(get_current_admin)
) -> list[dict]:
    await _get_user_or_404(db, user_id)
    rows = (
        await db.execute(
            select(LoginHistory)
            .where(LoginHistory.user_id == user_id)
            .order_by(LoginHistory.created_at.desc())
            .limit(50)
        )
    ).scalars().all()
    return [{"id": r.id, "ip": r.ip, "user_agent": r.user_agent, "created_at": r.created_at} for r in rows]


@router.get("/users/{user_id}/activity")
async def user_activity(
    user_id: int, db: AsyncSession = Depends(get_db), admin: User = Depends(get_current_admin)
) -> dict:
    await _get_user_or_404(db, user_id)
    posts = (
        await db.execute(
            select(Announcement.id, Announcement.title, Announcement.created_at, Announcement.status)
            .where(Announcement.author_id == user_id)
            .order_by(Announcement.created_at.desc())
            .limit(20)
        )
    ).all()
    comments = (
        await db.execute(
            select(Comment.id, Comment.content, Comment.created_at)
            .where(Comment.author_id == user_id)
            .order_by(Comment.created_at.desc())
            .limit(20)
        )
    ).all()
    return {
        "announcements": [
            {"id": p[0], "title": p[1], "created_at": p[2], "status": p[3]} for p in posts
        ],
        "comments": [
            {"id": c[0], "content": c[1][:160], "created_at": c[2]} for c in comments
        ],
    }


@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT, response_model=None)
async def delete_user(
    user_id: int, db: AsyncSession = Depends(get_db), admin: User = Depends(get_current_admin)
) -> None:
    target = await _get_user_or_404(db, user_id)
    if target.role == "admin":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot delete an admin")
    if target.id == admin.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot delete yourself")
    username = target.username
    await db.delete(target)
    await db.commit()
    await _log(db, admin, "delete_user", f"Deleted user '{username}'")


# --------------------------------------------------------------------------
# Announcements — admin content management (list / archive / trash / restore)
# --------------------------------------------------------------------------


@router.get("/announcements", response_model=Paginated[AnnouncementRead])
async def admin_list_announcements(
    status_filter: str | None = None,
    trashed: bool = False,
    q: str | None = None,
    page_params: PageParams = Depends(),
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin),
) -> dict:
    filters = []
    if trashed:
        filters.append(Announcement.deleted_at.is_not(None))
    else:
        filters.append(Announcement.deleted_at.is_(None))
    if status_filter:
        filters.append(Announcement.status == status_filter)
    if q:
        filters.append(Announcement.title.ilike(f"%{q}%"))
    stmt = select(Announcement).where(*filters).order_by(
        Announcement.is_pinned.desc(), Announcement.created_at.desc()
    )
    items, total = await fetch_page(db, stmt, page_params.page, page_params.size)
    reads = [build_announcement_read(a) for a in items]
    return paginate(reads, total, page_params.page, page_params.size)


@router.post("/announcements/{announcement_id}/archive", response_model=AnnouncementRead)
async def archive_announcement(
    announcement_id: int,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin),
) -> AnnouncementRead:
    result = await _set_announcement_flag(
        db, admin, announcement_id, "status", "archived", "archive_announcement"
    )
    await cache.invalidate_tags("home", "announcements", "trending")
    return result


@router.post("/announcements/{announcement_id}/unarchive", response_model=AnnouncementRead)
async def unarchive_announcement(
    announcement_id: int,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin),
) -> AnnouncementRead:
    result = await _set_announcement_flag(
        db, admin, announcement_id, "status", "published", "unarchive_announcement"
    )
    await cache.invalidate_tags("home", "announcements", "trending")
    return result


@router.post("/announcements/{announcement_id}/schedule", response_model=AnnouncementRead)
async def schedule_announcement(
    announcement_id: int,
    publish_at: datetime,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin),
) -> AnnouncementRead:
    announcement = await get_announcement_or_404(db, announcement_id)
    announcement.status = "scheduled"
    announcement.publish_date = publish_at
    await db.commit()
    await db.refresh(announcement)
    await _log(db, admin, "schedule_announcement", f"Scheduled '{announcement.title}' for {publish_at}")
    return build_announcement_read(announcement)


@router.post("/announcements/{announcement_id}/restore", response_model=AnnouncementRead)
async def restore_announcement(
    announcement_id: int,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin),
) -> AnnouncementRead:
    announcement = await get_announcement_or_404(db, announcement_id)
    announcement.deleted_at = None
    await db.commit()
    await db.refresh(announcement)
    await cache.invalidate_tags("home", "announcements", "trending")
    await _log(db, admin, "restore_announcement", f"Restored '{announcement.title}'")
    return build_announcement_read(announcement)


@router.delete(
    "/announcements/{announcement_id}/purge",
    status_code=status.HTTP_204_NO_CONTENT,
    response_model=None,
)
async def purge_announcement(
    announcement_id: int,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin),
) -> None:
    """Permanently delete an announcement (from the trash)."""
    announcement = await get_announcement_or_404(db, announcement_id)
    title = announcement.title
    await db.delete(announcement)
    await db.commit()
    await _log(db, admin, "purge_announcement", f"Permanently deleted '{title}'")
