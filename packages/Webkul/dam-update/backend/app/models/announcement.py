"""Announcement, Tag, Like, and Bookmark models."""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Table,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.types import TSVectorType

announcement_tags = Table(
    "announcement_tags",
    Base.metadata,
    Column("announcement_id", ForeignKey("announcements.id", ondelete="CASCADE"), primary_key=True),
    Column("tag_id", ForeignKey("tags.id", ondelete="CASCADE"), primary_key=True),
)


class Tag(Base):
    __tablename__ = "tags"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(60), unique=True, nullable=False)
    slug: Mapped[str] = mapped_column(String(80), unique=True, index=True, nullable=False)


class Announcement(Base):
    __tablename__ = "announcements"

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    slug: Mapped[str] = mapped_column(String(280), unique=True, index=True, nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    thumbnail_url: Mapped[str | None] = mapped_column(String(1000))

    author_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    category_id: Mapped[int | None] = mapped_column(
        ForeignKey("categories.id", ondelete="SET NULL"), index=True
    )

    github_url: Mapped[str | None] = mapped_column(String(500))
    website_url: Mapped[str | None] = mapped_column(String(500))
    demo_url: Mapped[str | None] = mapped_column(String(500))
    cta_label: Mapped[str | None] = mapped_column(String(100))
    cta_url: Mapped[str | None] = mapped_column(String(500))

    status: Mapped[str] = mapped_column(
        String(20), default="draft", server_default="draft", index=True
    )
    is_pinned: Mapped[bool] = mapped_column(Boolean, default=False, server_default="0")
    is_featured: Mapped[bool] = mapped_column(Boolean, default=False, server_default="0")
    publish_date: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
    # Soft delete: a non-null timestamp hides the row from all public feeds but
    # keeps it recoverable from the admin "trash".
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    views_count: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    likes_count: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    comments_count: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    bookmarks_count: Mapped[int] = mapped_column(Integer, default=0, server_default="0")

    search_vector: Mapped[str | None] = mapped_column(TSVectorType, nullable=True)

    # `lazy="selectin"` on the relationships below is required (not just an
    # optimization): they're always part of the API response shape, and
    # SQLAlchemy's asyncio extension can't do classic lazy-loading on
    # attribute access, so anything serialized must be eagerly loaded.
    author: Mapped[User] = relationship(  # noqa: F821
        "User", back_populates="announcements", foreign_keys=[author_id], lazy="selectin"
    )
    category: Mapped[Category | None] = relationship("Category", lazy="selectin")  # noqa: F821
    tags: Mapped[list[Tag]] = relationship("Tag", secondary=announcement_tags, lazy="selectin")
    attachments: Mapped[list[Attachment]] = relationship(  # noqa: F821
        "Attachment", back_populates="announcement", lazy="selectin"
    )
    comments: Mapped[list[Comment]] = relationship(  # noqa: F821
        "Comment", back_populates="announcement", cascade="all, delete-orphan"
    )


class Like(Base):
    __tablename__ = "likes"
    __table_args__ = (UniqueConstraint("user_id", "announcement_id", name="uq_like_pair"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    announcement_id: Mapped[int] = mapped_column(
        ForeignKey("announcements.id", ondelete="CASCADE"), index=True
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Bookmark(Base):
    __tablename__ = "bookmarks"
    __table_args__ = (UniqueConstraint("user_id", "announcement_id", name="uq_bookmark_pair"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    announcement_id: Mapped[int] = mapped_column(
        ForeignKey("announcements.id", ondelete="CASCADE"), index=True
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
