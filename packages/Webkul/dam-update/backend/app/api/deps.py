"""Shared FastAPI dependencies: DB session, current user (required/optional), admin guard."""

from __future__ import annotations

from fastapi import Depends, HTTPException, Query, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import TokenError, decode_token
from app.models.user import User

_bearer_scheme = HTTPBearer(auto_error=False)


async def _load_user_from_token(token: str, db: AsyncSession) -> User | None:
    try:
        payload = decode_token(token, expected_type="access")
    except TokenError:
        return None
    user_id = payload.get("sub")
    if user_id is None:
        return None
    result = await db.execute(select(User).where(User.id == int(user_id)))
    return result.scalar_one_or_none()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    """Require a valid access token; raise 401 otherwise."""
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    user = await _load_user_from_token(credentials.credentials, db)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if user.is_banned:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account has been banned.",
        )
    if user.is_suspended:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account is suspended.",
        )
    return user


async def get_current_user_optional(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> User | None:
    """Resolve the current user if a valid token is present, else None (no error)."""
    if credentials is None:
        return None
    user = await _load_user_from_token(credentials.credentials, db)
    if user is not None and user.is_banned:
        return None
    return user


async def get_current_admin(user: User = Depends(get_current_user)) -> User:
    """Require the current user to have the admin role."""
    if user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    return user


class PageParams:
    """Common `page`/`size` query params with contract defaults (10, max 50)."""

    def __init__(
        self,
        page: int = Query(1, ge=1),
        size: int = Query(10, ge=1, le=50),
    ) -> None:
        self.page = page
        self.size = size

    @property
    def offset(self) -> int:
        return (self.page - 1) * self.size


def client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-real-ip") or request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    if request.client:
        return request.client.host
    return "unknown"
