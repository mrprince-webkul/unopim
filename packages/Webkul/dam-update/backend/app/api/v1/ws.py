"""WebSocket endpoint for real-time notification delivery."""

from __future__ import annotations

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, status
from sqlalchemy import select

from app.core.database import AsyncSessionLocal
from app.core.security import TokenError, decode_token
from app.models.user import User
from app.services.notifier import manager

router = APIRouter()


@router.websocket("/notifications")
async def notifications_ws(websocket: WebSocket, token: str = "") -> None:
    """Authenticate via `?token=<access_token>`, then stream notifications + ping/pong."""
    if not token:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return
    try:
        payload = decode_token(token, expected_type="access")
    except TokenError:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    try:
        user_id = int(payload["sub"])
    except (KeyError, ValueError, TypeError):
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    async with AsyncSessionLocal() as db:
        user = (await db.execute(select(User).where(User.id == user_id))).scalar_one_or_none()
    if user is None or user.is_banned:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    await manager.connect(user_id, websocket)
    try:
        while True:
            message = await websocket.receive_text()
            if message.strip().lower() == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        pass
    finally:
        manager.disconnect(user_id, websocket)
