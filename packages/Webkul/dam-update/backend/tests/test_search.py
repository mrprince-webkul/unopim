"""Search tests — exercised against SQLite, so this covers the ILIKE fallback path."""

from __future__ import annotations

from httpx import AsyncClient

from tests.conftest import auth_headers, register_and_login

SAMPLE_CONTENT = "Body content for the searchable announcement. " * 10


async def test_search_fallback_returns_seeded_announcement(client: AsyncClient) -> None:
    tokens = await register_and_login(client, username="searchauthor")
    headers = auth_headers(tokens["access_token"])
    create_resp = await client.post(
        "/api/v1/announcements",
        json={
            "title": "Unique Searchable Title About Widgets",
            "description": "Description mentioning widgets explicitly",
            "content": SAMPLE_CONTENT,
            "status": "published",
        },
        headers=headers,
    )
    assert create_resp.status_code == 201

    resp = await client.get("/api/v1/search", params={"q": "widgets", "type": "announcements"})
    assert resp.status_code == 200
    body = resp.json()
    assert body["announcements"]["total"] >= 1
    assert any("Widgets" in item["title"] for item in body["announcements"]["items"])
    assert body["news"]["items"] == []
    assert body["users"]["items"] == []


async def test_search_type_all_populates_all_sections(client: AsyncClient) -> None:
    resp = await client.get("/api/v1/search", params={"q": "", "type": "all"})
    assert resp.status_code == 200
    body = resp.json()
    assert set(body.keys()) == {"announcements", "news", "users"}
    for section in body.values():
        assert {"items", "total", "page", "pages", "size"} <= set(section.keys())


async def test_search_no_match_returns_empty(client: AsyncClient) -> None:
    resp = await client.get(
        "/api/v1/search", params={"q": "zzzznonexistentzzzz", "type": "announcements"}
    )
    assert resp.status_code == 200
    assert resp.json()["announcements"]["items"] == []
    assert resp.json()["announcements"]["total"] == 0
