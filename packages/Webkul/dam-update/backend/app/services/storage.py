"""Object storage service backed by MinIO.

The MinIO client is synchronous, so calls are offloaded to a thread via
`asyncio.to_thread`. All failures are logged and tolerated (never crash the
app on storage hiccups) except for the actual upload, which the caller
surfaces to the client as a 502.
"""

from __future__ import annotations

import io
import json
import logging

from minio import Minio
from minio.error import S3Error

from app.core.config import settings

logger = logging.getLogger("devannounce.storage")


class StorageService:
    """Thin async wrapper around the MinIO client used for uploads/attachments."""

    def __init__(self) -> None:
        self._client = Minio(
            settings.MINIO_ENDPOINT,
            access_key=settings.MINIO_ACCESS_KEY,
            secret_key=settings.MINIO_SECRET_KEY,
            secure=settings.MINIO_SECURE,
        )
        self.bucket = settings.MINIO_BUCKET

    async def ensure_bucket(self) -> None:
        """Create the bucket (if missing) and set an anonymous-download policy.

        Tolerates any failure — MinIO may not be reachable in some
        environments (e.g. tests), and the app should still boot.
        """
        import asyncio

        try:
            await asyncio.to_thread(self._ensure_bucket_sync)
        except Exception as exc:  # noqa: BLE001
            logger.warning("Could not ensure MinIO bucket %r: %s", self.bucket, exc)

    def _ensure_bucket_sync(self) -> None:
        if not self._client.bucket_exists(self.bucket):
            self._client.make_bucket(self.bucket)
        policy = {
            "Version": "2012-10-17",
            "Statement": [
                {
                    "Effect": "Allow",
                    "Principal": {"AWS": ["*"]},
                    "Action": ["s3:GetObject"],
                    "Resource": [f"arn:aws:s3:::{self.bucket}/*"],
                }
            ],
        }
        self._client.set_bucket_policy(self.bucket, json.dumps(policy))

    async def upload(self, key: str, data: bytes, content_type: str) -> str:
        """Upload `data` under `key`, returning the public URL."""
        import asyncio

        def _put() -> None:
            self._client.put_object(
                self.bucket,
                key,
                io.BytesIO(data),
                length=len(data),
                content_type=content_type,
            )

        try:
            await asyncio.to_thread(_put)
        except S3Error as exc:
            logger.error("MinIO upload failed for key %r: %s", key, exc)
            raise
        return self.public_url(key)

    def public_url(self, key: str) -> str:
        return f"{settings.MINIO_PUBLIC_URL}/{self.bucket}/{key}"


storage_service = StorageService()
