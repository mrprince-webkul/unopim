"""Admin: storage management — list files, delete, analytics."""

from __future__ import annotations

from collections import defaultdict

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import PageParams, get_current_admin
from app.core.database import fetch_page, get_db
from app.models.attachment import Attachment
from app.models.user import User
from app.schemas.common import Paginated, paginate

router = APIRouter()


def _file_dict(a: Attachment) -> dict:
    return {
        "id": a.id,
        "original_name": a.original_name,
        "content_type": a.content_type,
        "size": a.size,
        "url": a.url,
        "downloads_count": a.downloads_count,
        "announcement_id": a.announcement_id,
        "is_orphan": a.announcement_id is None,
        "uploader_id": a.uploader_id,
        "created_at": a.created_at,
    }


@router.get("/files", response_model=Paginated[dict])
async def list_files(
    orphan: bool | None = None,
    page_params: PageParams = Depends(),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_admin),
) -> dict:
    stmt = select(Attachment)
    if orphan is True:
        stmt = stmt.where(Attachment.announcement_id.is_(None))
    elif orphan is False:
        stmt = stmt.where(Attachment.announcement_id.is_not(None))
    stmt = stmt.order_by(Attachment.created_at.desc())
    items, total = await fetch_page(db, stmt, page_params.page, page_params.size)
    return paginate([_file_dict(a) for a in items], total, page_params.page, page_params.size)


@router.delete("/files/{file_id}", status_code=status.HTTP_204_NO_CONTENT, response_model=None)
async def delete_file(
    file_id: int, db: AsyncSession = Depends(get_db), _: User = Depends(get_current_admin)
) -> None:
    att = (await db.execute(select(Attachment).where(Attachment.id == file_id))).scalar_one_or_none()
    if att is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")
    # Best-effort removal from object storage, then the DB record.
    try:
        import asyncio

        from app.services.storage import storage_service

        await asyncio.to_thread(
            storage_service._client.remove_object, storage_service.bucket, att.key
        )
    except Exception:  # noqa: BLE001
        pass
    await db.delete(att)
    await db.commit()


@router.get("/analytics")
async def storage_analytics(
    db: AsyncSession = Depends(get_db), _: User = Depends(get_current_admin)
) -> dict:
    total_bytes = (await db.execute(select(func.coalesce(func.sum(Attachment.size), 0)))).scalar_one()
    total_files = (await db.execute(select(func.count()).select_from(Attachment))).scalar_one()
    orphan_files = (
        await db.execute(
            select(func.count()).select_from(Attachment).where(Attachment.announcement_id.is_(None))
        )
    ).scalar_one()
    orphan_bytes = (
        await db.execute(
            select(func.coalesce(func.sum(Attachment.size), 0)).where(
                Attachment.announcement_id.is_(None)
            )
        )
    ).scalar_one()

    rows = (await db.execute(select(Attachment.content_type, Attachment.size))).all()
    by_type: dict[str, dict] = defaultdict(lambda: {"count": 0, "bytes": 0})
    for content_type, size in rows:
        bucket = (content_type or "other").split("/")[0]
        by_type[bucket]["count"] += 1
        by_type[bucket]["bytes"] += size or 0

    largest = (
        await db.execute(
            select(Attachment).order_by(Attachment.size.desc()).limit(5)
        )
    ).scalars().all()

    from app.services.storage import storage_service

    return {
        "total_bytes": total_bytes,
        "total_files": total_files,
        "orphan_files": orphan_files,
        "orphan_bytes": orphan_bytes,
        "provider": "minio",
        "bucket": storage_service.bucket,
        "by_type": [{"type": k, **v} for k, v in sorted(by_type.items())],
        "largest": [_file_dict(a) for a in largest],
    }
