"""User profiles, follow graph, per-user announcements/bookmarks/stats."""

from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import PageParams, get_current_user, get_current_user_optional
from app.api.v1.announcements import build_announcement_list_response
from app.core.database import fetch_page, get_db
from app.models.announcement import Announcement, Bookmark
from app.models.user import Follow, User
from app.schemas.announcement import AnnouncementRead
from app.schemas.common import Message, Paginated
from app.schemas.user import PublicProfile, UserRead, UserStats, UserUpdate
from app.services.notifier import notify
from app.services.search import build_public_profile
from app.services.stats import get_user_stats

router = APIRouter()


@router.put("/me", response_model=UserRead)
async def update_me(
    payload: UserUpdate, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)
) -> User:
    data = payload.model_dump(exclude_unset=True)
    for field, value in data.items():
        setattr(user, field, value)
    await db.commit()
    await db.refresh(user)
    return user


@router.get("/me/bookmarks", response_model=Paginated[AnnouncementRead])
async def get_my_bookmarks(
    page_params: PageParams = Depends(),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    stmt = (
        select(Announcement)
        .join(Bookmark, Bookmark.announcement_id == Announcement.id)
        .where(Bookmark.user_id == user.id)
        .order_by(Bookmark.created_at.desc())
    )
    items, total = await fetch_page(db, stmt, page_params.page, page_params.size)
    return await build_announcement_list_response(
        db, items, total, page_params.page, page_params.size, user.id
    )


@router.get("/me/stats", response_model=UserStats)
async def get_my_stats(
    db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)
) -> dict:
    return await get_user_stats(db, user.id)


@router.get("/{username}", response_model=PublicProfile)
async def get_user_profile(
    username: str,
    db: AsyncSession = Depends(get_db),
    viewer: User | None = Depends(get_current_user_optional),
) -> PublicProfile:
    target = (await db.execute(select(User).where(User.username == username))).scalar_one_or_none()
    if target is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return await build_public_profile(db, target, viewer.id if viewer else None)


@router.post("/{username}/follow", response_model=Message)
async def follow_user(
    username: str, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)
) -> Message:
    target = (await db.execute(select(User).where(User.username == username))).scalar_one_or_none()
    if target is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    if target.id == user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="You cannot follow yourself"
        )

    existing = (
        await db.execute(
            select(Follow).where(Follow.follower_id == user.id, Follow.following_id == target.id)
        )
    ).scalar_one_or_none()
    if existing is None:
        db.add(Follow(follower_id=user.id, following_id=target.id))
        await db.commit()
        await notify(
            db,
            target.id,
            "follow",
            "New follower",
            f"{user.username} started following you",
            link=f"/users/{user.username}",
        )
    return Message(message=f"You are now following {target.username}.")


@router.delete("/{username}/follow", response_model=Message)
async def unfollow_user(
    username: str, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)
) -> Message:
    target = (await db.execute(select(User).where(User.username == username))).scalar_one_or_none()
    if target is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    existing = (
        await db.execute(
            select(Follow).where(Follow.follower_id == user.id, Follow.following_id == target.id)
        )
    ).scalar_one_or_none()
    if existing is not None:
        await db.delete(existing)
        await db.commit()
    return Message(message=f"You have unfollowed {target.username}.")


@router.get("/{username}/announcements", response_model=Paginated[AnnouncementRead])
async def get_user_announcements(
    username: str,
    status_filter: str | None = Query(None, alias="status"),
    page_params: PageParams = Depends(),
    db: AsyncSession = Depends(get_db),
    viewer: User | None = Depends(get_current_user_optional),
) -> dict:
    target = (await db.execute(select(User).where(User.username == username))).scalar_one_or_none()
    if target is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    is_owner_or_admin = viewer is not None and (viewer.id == target.id or viewer.role == "admin")
    filters = [Announcement.author_id == target.id]

    if status_filter == "draft":
        if not is_owner_or_admin:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You cannot view another user's drafts",
            )
        filters.append(Announcement.status == "draft")
    else:
        filters.append(Announcement.status == "published")
        if not is_owner_or_admin:
            filters.append(Announcement.publish_date <= datetime.now(timezone.utc))

    stmt = select(Announcement).where(*filters).order_by(Announcement.publish_date.desc())
    items, total = await fetch_page(db, stmt, page_params.page, page_params.size)
    return await build_announcement_list_response(
        db, items, total, page_params.page, page_params.size, viewer.id if viewer else None
    )
