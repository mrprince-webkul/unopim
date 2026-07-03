"""Standalone comment mutations: edit own comment, delete (author or admin)."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.api.v1.announcements import build_comment_read
from app.core.database import get_db
from app.models.announcement import Announcement
from app.models.comment import Comment
from app.models.user import User
from app.schemas.comment import CommentRead, CommentUpdate

router = APIRouter()


async def _get_comment_or_404(db: AsyncSession, comment_id: int) -> Comment:
    comment = (
        await db.execute(select(Comment).where(Comment.id == comment_id))
    ).scalar_one_or_none()
    if comment is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Comment not found")
    return comment


@router.put("/{comment_id}", response_model=CommentRead)
async def update_comment(
    comment_id: int,
    payload: CommentUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> CommentRead:
    comment = await _get_comment_or_404(db, comment_id)
    if comment.author_id != user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="You can only edit your own comments"
        )
    comment.content = payload.content
    await db.commit()
    await db.refresh(comment)
    return build_comment_read(comment, [])


@router.delete("/{comment_id}", status_code=status.HTTP_204_NO_CONTENT, response_model=None)
async def delete_comment(
    comment_id: int, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)
) -> None:
    comment = await _get_comment_or_404(db, comment_id)
    if comment.author_id != user.id and user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to delete this comment",
        )
    announcement = (
        await db.execute(select(Announcement).where(Announcement.id == comment.announcement_id))
    ).scalar_one_or_none()
    if announcement is not None:
        # Deleting a top-level comment cascades to its replies (see model
        # cascade="all, delete-orphan"); decrement the counter accordingly.
        # (A plain COUNT query, rather than `len(comment.replies)`, since
        # self-referential relationships don't reliably eager-load here.)
        reply_count = (
            await db.execute(
                select(func.count()).select_from(Comment).where(Comment.parent_id == comment.id)
            )
        ).scalar_one()
        removed = 1 + reply_count
        announcement.comments_count = max(0, announcement.comments_count - removed)
    await db.delete(comment)
    await db.commit()
