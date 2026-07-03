"""Announcement CRUD, permissions, and like/bookmark toggle tests."""

from __future__ import annotations

from httpx import AsyncClient

from tests.conftest import auth_headers, register_and_login

SAMPLE_CONTENT = "This is a reasonably long body of content. " * 20


async def _create_announcement(client: AsyncClient, headers: dict, **overrides) -> dict:
    payload = {
        "title": overrides.get("title", "My First Announcement"),
        "description": overrides.get("description", "A short description"),
        "content": overrides.get("content", SAMPLE_CONTENT),
        "status": overrides.get("status", "published"),
        "tags": overrides.get("tags", ["testing", "python"]),
    }
    resp = await client.post("/api/v1/announcements", json=payload, headers=headers)
    assert resp.status_code == 201, resp.text
    return resp.json()


async def test_create_list_detail_update_delete(client: AsyncClient) -> None:
    tokens = await register_and_login(client, username="author1")
    headers = auth_headers(tokens["access_token"])

    created = await _create_announcement(client, headers)
    assert created["tags"] == ["testing", "python"]
    assert created["status"] == "published"
    assert created["author"]["username"] == "author1"
    assert created["reading_time"] >= 1
    announcement_id = created["id"]
    slug = created["slug"]

    list_resp = await client.get("/api/v1/announcements")
    assert list_resp.status_code == 200
    body = list_resp.json()
    assert body["page"] == 1
    assert body["size"] == 10
    assert any(item["id"] == announcement_id for item in body["items"])

    detail_resp = await client.get(f"/api/v1/announcements/{slug}")
    assert detail_resp.status_code == 200
    assert detail_resp.json()["views_count"] == 1

    # Viewing again from the same client shouldn't double-count within the dedupe window.
    detail_resp_2 = await client.get(f"/api/v1/announcements/{slug}")
    assert detail_resp_2.json()["views_count"] == 1

    update_resp = await client.put(
        f"/api/v1/announcements/{announcement_id}", json={"title": "Updated Title"}, headers=headers
    )
    assert update_resp.status_code == 200
    assert update_resp.json()["title"] == "Updated Title"
    assert update_resp.json()["slug"] != slug

    other_tokens = await register_and_login(client, username="author2")
    other_headers = auth_headers(other_tokens["access_token"])

    forbidden_update = await client.put(
        f"/api/v1/announcements/{announcement_id}", json={"title": "Hacked"}, headers=other_headers
    )
    assert forbidden_update.status_code == 403

    forbidden_delete = await client.delete(
        f"/api/v1/announcements/{announcement_id}", headers=other_headers
    )
    assert forbidden_delete.status_code == 403

    delete_resp = await client.delete(f"/api/v1/announcements/{announcement_id}", headers=headers)
    assert delete_resp.status_code == 204

    missing_resp = await client.get(f"/api/v1/announcements/{update_resp.json()['slug']}")
    assert missing_resp.status_code == 404


async def test_like_and_bookmark_toggle(client: AsyncClient) -> None:
    author_tokens = await register_and_login(client, username="author3")
    author_headers = auth_headers(author_tokens["access_token"])
    created = await _create_announcement(client, author_headers, title="Likeable Post")
    announcement_id = created["id"]

    liker_tokens = await register_and_login(client, username="liker1")
    liker_headers = auth_headers(liker_tokens["access_token"])

    like_resp = await client.post(
        f"/api/v1/announcements/{announcement_id}/like", headers=liker_headers
    )
    assert like_resp.status_code == 200
    assert like_resp.json() == {"likes_count": 1, "is_liked": True}

    like_again = await client.post(
        f"/api/v1/announcements/{announcement_id}/like", headers=liker_headers
    )
    assert like_again.json()["likes_count"] == 1  # idempotent, no duplicate like

    unlike_resp = await client.delete(
        f"/api/v1/announcements/{announcement_id}/like", headers=liker_headers
    )
    assert unlike_resp.status_code == 200
    assert unlike_resp.json() == {"likes_count": 0, "is_liked": False}

    bookmark_resp = await client.post(
        f"/api/v1/announcements/{announcement_id}/bookmark", headers=liker_headers
    )
    assert bookmark_resp.json() == {"bookmarks_count": 1, "is_bookmarked": True}

    unbookmark_resp = await client.delete(
        f"/api/v1/announcements/{announcement_id}/bookmark", headers=liker_headers
    )
    assert unbookmark_resp.json() == {"bookmarks_count": 0, "is_bookmarked": False}


async def test_draft_hidden_from_listing_and_strangers(client: AsyncClient) -> None:
    author_tokens = await register_and_login(client, username="draftauthor")
    author_headers = auth_headers(author_tokens["access_token"])
    created = await _create_announcement(
        client, author_headers, title="Secret Draft", status="draft"
    )

    list_resp = await client.get("/api/v1/announcements")
    assert all(item["id"] != created["id"] for item in list_resp.json()["items"])

    other_tokens = await register_and_login(client, username="stranger")
    other_headers = auth_headers(other_tokens["access_token"])
    stranger_resp = await client.get(
        f"/api/v1/announcements/{created['slug']}", headers=other_headers
    )
    assert stranger_resp.status_code == 404

    owner_resp = await client.get(
        f"/api/v1/announcements/{created['slug']}", headers=author_headers
    )
    assert owner_resp.status_code == 200
