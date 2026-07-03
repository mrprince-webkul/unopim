"""Redis-backed sliding-window-ish rate limiting middleware."""

from __future__ import annotations

from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import JSONResponse, Response

from app.core.config import settings
from app.core.redis import get_redis

# path suffix -> (limit, window_seconds)
_STRICT_LIMITS: dict[str, tuple[int, int]] = {
    "/auth/login": (10, 60),
    "/auth/register": (10, 60),
    "/auth/forgot-password": (10, 60),
}
_GLOBAL_LIMIT = (300, 60)


def _client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-real-ip") or request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    if request.client:
        return request.client.host
    return "unknown"


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Applies a global per-IP rate limit, plus stricter limits on sensitive auth routes."""

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        if settings.is_test:
            return await call_next(request)

        redis = get_redis()
        ip = _client_ip(request)
        path = request.url.path

        checks: list[tuple[str, int, int]] = [(f"ratelimit:global:{ip}", *_GLOBAL_LIMIT)]
        if request.method == "POST":
            for suffix, (limit, window) in _STRICT_LIMITS.items():
                if path.endswith(suffix):
                    checks.append((f"ratelimit:{suffix}:{ip}", limit, window))

        for key, limit, window in checks:
            count = await redis.incr(key)
            if count == 1:
                await redis.expire(key, window)
            if count > limit:
                return JSONResponse(
                    status_code=429,
                    content={"detail": "Too many requests"},
                )

        return await call_next(request)
