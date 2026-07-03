"""File uploads: multipart upload to MinIO + tracked downloads."""

from __future__ import annotations

import mimetypes
import uuid

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from fastapi.responses import RedirectResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.analytics import AnalyticsEvent
from app.models.attachment import Attachment
from app.models.user import User
from app.schemas.announcement import AttachmentRead
from app.services.storage import storage_service

router = APIRouter()

MAX_UPLOAD_BYTES = 25 * 1024 * 1024  # 25 MB
CHUNK_SIZE = 1024 * 1024
ALLOWED_EXTENSIONS = {
    "png",
    "jpg",
    "jpeg",
    "gif",
    "webp",
    "svg",
    "pdf",
    "doc",
    "docx",
    "xls",
    "xlsx",
    "ppt",
    "pptx",
    "zip",
    "md",
    "txt",
    "csv",
}


@router.post("", response_model=AttachmentRead, status_code=status.HTTP_201_CREATED)
async def upload_file(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> Attachment:
    original_name = file.filename or "file"
    ext = original_name.rsplit(".", 1)[-1].lower() if "." in original_name else ""
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File type '.{ext}' is not allowed",
        )

    # Read in chunks so we never buffer more than MAX_UPLOAD_BYTES + 1 chunk
    # in memory before rejecting an oversized upload.
    chunks: list[bytes] = []
    total_size = 0
    while True:
        chunk = await file.read(CHUNK_SIZE)
        if not chunk:
            break
        total_size += len(chunk)
        if total_size > MAX_UPLOAD_BYTES:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail="File exceeds the maximum size of 25 MB",
            )
        chunks.append(chunk)
    await file.close()
    data = b"".join(chunks)

    content_type = (
        file.content_type or mimetypes.guess_type(original_name)[0] or "application/octet-stream"
    )
    key = f"uploads/{uuid.uuid4().hex}.{ext}"

    try:
        url = await storage_service.upload(key, data, content_type)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY, detail="Failed to store uploaded file"
        ) from exc

    attachment = Attachment(
        uploader_id=user.id,
        key=key,
        url=url,
        filename=key.split("/")[-1],
        original_name=original_name,
        content_type=content_type,
        size=total_size,
    )
    db.add(attachment)
    await db.commit()
    await db.refresh(attachment)
    return attachment


@router.get("/{attachment_id}/download")
async def download_attachment(attachment_id: int, db: AsyncSession = Depends(get_db)):
    attachment = (
        await db.execute(select(Attachment).where(Attachment.id == attachment_id))
    ).scalar_one_or_none()
    if attachment is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Attachment not found")

    attachment.downloads_count += 1
    db.add(
        AnalyticsEvent(
            event_type="download",
            announcement_id=attachment.announcement_id,
            user_id=None,
        )
    )
    await db.commit()
    return RedirectResponse(url=attachment.url, status_code=status.HTTP_302_FOUND)
