"""Comment model (one level of nesting via parent_id)."""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Comment(Base):
    __tablename__ = "comments"

    id: Mapped[int] = mapped_column(primary_key=True)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    author_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    announcement_id: Mapped[int] = mapped_column(
        ForeignKey("announcements.id", ondelete="CASCADE"), index=True
    )
    parent_id: Mapped[int | None] = mapped_column(
        ForeignKey("comments.id", ondelete="CASCADE"), index=True, nullable=True
    )
    is_hidden: Mapped[bool] = mapped_column(Boolean, default=False, server_default="0")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    # `lazy="selectin"` because `author` is always part of the serialized
    # response and SQLAlchemy's asyncio extension can't classic-lazy-load.
    author: Mapped[User] = relationship(  # noqa: F821
        "User", back_populates="comments", lazy="selectin"
    )
    announcement: Mapped[Announcement] = relationship(  # noqa: F821
        "Announcement", back_populates="comments"
    )
    # NOTE: `replies` intentionally does NOT set lazy="selectin" as a mapper
    # default — for self-referential relationships SQLAlchemy's asyncio
    # extension does not reliably auto-apply the default eager strategy at
    # query time. Callers that need `.replies` populated must explicitly add
    # `.options(selectinload(Comment.replies))` to their query (see
    # app.api.v1.announcements.list_comments) or avoid touching the
    # attribute (e.g. use a COUNT query instead).
    replies: Mapped[list[Comment]] = relationship(
        "Comment", back_populates="parent", cascade="all, delete-orphan"
    )
    parent: Mapped[Comment | None] = relationship(
        "Comment", back_populates="replies", remote_side=[id]
    )
