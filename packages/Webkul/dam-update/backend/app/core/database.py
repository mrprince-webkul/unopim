"""Async SQLAlchemy engine, session factory, and declarative base."""

from collections.abc import AsyncGenerator
from typing import Any

from sqlalchemy import Select, func, select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.core.config import settings


class Base(DeclarativeBase):
    """Declarative base for all ORM models."""


def _make_engine():
    connect_args: dict[str, Any] = {}
    extra_kwargs: dict[str, Any] = {}
    if settings.DATABASE_URL.startswith("sqlite"):
        connect_args = {"check_same_thread": False}
        if ":memory:" in settings.DATABASE_URL:
            # A single shared connection is required for in-memory SQLite —
            # otherwise every checkout gets its own empty database.
            from sqlalchemy.pool import StaticPool

            extra_kwargs["poolclass"] = StaticPool
    return create_async_engine(
        settings.DATABASE_URL,
        echo=False,
        future=True,
        connect_args=connect_args,
        **extra_kwargs,
    )


engine = _make_engine()

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency yielding a database session per request."""
    async with AsyncSessionLocal() as session:
        yield session


def dialect_name(session: AsyncSession) -> str:
    """Return the SQL dialect name (`postgresql`, `sqlite`, ...) for the session's engine."""
    bind = session.bind
    sync_engine = getattr(bind, "sync_engine", bind)
    return sync_engine.dialect.name


async def fetch_page(
    session: AsyncSession, stmt: Select[Any], page: int, size: int
) -> tuple[list[Any], int]:
    """Execute an ordered SELECT with limit/offset, returning (items, total_count)."""
    count_stmt = select(func.count()).select_from(stmt.order_by(None).subquery())
    total = (await session.execute(count_stmt)).scalar_one()
    result = await session.execute(stmt.limit(size).offset((page - 1) * size))
    items = list(result.unique().scalars().all())
    return items, total
