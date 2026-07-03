"""Notification schemas."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.schemas.common import Paginated


class NotificationRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    type: str
    title: str
    body: str
    link: str | None = None
    is_read: bool
    created_at: datetime


class NotificationsPage(Paginated[NotificationRead]):
    unread_count: int = 0
