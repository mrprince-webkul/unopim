"""Attachment (uploaded file) model."""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import BigInteger, DateTime, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Attachment(Base):
    __tablename__ = "attachments"

    id: Mapped[int] = mapped_column(primary_key=True)
    uploader_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    announcement_id: Mapped[int | None] = mapped_column(
        ForeignKey("announcements.id", ondelete="SET NULL"), index=True, nullable=True
    )

    key: Mapped[str] = mapped_column(String(500), nullable=False)  # object storage key
    url: Mapped[str] = mapped_column(String(1000), nullable=False)
    filename: Mapped[str] = mapped_column(String(500), nullable=False)  # stored name
    original_name: Mapped[str] = mapped_column(String(500), nullable=False)
    content_type: Mapped[str] = mapped_column(String(200), nullable=False)
    size: Mapped[int] = mapped_column(BigInteger, nullable=False)
    downloads_count: Mapped[int] = mapped_column(Integer, default=0, server_default="0")

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    announcement: Mapped[Announcement | None] = relationship(  # noqa: F821
        "Announcement", back_populates="attachments"
    )
