"""Auth endpoints: register, login, refresh, logout, password reset, verification."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from datetime import datetime, timezone

from app.api.deps import client_ip, get_current_user
from app.core.config import settings
from app.core.database import get_db
from app.core.redis import get_redis
from app.core.security import (
    TokenError,
    create_access_token,
    create_refresh_token,
    create_reset_token,
    create_verify_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.models.login_history import LoginHistory
from app.models.user import User
from app.schemas.auth import (
    ForgotPasswordRequest,
    LoginRequest,
    RegisterRequest,
    ResetPasswordRequest,
    TokenResponse,
    VerifyEmailRequest,
)
from app.schemas.common import Message
from app.schemas.user import UserRead
from app.services.email import send_password_reset_email, send_verification_email

router = APIRouter()

_REFRESH_COOKIE_PATH = "/api/v1/auth"
_REFRESH_COOKIE_MAX_AGE = settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 3600


def _refresh_jti_key(user_id: int, jti: str) -> str:
    return f"refresh_jti:{user_id}:{jti}"


def _set_refresh_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key="refresh_token",
        value=token,
        max_age=_REFRESH_COOKIE_MAX_AGE,
        httponly=True,
        samesite="lax",
        path=_REFRESH_COOKIE_PATH,
        # secure=False: the app is served over plain HTTP locally / behind the
        # bundled nginx without TLS termination. Set this to True once the
        # deployment terminates TLS in front of the app.
        secure=False,
    )


async def _issue_tokens(user: User, response: Response) -> str:
    """Create + allowlist a refresh token, set the cookie, and return a fresh access token."""
    refresh_token, jti = create_refresh_token(user.id)
    await get_redis().set(_refresh_jti_key(user.id, jti), "1", ex=_REFRESH_COOKIE_MAX_AGE)
    _set_refresh_cookie(response, refresh_token)
    return create_access_token(user.id)


@router.post("/register", response_model=UserRead, status_code=status.HTTP_201_CREATED)
async def register(payload: RegisterRequest, db: AsyncSession = Depends(get_db)) -> User:
    email = payload.email.lower()
    existing = await db.execute(
        select(User).where(or_(func.lower(User.email) == email, User.username == payload.username))
    )
    conflict = existing.scalar_one_or_none()
    if conflict is not None:
        detail = (
            "Email already registered"
            if conflict.email.lower() == email
            else "Username already taken"
        )
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=detail)

    user = User(
        email=email,
        username=payload.username,
        password_hash=hash_password(payload.password),
        full_name=payload.full_name,
        role="user",
        is_verified=False,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    verify_token = create_verify_token(user.id)
    await send_verification_email(user, verify_token)
    return user


@router.post("/login", response_model=TokenResponse)
async def login(
    payload: LoginRequest,
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
) -> TokenResponse:
    identifier = payload.email_or_username.strip().lower()
    result = await db.execute(
        select(User).where(
            or_(func.lower(User.email) == identifier, func.lower(User.username) == identifier)
        )
    )
    user = result.scalar_one_or_none()
    if user is None or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    if user.is_banned:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Your account has been banned."
        )
    if user.is_suspended:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account is suspended. Contact an administrator.",
        )

    # Record the login for the admin's per-user login history.
    user.last_login_at = datetime.now(timezone.utc)
    db.add(
        LoginHistory(
            user_id=user.id,
            ip=client_ip(request)[:64],
            user_agent=(request.headers.get("user-agent") or "")[:400],
        )
    )
    await db.commit()

    access_token = await _issue_tokens(user, response)
    return TokenResponse(access_token=access_token, user=UserRead.model_validate(user))


@router.post("/refresh", response_model=TokenResponse)
async def refresh(
    request: Request, response: Response, db: AsyncSession = Depends(get_db)
) -> TokenResponse:
    raw_token = request.cookies.get("refresh_token")
    if not raw_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing refresh token"
        )
    try:
        payload = decode_token(raw_token, expected_type="refresh")
    except TokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired refresh token"
        ) from None

    user_id = int(payload["sub"])
    jti = payload.get("jti", "")
    redis = get_redis()
    key = _refresh_jti_key(user_id, jti)
    if not await redis.exists(key):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token has been revoked"
        )

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None or user.is_banned:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token"
        )

    await redis.delete(key)  # rotate: old refresh token is single-use
    access_token = await _issue_tokens(user, response)
    return TokenResponse(access_token=access_token, user=UserRead.model_validate(user))


@router.post("/logout", response_model=Message)
async def logout(request: Request, response: Response) -> Message:
    raw_token = request.cookies.get("refresh_token")
    if raw_token:
        try:
            payload = decode_token(raw_token, expected_type="refresh")
            user_id = payload.get("sub")
            jti = payload.get("jti")
            if user_id and jti:
                await get_redis().delete(_refresh_jti_key(int(user_id), jti))
        except TokenError:
            pass
    response.delete_cookie("refresh_token", path=_REFRESH_COOKIE_PATH)
    return Message(message="Logged out successfully.")


@router.post("/forgot-password", response_model=Message)
async def forgot_password(
    payload: ForgotPasswordRequest, db: AsyncSession = Depends(get_db)
) -> Message:
    result = await db.execute(select(User).where(func.lower(User.email) == payload.email.lower()))
    user = result.scalar_one_or_none()
    if user is not None:
        reset_token = create_reset_token(user.id)
        await send_password_reset_email(user, reset_token)
    # Always 200, regardless of whether the email exists, to avoid account enumeration.
    return Message(message="If an account exists for that email, a reset link has been sent.")


@router.post("/reset-password", response_model=Message)
async def reset_password(
    payload: ResetPasswordRequest, db: AsyncSession = Depends(get_db)
) -> Message:
    try:
        token_payload = decode_token(payload.token, expected_type="reset")
    except TokenError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired reset token"
        ) from None
    user_id = int(token_payload["sub"])
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired reset token"
        )

    user.password_hash = hash_password(payload.new_password)
    await db.commit()
    return Message(message="Password has been reset successfully.")


@router.post("/verify-email", response_model=Message)
async def verify_email(payload: VerifyEmailRequest, db: AsyncSession = Depends(get_db)) -> Message:
    try:
        token_payload = decode_token(payload.token, expected_type="verify")
    except TokenError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired verification token"
        ) from None
    user_id = int(token_payload["sub"])
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired verification token"
        )

    user.is_verified = True
    await db.commit()
    return Message(message="Email verified successfully.")


@router.get("/me", response_model=UserRead)
async def get_me(user: User = Depends(get_current_user)) -> User:
    return user
