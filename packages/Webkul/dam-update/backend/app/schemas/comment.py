"""Comment schemas — one level of nesting via `replies`."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.user import UserRead


class CommentCreate(BaseModel):
    content: str = Field(min_length=1)
    parent_id: int | None = None


class CommentUpdate(BaseModel):
    content: str = Field(min_length=1)


class CommentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    content: str
    author: UserRead
    announcement_id: int
    parent_id: int | None = None
    is_hidden: bool
    created_at: datetime
    replies: list[CommentRead] = Field(default_factory=list)


CommentRead.model_rebuild()
