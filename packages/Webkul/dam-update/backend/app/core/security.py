"""Password hashing (bcrypt) and JWT issuing/verification (PyJWT)."""

from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Literal

import bcrypt
import jwt

from app.core.config import settings

TokenType = Literal["access", "refresh", "reset", "verify"]

# bcrypt silently truncates/errors on inputs > 72 bytes; guard against that
# so very long passwords still hash deterministically.
_BCRYPT_MAX_BYTES = 72


def _truncate_password(password: str) -> bytes:
    return password.encode("utf-8")[:_BCRYPT_MAX_BYTES]


def hash_password(password: str) -> str:
    hashed = bcrypt.hashpw(_truncate_password(password), bcrypt.gensalt())
    return hashed.decode("utf-8")


def verify_password(password: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(_truncate_password(password), hashed.encode("utf-8"))
    except (ValueError, TypeError):
        return False


_EXPIRY_BY_TYPE: dict[TokenType, timedelta] = {
    "access": timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
    "refresh": timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
    "reset": timedelta(hours=settings.RESET_TOKEN_EXPIRE_HOURS),
    "verify": timedelta(hours=settings.VERIFY_TOKEN_EXPIRE_HOURS),
}


def create_token(sub: int | str, token_type: TokenType, extra: dict[str, Any] | None = None) -> str:
    """Create a JWT of the given type for the given subject (user id)."""
    now = datetime.now(timezone.utc)
    payload: dict[str, Any] = {
        "sub": str(sub),
        "type": token_type,
        "iat": now,
        "exp": now + _EXPIRY_BY_TYPE[token_type],
    }
    if extra:
        payload.update(extra)
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def create_access_token(sub: int | str) -> str:
    return create_token(sub, "access")


def create_refresh_token(sub: int | str) -> tuple[str, str]:
    """Create a refresh token; returns (token, jti) so the caller can allowlist it."""
    jti = uuid.uuid4().hex
    token = create_token(sub, "refresh", {"jti": jti})
    return token, jti


def create_reset_token(sub: int | str) -> str:
    return create_token(sub, "reset")


def create_verify_token(sub: int | str) -> str:
    return create_token(sub, "verify")


class TokenError(Exception):
    """Raised when a token is invalid, expired, or of the wrong type."""


def decode_token(token: str, expected_type: TokenType | None = None) -> dict[str, Any]:
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
    except jwt.PyJWTError as exc:
        raise TokenError(str(exc)) from exc
    if expected_type is not None and payload.get("type") != expected_type:
        raise TokenError(f"Expected token type {expected_type!r}, got {payload.get('type')!r}")
    return payload
