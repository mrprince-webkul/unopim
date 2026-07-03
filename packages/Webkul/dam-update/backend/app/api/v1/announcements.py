"""Announcement CRUD, likes/bookmarks, and nested comments."""

from __future__ import annotations

from collections.abc import Awaitable, Callable
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import case, func, or_, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import PageParams, client_ip, get_current_user, get_current_user_optional
from app.core.database import dialect_name, fetch_page, get_db
from app.core.redis import get_redis
from app.models.analytics import AnalyticsEvent
from app.models.announcement import Announcement, Bookmark, Like, Tag, announcement_tags
from app.models.attachment import Attachment
from app.models.category import Category
from app.models.comment import Comment
from app.models.user import User
from app.schemas.announcement import (
    AnnouncementCreate,
    AnnouncementRead,
    AnnouncementUpdate,
    AttachmentRead,
    BookmarkResponse,
    CategoryRead,
    LikeResponse,
)
from app.schemas.comment import CommentCreate, CommentRead
from app.schemas.common import Paginated, paginate
from app.schemas.user import UserRead
from app.services.notifier import notify
from app.utils import ensure_aware, reading_time, slugify, unique_slugify

router = APIRouter()

VIEW_DEDUPE_TTL_SECONDS = 3600


# --------------------------------------------------------------------------
# Helpers shared with other routers (users.py, admin.py import these)
# --------------------------------------------------------------------------


def build_announcement_read(
    announcement: Announcement, *, is_liked: bool = False, is_bookmarked: bool = False
) -> AnnouncementRead:
    """Assemble the full Announcement response, resolving tags/attachments/reading_time."""
    return AnnouncementRead(
        id=announcement.id,
        title=announcement.title,
        slug=announcement.slug,
        description=announcement.description,
        content=announcement.content,
        thumbnail_url=announcement.thumbnail_url,
        author=UserRead.model_validate(announcement.author),
        category=(
            CategoryRead.model_validate(announcement.category) if announcement.category else None
        ),
        tags=[tag.name for tag in announcement.tags],
        github_url=announcement.github_url,
        website_url=announcement.website_url,
        demo_url=announcement.demo_url,
        cta_label=announcement.cta_label,
        cta_url=announcement.cta_url,
        status=announcement.status,
        is_pinned=announcement.is_pinned,
        is_featured=announcement.is_featured,
        publish_date=announcement.publish_date,
        created_at=announcement.created_at,
        updated_at=announcement.updated_at,
        views_count=announcement.views_count,
        likes_count=announcement.likes_count,
        comments_count=announcement.comments_count,
        bookmarks_count=announcement.bookmarks_count,
        attachments=[AttachmentRead.model_validate(a) for a in announcement.attachments],
        is_liked=is_liked,
        is_bookmarked=is_bookmarked,
        reading_time=reading_time(announcement.content),
    )


async def liked_bookmarked_ids(
    db: AsyncSession, viewer_id: int | None, announcement_ids: list[int]
) -> tuple[set[int], set[int]]:
    """Batch-resolve which of `announcement_ids` the viewer has liked/bookmarked."""
    if not viewer_id or not announcement_ids:
        return set(), set()
    liked = (
        await db.execute(
            select(Like.announcement_id).where(
                Like.user_id == viewer_id, Like.announcement_id.in_(announcement_ids)
            )
        )
    ).all()
    bookmarked = (
        await db.execute(
            select(Bookmark.announcement_id).where(
                Bookmark.user_id == viewer_id, Bookmark.announcement_id.in_(announcement_ids)
            )
        )
    ).all()
    return {r[0] for r in liked}, {r[0] for r in bookmarked}


async def build_announcement_list_response(
    db: AsyncSession,
    items: list[Announcement],
    total: int,
    page: int,
    size: int,
    viewer_id: int | None,
) -> dict:
    liked_ids, bookmarked_ids = await liked_bookmarked_ids(db, viewer_id, [a.id for a in items])
    reads = [
        build_announcement_read(a, is_liked=a.id in liked_ids, is_bookmarked=a.id in bookmarked_ids)
        for a in items
    ]
    return paginate(reads, total, page, size)


def slug_exists_checker(
    db: AsyncSession, exclude_id: int | None = None
) -> Callable[[str], Awaitable[bool]]:
    async def _exists(candidate: str) -> bool:
        stmt = select(Announcement.id).where(Announcement.slug == candidate)
        if exclude_id is not None:
            stmt = stmt.where(Announcement.id != exclude_id)
        return (await db.execute(stmt)).scalar_one_or_none() is not None

    return _exists


async def resolve_tags(db: AsyncSession, names: list[str]) -> list[Tag]:
    tags: list[Tag] = []
    seen_slugs: set[str] = set()
    for raw_name in names:
        name = raw_name.strip()
        if not name:
            continue
        slug = slugify(name)
        if slug in seen_slugs:
            continue
        seen_slugs.add(slug)
        existing = (await db.execute(select(Tag).where(Tag.slug == slug))).scalar_one_or_none()
        if existing is None:
            existing = Tag(name=name, slug=slug)
            db.add(existing)
            await db.flush()
        tags.append(existing)
    return tags


async def bind_attachments(
    db: AsyncSession, announcement: Announcement, attachment_ids: list[int], uploader_id: int
) -> None:
    if attachment_ids:
        result = await db.execute(
            select(Attachment).where(
                Attachment.id.in_(attachment_ids), Attachment.uploader_id == uploader_id
            )
        )
        for attachment in result.scalars().all():
            attachment.announcement_id = announcement.id


async def rebind_attachments(
    db: AsyncSession, announcement: Announcement, attachment_ids: list[int], uploader_id: int
) -> None:
    await db.execute(
        update(Attachment)
        .where(Attachment.announcement_id == announcement.id)
        .values(announcement_id=None)
    )
    await bind_attachments(db, announcement, attachment_ids, uploader_id)


def build_comment_read(comment: Comment, replies: list[Comment] | None = None) -> CommentRead:
    """Build a Comment response with (at most) one level of nested replies.

    `replies` must be explicitly provided (pre-fetched, filtered, sorted) by
    the caller; it defaults to empty rather than lazily touching
    `comment.replies`, since that self-referential relationship isn't safe
    to lazy-load under the asyncio extension (see app.models.comment).
    """
    if replies is None:
        replies = []
    return CommentRead(
        id=comment.id,
        content=comment.content,
        author=UserRead.model_validate(comment.author),
        announcement_id=comment.announcement_id,
        parent_id=comment.parent_id,
        is_hidden=comment.is_hidden,
        created_at=comment.created_at,
        replies=[build_comment_read(r, []) for r in replies],
    )


async def get_announcement_or_404(db: AsyncSession, announcement_id: int) -> Announcement:
    result = await db.execute(select(Announcement).where(Announcement.id == announcement_id))
    announcement = result.scalar_one_or_none()
    if announcement is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Announcement not found")
    return announcement


def _can_modify(announcement: Announcement, user: User) -> bool:
    return announcement.author_id == user.id or user.role == "admin"


# --------------------------------------------------------------------------
# Routes
# --------------------------------------------------------------------------


@router.get("", response_model=Paginated[AnnouncementRead])
async def list_announcements(
    page_params: PageParams = Depends(),
    sort: str = Query("latest", pattern="^(latest|popular|trending)$"),
    category: str | None = None,
    tag: str | None = None,
    author: str | None = None,
    featured: bool | None = None,
    pinned: bool | None = None,
    q: str | None = None,
    db: AsyncSession = Depends(get_db),
    viewer: User | None = Depends(get_current_user_optional),
) -> dict:
    now = datetime.now(timezone.utc)
    filters = [
        Announcement.status == "published",
        Announcement.publish_date <= now,
        Announcement.deleted_at.is_(None),
    ]

    if category:
        cat_id = (
            await db.execute(select(Category.id).where(Category.slug == category))
        ).scalar_one_or_none()
        filters.append(Announcement.category_id == (cat_id if cat_id is not None else -1))
    if author:
        author_id = (
            await db.execute(select(User.id).where(User.username == author))
        ).scalar_one_or_none()
        filters.append(Announcement.author_id == (author_id if author_id is not None else -1))
    if featured is not None:
        filters.append(Announcement.is_featured == featured)
    if pinned is not None:
        filters.append(Announcement.is_pinned == pinned)
    if tag:
        tag_ann_ids = (
            select(announcement_tags.c.announcement_id)
            .join(Tag, Tag.id == announcement_tags.c.tag_id)
            .where(Tag.slug == tag)
        )
        filters.append(Announcement.id.in_(tag_ann_ids))
    if q:
        pattern = f"%{q}%"
        filters.append(
            or_(Announcement.title.ilike(pattern), Announcement.description.ilike(pattern))
        )

    stmt = select(Announcement).where(*filters)

    if sort == "latest":
        stmt = stmt.order_by(Announcement.is_pinned.desc(), Announcement.publish_date.desc())
    elif sort == "popular":
        stmt = stmt.order_by(
            (Announcement.likes_count + Announcement.views_count).desc(),
            Announcement.publish_date.desc(),
        )
    else:  # trending
        if dialect_name(db) == "postgresql":
            seven_days_ago = now - timedelta(days=7)
            weight = case(
                (AnalyticsEvent.event_type == "like", 3),
                (AnalyticsEvent.event_type == "comment", 2),
                (AnalyticsEvent.event_type == "view", 1),
                else_=0,
            )
            score_subq = (
                select(
                    AnalyticsEvent.announcement_id.label("aid"),
                    func.sum(weight).label("score"),
                )
                .where(AnalyticsEvent.created_at >= seven_days_ago)
                .group_by(AnalyticsEvent.announcement_id)
                .subquery()
            )
            stmt = stmt.outerjoin(score_subq, score_subq.c.aid == Announcement.id).order_by(
                func.coalesce(score_subq.c.score, 0).desc(), Announcement.publish_date.desc()
            )
        else:
            # SQLite fallback: interval/date math on a raw event log is awkward
            # portably, so fall back to the all-time popularity ordering.
            stmt = stmt.order_by(
                (
                    Announcement.likes_count * 3
                    + Announcement.comments_count * 2
                    + Announcement.views_count
                ).desc(),
                Announcement.publish_date.desc(),
            )

    items, total = await fetch_page(db, stmt, page_params.page, page_params.size)
    viewer_id = viewer.id if viewer else None
    return await build_announcement_list_response(
        db, items, total, page_params.page, page_params.size, viewer_id
    )


@router.post("", response_model=AnnouncementRead, status_code=status.HTTP_201_CREATED)
async def create_announcement(
    payload: AnnouncementCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> AnnouncementRead:
    if payload.category_id is not None:
        category = (
            await db.execute(select(Category).where(Category.id == payload.category_id))
        ).scalar_one_or_none()
        if category is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid category_id"
            )

    slug = await unique_slugify(payload.title, slug_exists_checker(db))
    announcement = Announcement(
        title=payload.title,
        slug=slug,
        description=payload.description,
        content=payload.content,
        thumbnail_url=payload.thumbnail_url,
        author_id=user.id,
        category_id=payload.category_id,
        github_url=payload.github_url,
        website_url=payload.website_url,
        demo_url=payload.demo_url,
        cta_label=payload.cta_label,
        cta_url=payload.cta_url,
        status=payload.status,
        publish_date=payload.publish_date or datetime.now(timezone.utc),
    )
    if payload.tags:
        announcement.tags = await resolve_tags(db, payload.tags)
    db.add(announcement)
    await db.flush()
    if payload.attachment_ids:
        await bind_attachments(db, announcement, payload.attachment_ids, user.id)
    await db.commit()
    await db.refresh(announcement)
    return build_announcement_read(announcement)


@router.get("/{slug}", response_model=AnnouncementRead)
async def get_announcement(
    slug: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
    viewer: User | None = Depends(get_current_user_optional),
) -> AnnouncementRead:
    announcement = (
        await db.execute(select(Announcement).where(Announcement.slug == slug))
    ).scalar_one_or_none()
    if announcement is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Announcement not found")

    now = datetime.now(timezone.utc)
    is_admin = viewer is not None and viewer.role == "admin"
    is_owner_or_admin = viewer is not None and (
        viewer.id == announcement.author_id or viewer.role == "admin"
    )
    # Trashed (soft-deleted) posts are invisible to everyone but admins.
    if announcement.deleted_at is not None and not is_admin:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Announcement not found")
    is_visible = (
        announcement.status == "published" and ensure_aware(announcement.publish_date) <= now
    )
    if not is_visible and not is_owner_or_admin:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Announcement not found")

    redis = get_redis()
    dedupe_key = f"view:{announcement.id}:{client_ip(request)}"
    is_new_view = await redis.set_if_absent(dedupe_key, "1", ex=VIEW_DEDUPE_TTL_SECONDS)
    if is_new_view:
        announcement.views_count += 1
        db.add(
            AnalyticsEvent(
                event_type="view",
                announcement_id=announcement.id,
                user_id=viewer.id if viewer else None,
            )
        )
        await db.commit()
        await db.refresh(announcement)

    is_liked = is_bookmarked = False
    if viewer is not None:
        liked_ids, bookmarked_ids = await liked_bookmarked_ids(db, viewer.id, [announcement.id])
        is_liked = announcement.id in liked_ids
        is_bookmarked = announcement.id in bookmarked_ids

    return build_announcement_read(announcement, is_liked=is_liked, is_bookmarked=is_bookmarked)


@router.put("/{announcement_id}", response_model=AnnouncementRead)
async def update_announcement(
    announcement_id: int,
    payload: AnnouncementUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> AnnouncementRead:
    announcement = await get_announcement_or_404(db, announcement_id)
    if not _can_modify(announcement, user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to modify this announcement",
        )

    data = payload.model_dump(exclude_unset=True)
    tags = data.pop("tags", None)
    attachment_ids = data.pop("attachment_ids", None)

    if data.get("category_id") is not None:
        category = (
            await db.execute(select(Category).where(Category.id == data["category_id"]))
        ).scalar_one_or_none()
        if category is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid category_id"
            )

    new_title = data.get("title")
    if new_title and new_title != announcement.title:
        announcement.slug = await unique_slugify(
            new_title, slug_exists_checker(db, exclude_id=announcement.id)
        )

    for field, value in data.items():
        setattr(announcement, field, value)

    if tags is not None:
        announcement.tags = await resolve_tags(db, tags)
    if attachment_ids is not None:
        await rebind_attachments(db, announcement, attachment_ids, user.id)

    await db.commit()
    await db.refresh(announcement)

    liked_ids, bookmarked_ids = await liked_bookmarked_ids(db, user.id, [announcement.id])
    return build_announcement_read(
        announcement,
        is_liked=announcement.id in liked_ids,
        is_bookmarked=announcement.id in bookmarked_ids,
    )


@router.delete("/{announcement_id}", status_code=status.HTTP_204_NO_CONTENT, response_model=None)
async def delete_announcement(
    announcement_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> None:
    announcement = await get_announcement_or_404(db, announcement_id)
    if not _can_modify(announcement, user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to delete this announcement",
        )
    # Soft delete: recoverable from the admin trash, purged after 30 days.
    announcement.deleted_at = datetime.now(timezone.utc)
    await db.commit()


@router.post("/{announcement_id}/like", response_model=LikeResponse)
async def like_announcement(
    announcement_id: int, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)
) -> LikeResponse:
    announcement = await get_announcement_or_404(db, announcement_id)
    existing = (
        await db.execute(
            select(Like).where(Like.user_id == user.id, Like.announcement_id == announcement_id)
        )
    ).scalar_one_or_none()
    if existing is None:
        db.add(Like(user_id=user.id, announcement_id=announcement_id))
        announcement.likes_count += 1
        db.add(AnalyticsEvent(event_type="like", announcement_id=announcement_id, user_id=user.id))
        await db.commit()
        await db.refresh(announcement)
        if announcement.author_id != user.id:
            await notify(
                db,
                announcement.author_id,
                "like",
                "New like",
                f'{user.username} liked your announcement "{announcement.title}"',
                link=f"/announcements/{announcement.slug}",
            )
    return LikeResponse(likes_count=announcement.likes_count, is_liked=True)


@router.delete("/{announcement_id}/like", response_model=LikeResponse)
async def unlike_announcement(
    announcement_id: int, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)
) -> LikeResponse:
    announcement = await get_announcement_or_404(db, announcement_id)
    existing = (
        await db.execute(
            select(Like).where(Like.user_id == user.id, Like.announcement_id == announcement_id)
        )
    ).scalar_one_or_none()
    if existing is not None:
        await db.delete(existing)
        announcement.likes_count = max(0, announcement.likes_count - 1)
        await db.commit()
        await db.refresh(announcement)
    return LikeResponse(likes_count=announcement.likes_count, is_liked=False)


@router.post("/{announcement_id}/bookmark", response_model=BookmarkResponse)
async def bookmark_announcement(
    announcement_id: int, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)
) -> BookmarkResponse:
    announcement = await get_announcement_or_404(db, announcement_id)
    existing = (
        await db.execute(
            select(Bookmark).where(
                Bookmark.user_id == user.id, Bookmark.announcement_id == announcement_id
            )
        )
    ).scalar_one_or_none()
    if existing is None:
        db.add(Bookmark(user_id=user.id, announcement_id=announcement_id))
        announcement.bookmarks_count += 1
        await db.commit()
        await db.refresh(announcement)
    return BookmarkResponse(bookmarks_count=announcement.bookmarks_count, is_bookmarked=True)


@router.delete("/{announcement_id}/bookmark", response_model=BookmarkResponse)
async def unbookmark_announcement(
    announcement_id: int, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)
) -> BookmarkResponse:
    announcement = await get_announcement_or_404(db, announcement_id)
    existing = (
        await db.execute(
            select(Bookmark).where(
                Bookmark.user_id == user.id, Bookmark.announcement_id == announcement_id
            )
        )
    ).scalar_one_or_none()
    if existing is not None:
        await db.delete(existing)
        announcement.bookmarks_count = max(0, announcement.bookmarks_count - 1)
        await db.commit()
        await db.refresh(announcement)
    return BookmarkResponse(bookmarks_count=announcement.bookmarks_count, is_bookmarked=False)


@router.get("/{announcement_id}/comments", response_model=Paginated[CommentRead])
async def list_comments(
    announcement_id: int,
    page_params: PageParams = Depends(),
    db: AsyncSession = Depends(get_db),
    viewer: User | None = Depends(get_current_user_optional),
) -> dict:
    await get_announcement_or_404(db, announcement_id)
    is_admin = viewer is not None and viewer.role == "admin"

    filters = [Comment.announcement_id == announcement_id, Comment.parent_id.is_(None)]
    if not is_admin:
        filters.append(Comment.is_hidden.is_(False))

    # Explicit selectinload: self-referential relationships don't reliably
    # eager-load via a mapper-level `lazy="selectin"` default under asyncio.
    stmt = (
        select(Comment)
        .where(*filters)
        .options(selectinload(Comment.replies))
        .order_by(Comment.created_at.asc())
    )
    items, total = await fetch_page(db, stmt, page_params.page, page_params.size)

    result_items = []
    for comment in items:
        replies = comment.replies
        if not is_admin:
            replies = [r for r in replies if not r.is_hidden]
        replies = sorted(replies, key=lambda r: r.created_at)
        result_items.append(build_comment_read(comment, replies))

    return paginate(result_items, total, page_params.page, page_params.size)


@router.post(
    "/{announcement_id}/comments", response_model=CommentRead, status_code=status.HTTP_201_CREATED
)
async def create_comment(
    announcement_id: int,
    payload: CommentCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> CommentRead:
    announcement = await get_announcement_or_404(db, announcement_id)

    if payload.parent_id is not None:
        parent = (
            await db.execute(
                select(Comment).where(
                    Comment.id == payload.parent_id, Comment.announcement_id == announcement_id
                )
            )
        ).scalar_one_or_none()
        if parent is None:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid parent_id")

    comment = Comment(
        content=payload.content,
        author_id=user.id,
        announcement_id=announcement_id,
        parent_id=payload.parent_id,
    )
    db.add(comment)
    announcement.comments_count += 1
    await db.commit()
    await db.refresh(comment)

    if announcement.author_id != user.id:
        await notify(
            db,
            announcement.author_id,
            "comment",
            "New comment",
            f'{user.username} commented on "{announcement.title}"',
            link=f"/announcements/{announcement.slug}",
        )

    return build_comment_read(comment, [])
