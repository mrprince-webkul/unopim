"""Notification creation + real-time delivery over WebSocket.

`ConnectionManager` tracks live WebSocket connections per user id in
process memory (fine for a single-worker deployment, as mandated by the
entrypoint). `notify()` persists a Notification row and, if the recipient
has an open socket, pushes it immediately.
"""

from __future__ import annotations

import logging

from fastapi import WebSocket
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.notification import Notification
from app.models.user import User
from app.schemas.notification import NotificationRead

logger = logging.getLogger("devannounce.notifier")


class ConnectionManager:
    """In-memory registry of live notification WebSocket connections."""

    def __init__(self) -> None:
        self._connections: dict[int, set[WebSocket]] = {}

    async def connect(self, user_id: int, websocket: WebSocket) -> None:
        await websocket.accept()
        self._connections.setdefault(user_id, set()).add(websocket)

    def disconnect(self, user_id: int, websocket: WebSocket) -> None:
        conns = self._connections.get(user_id)
        if not conns:
            return
        conns.discard(websocket)
        if not conns:
            self._connections.pop(user_id, None)

    async def send_to_user(self, user_id: int, message: dict) -> None:
        conns = self._connections.get(user_id)
        if not conns:
            return
        stale: list[WebSocket] = []
        for ws in list(conns):
            try:
                await ws.send_json(message)
            except Exception:  # noqa: BLE001
                stale.append(ws)
        for ws in stale:
            self.disconnect(user_id, ws)


manager = ConnectionManager()


async def notify(
    db: AsyncSession,
    user_id: int,
    type: str,  # noqa: A002
    title: str,
    body: str,
    link: str | None = None,
) -> Notification:
    """Create a notification for `user_id` and push it over WS if they're connected."""
    notification = Notification(user_id=user_id, type=type, title=title, body=body, link=link)
    db.add(notification)
    await db.commit()
    await db.refresh(notification)

    payload = NotificationRead.model_validate(notification).model_dump(mode="json")
    await manager.send_to_user(user_id, {"type": "notification", "data": payload})
    return notification


async def notify_all_users(
    db: AsyncSession,
    type: str,  # noqa: A002
    title: str,
    body: str,
    link: str | None = None,
) -> int:
    """Create + push the same notification to every user. Returns count notified."""
    result = await db.execute(select(User.id))
    user_ids = [row[0] for row in result.all()]
    for user_id in user_ids:
        notification = Notification(user_id=user_id, type=type, title=title, body=body, link=link)
        db.add(notification)
    await db.commit()

    for user_id in user_ids:
        payload = {
            "type": "notification",
            "data": {
                "id": 0,
                "type": type,
                "title": title,
                "body": body,
                "link": link,
                "is_read": False,
                "created_at": None,
            },
        }
        try:
            await manager.send_to_user(user_id, payload)
        except Exception:  # noqa: BLE001
            logger.debug("Failed to push notification to user %s", user_id)
    return len(user_ids)
