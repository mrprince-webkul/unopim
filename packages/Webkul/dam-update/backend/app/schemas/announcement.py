"""Category, Attachment, and Announcement schemas."""

from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.user import UserRead


class CategoryRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    slug: str
    description: str | None = None
    icon: str | None = None
    color: str | None = None
    position: int = 0
    is_hidden: bool = False
    is_featured: bool = False
    posts_count: int = 0


class AttachmentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    url: str
    filename: str
    original_name: str
    content_type: str
    size: int
    downloads_count: int = 0


class AnnouncementBase(BaseModel):
    title: str | None = None
    description: str | None = None
    content: str | None = None
    category_id: int | None = None
    tags: list[str] | None = None
    thumbnail_url: str | None = None
    github_url: str | None = None
    website_url: str | None = None
    demo_url: str | None = None
    cta_label: str | None = None
    cta_url: str | None = None
    status: Literal["draft", "published"] | None = None
    publish_date: datetime | None = None
    attachment_ids: list[int] | None = None


class AnnouncementCreate(AnnouncementBase):
    title: str = Field(min_length=1, max_length=255)
    description: str = Field(min_length=1)
    content: str = Field(min_length=1)
    status: Literal["draft", "published"] = "draft"


class AnnouncementUpdate(AnnouncementBase):
    """All fields optional for PATCH-like PUT semantics."""


class AnnouncementRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    slug: str
    description: str
    content: str
    thumbnail_url: str | None = None
    author: UserRead
    category: CategoryRead | None = None
    tags: list[str] = Field(default_factory=list)
    github_url: str | None = None
    website_url: str | None = None
    demo_url: str | None = None
    cta_label: str | None = None
    cta_url: str | None = None
    status: str
    is_pinned: bool
    is_featured: bool
    publish_date: datetime
    created_at: datetime
    updated_at: datetime
    views_count: int
    likes_count: int
    comments_count: int
    bookmarks_count: int
    attachments: list[AttachmentRead] = Field(default_factory=list)
    is_liked: bool = False
    is_bookmarked: bool = False
    reading_time: int = 1


class LikeResponse(BaseModel):
    likes_count: int
    is_liked: bool


class BookmarkResponse(BaseModel):
    bookmarks_count: int
    is_bookmarked: bool
