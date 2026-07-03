"""Shared pytest fixtures.

Builds the app against an in-memory SQLite database (StaticPool, so all
connections share the same DB), overrides the `get_db` dependency, mocks
the MinIO storage service, and disables rate limiting (ENVIRONMENT=test).
No external services (Postgres, Redis, MinIO) are required to run these
tests.
"""

from __future__ import annotations

import os

# Must be set before importing anything under `app`, since settings are
# read once at import time.
os.environ.setdefault("ENVIRONMENT", "test")
os.environ.setdefault("DATABASE_URL", "sqlite+aiosqlite:///:memory:")
os.environ.setdefault("JWT_SECRET", "test-secret-key")
os.environ.setdefault("SEED_DEMO_DATA", "false")
os.environ.setdefault("FRONTEND_ORIGIN", "http://localhost:3000")
# Point at an unreachable local port so Redis-dependent helpers fail fast
# (connection refused) and fall back to the in-process store, instead of
# hanging on a DNS lookup for the docker-compose hostname "redis".
os.environ.setdefault("REDIS_URL", "redis://127.0.0.1:6399/0")

from collections.abc import AsyncGenerator  # noqa: E402

import pytest_asyncio  # noqa: E402
from httpx import ASGITransport, AsyncClient  # noqa: E402
from sqlalchemy.ext.asyncio import AsyncSession  # noqa: E402

import app.models  # noqa: E402,F401  (ensures all tables are registered on Base.metadata)
from app.core.database import AsyncSessionLocal, Base, engine, get_db  # noqa: E402
from app.main import app  # noqa: E402
from app.services import storage as storage_module  # noqa: E402


@pytest_asyncio.fixture(autouse=True)
async def _reset_database() -> AsyncGenerator[None, None]:
    """Recreate a clean schema before every test for full isolation."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    yield


@pytest_asyncio.fixture
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        yield session


@pytest_asyncio.fixture
async def client(monkeypatch) -> AsyncGenerator[AsyncClient, None]:
    async def override_get_db() -> AsyncGenerator[AsyncSession, None]:
        async with AsyncSessionLocal() as session:
            yield session

    app.dependency_overrides[get_db] = override_get_db

    async def fake_upload(key: str, data: bytes, content_type: str) -> str:
        return f"http://mock-storage.local/{key}"

    async def fake_ensure_bucket() -> None:
        return None

    monkeypatch.setattr(storage_module.storage_service, "upload", fake_upload)
    monkeypatch.setattr(storage_module.storage_service, "ensure_bucket", fake_ensure_bucket)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

    app.dependency_overrides.clear()


async def register_and_login(client: AsyncClient, username: str = "testuser", **overrides) -> dict:
    """Helper: register + login a user, returning `{access_token, user}`."""
    payload = {
        "email": overrides.get("email", f"{username}@example.com"),
        "username": username,
        "password": overrides.get("password", "password123"),
        "full_name": overrides.get("full_name", username.title()),
    }
    resp = await client.post("/api/v1/auth/register", json=payload)
    assert resp.status_code == 201, resp.text

    login_resp = await client.post(
        "/api/v1/auth/login",
        json={"email_or_username": username, "password": payload["password"]},
    )
    assert login_resp.status_code == 200, login_resp.text
    return login_resp.json()


def auth_headers(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}
