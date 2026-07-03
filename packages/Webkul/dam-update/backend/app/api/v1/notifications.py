"""Notification listing + read-state mutations."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import PageParams, get_current_user
from app.core.database import fetch_page, get_db
from app.models.notification import Notification
from app.models.user import User
from app.schemas.common import Message
from app.schemas.notification import NotificationRead, NotificationsPage

router = APIRouter()


@router.get("", response_model=NotificationsPage)
async def list_notifications(
    page_params: PageParams = Depends(),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    stmt = (
        select(Notification)
        .where(Notification.user_id == user.id)
        .order_by(Notification.created_at.desc())
    )
    items, total = await fetch_page(db, stmt, page_params.page, page_params.size)
    unread_count = (
        await db.execute(
            select(func.count())
            .select_from(Notification)
            .where(Notification.user_id == user.id, Notification.is_read.is_(False))
        )
    ).scalar_one()

    pages = (total + page_params.size - 1) // page_params.size if page_params.size else 0
    return {
        "items": [NotificationRead.model_validate(n) for n in items],
        "total": total,
        "page": page_params.page,
        "pages": max(pages, 0),
        "size": page_params.size,
        "unread_count": unread_count,
    }


@router.post("/{notification_id}/read", response_model=NotificationRead)
async def mark_notification_read(
    notification_id: int, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)
) -> Notification:
    notification = (
        await db.execute(
            select(Notification).where(
                Notification.id == notification_id, Notification.user_id == user.id
            )
        )
    ).scalar_one_or_none()
    if notification is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found")
    notification.is_read = True
    await db.commit()
    await db.refresh(notification)
    return notification


@router.post("/read-all", response_model=Message)
async def mark_all_notifications_read(
    db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)
) -> Message:
    await db.execute(
        update(Notification)
        .where(Notification.user_id == user.id, Notification.is_read.is_(False))
        .values(is_read=True)
    )
    await db.commit()
    return Message(message="All notifications marked as read.")
