"""FastAPI application factory: middleware, lifespan, routing."""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.responses import Response

from app.api.v1 import api_router
from app.core.config import settings
from app.core.rate_limit import RateLimitMiddleware
from app.scheduler import start_scheduler, stop_scheduler
from app.services.storage import storage_service

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
)
logger = logging.getLogger("devannounce")


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Adds a conservative set of security headers to every response."""

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        response = await call_next(request)
        response.headers.setdefault("X-Content-Type-Options", "nosniff")
        response.headers.setdefault("X-Frame-Options", "DENY")
        response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
        response.headers.setdefault(
            "Permissions-Policy", "camera=(), microphone=(), geolocation=()"
        )
        return response


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting DevAnnounce backend (environment=%s)", settings.ENVIRONMENT)
    await storage_service.ensure_bucket()
    if not settings.is_test:
        await start_scheduler()
    yield
    if not settings.is_test:
        stop_scheduler()
    logger.info("DevAnnounce backend shutting down.")


def create_app() -> FastAPI:
    app = FastAPI(
        title="DevAnnounce API",
        description="Announcement + developer news platform backend.",
        version="1.0.0",
        docs_url="/api/v1/docs",
        openapi_url="/api/v1/openapi.json",
        redoc_url=None,
        lifespan=lifespan,
    )

    # Middleware is applied outside-in in reverse order of `add_middleware`
    # calls, so CORS is added last to make it the outermost layer — this
    # guarantees CORS headers are present even on rate-limited/error responses.
    app.add_middleware(RateLimitMiddleware)
    app.add_middleware(SecurityHeadersMiddleware)

    allowed_origins = sorted({settings.FRONTEND_ORIGIN, "http://localhost:3000"})
    app.add_middleware(
        CORSMiddleware,
        allow_origins=allowed_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(api_router, prefix="/api/v1")

    @app.get("/api/v1/health")
    async def health() -> dict:
        return {"status": "ok"}

    return app


app = create_app()
