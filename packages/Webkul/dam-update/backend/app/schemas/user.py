"""User-related schemas: public User, PublicProfile, updates, stats."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: str
    username: str
    full_name: str | None = None
    avatar_url: str | None = None
    bio: str | None = None
    github_url: str | None = None
    linkedin_url: str | None = None
    website_url: str | None = None
    role: str
    is_verified: bool
    is_banned: bool
    is_suspended: bool = False
    last_login_at: datetime | None = None
    created_at: datetime


class PublicProfile(UserRead):
    followers_count: int = 0
    following_count: int = 0
    posts_count: int = 0
    is_following: bool = False


class UserUpdate(BaseModel):
    full_name: str | None = None
    bio: str | None = None
    avatar_url: str | None = None
    github_url: str | None = None
    linkedin_url: str | None = None
    website_url: str | None = None


class WeeklyViewPoint(BaseModel):
    date: str
    count: int


class MonthlyEngagementPoint(BaseModel):
    date: str
    views: int
    likes: int
    comments: int


class RecentActivityItem(BaseModel):
    action: str
    detail: str
    created_at: datetime


class UserStats(BaseModel):
    posts: int = 0
    views: int = 0
    likes: int = 0
    bookmarks: int = 0
    downloads: int = 0
    weekly_views: list[WeeklyViewPoint] = Field(default_factory=list)
    monthly_engagement: list[MonthlyEngagementPoint] = Field(default_factory=list)
    recent_activity: list[RecentActivityItem] = Field(default_factory=list)
