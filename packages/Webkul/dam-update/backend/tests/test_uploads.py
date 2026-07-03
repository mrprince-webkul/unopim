"""Upload tests — storage is mocked in conftest.py, no MinIO required."""

from __future__ import annotations

from httpx import AsyncClient

from tests.conftest import auth_headers, register_and_login


async def test_upload_rejects_disallowed_extension(client: AsyncClient) -> None:
    tokens = await register_and_login(client, username="uploader1")
    headers = auth_headers(tokens["access_token"])

    files = {"file": ("malware.exe", b"fake binary content", "application/octet-stream")}
    resp = await client.post("/api/v1/uploads", files=files, headers=headers)
    assert resp.status_code == 400
    assert "detail" in resp.json()


async def test_upload_rejects_oversized_file(client: AsyncClient) -> None:
    tokens = await register_and_login(client, username="uploader2")
    headers = auth_headers(tokens["access_token"])

    oversized = b"a" * (25 * 1024 * 1024 + 1024)  # just over the 25 MB limit
    files = {"file": ("big.txt", oversized, "text/plain")}
    resp = await client.post("/api/v1/uploads", files=files, headers=headers)
    assert resp.status_code == 413


async def test_upload_success_with_mocked_storage(client: AsyncClient) -> None:
    tokens = await register_and_login(client, username="uploader3")
    headers = auth_headers(tokens["access_token"])

    content = b"hello world"
    files = {"file": ("readme.txt", content, "text/plain")}
    resp = await client.post("/api/v1/uploads", files=files, headers=headers)
    assert resp.status_code == 201, resp.text
    data = resp.json()
    assert data["original_name"] == "readme.txt"
    assert data["size"] == len(content)
    assert data["url"].startswith("http://mock-storage.local/uploads/")
    assert data["downloads_count"] == 0

    download_resp = await client.get(
        f"/api/v1/uploads/{data['id']}/download", follow_redirects=False
    )
    assert download_resp.status_code == 302
    assert download_resp.headers["location"] == data["url"]


async def test_upload_requires_auth(client: AsyncClient) -> None:
    files = {"file": ("readme.txt", b"hi", "text/plain")}
    resp = await client.post("/api/v1/uploads", files=files)
    assert resp.status_code == 401
