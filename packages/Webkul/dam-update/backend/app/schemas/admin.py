"""Admin-only schemas: settings, activity logs, stats, category CRUD."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.user import UserRead


class SiteSettingRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    key: str
    value: str
    description: str
    is_secret: bool


class SiteSettingsUpdate(BaseModel):
    settings: dict[str, str]


class ActivityLogRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user: UserRead | None = None
    action: str
    detail: str
    created_at: datetime


class DateCount(BaseModel):
    date: str
    count: int


class CategoryCountPoint(BaseModel):
    name: str
    count: int


class EngagementStats(BaseModel):
    likes: int = 0
    comments: int = 0
    bookmarks: int = 0
    views: int = 0


class AdminStats(BaseModel):
    users: int
    active_users: int = 0
    new_users_today: int = 0
    posts: int
    comments: int
    news_count: int
    downloads: int
    storage_bytes: int
    files_count: int
    user_growth: list[DateCount] = Field(default_factory=list)
    posts_per_day: list[DateCount] = Field(default_factory=list)
    popular_categories: list[CategoryCountPoint] = Field(default_factory=list)
    engagement: EngagementStats


class CategoryCreate(BaseModel):
    name: str
    description: str | None = None
    icon: str | None = None
    color: str | None = None


class CategoryUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    icon: str | None = None
    color: str | None = None
    position: int | None = None
    is_hidden: bool | None = None
    is_featured: bool | None = None


class CategoryReorder(BaseModel):
    order: list[int]  # category ids in the desired display order


class NewsFetchResult(BaseModel):
    imported: int
    message: str
