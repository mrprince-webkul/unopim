"""Comment creation, one-level nesting, and edit/delete permission tests."""

from __future__ import annotations

from httpx import AsyncClient

from tests.conftest import auth_headers, register_and_login

SAMPLE_CONTENT = "Body content for the announcement under test. " * 10


async def _create_announcement(client: AsyncClient, headers: dict, title: str) -> dict:
    resp = await client.post(
        "/api/v1/announcements",
        json={
            "title": title,
            "description": "desc",
            "content": SAMPLE_CONTENT,
            "status": "published",
        },
        headers=headers,
    )
    assert resp.status_code == 201, resp.text
    return resp.json()


async def test_comment_create_and_one_level_nesting(client: AsyncClient) -> None:
    author_tokens = await register_and_login(client, username="postauthor")
    author_headers = auth_headers(author_tokens["access_token"])
    announcement = await _create_announcement(client, author_headers, "Post With Comments")
    announcement_id = announcement["id"]

    commenter_tokens = await register_and_login(client, username="commenter1")
    commenter_headers = auth_headers(commenter_tokens["access_token"])

    top_resp = await client.post(
        f"/api/v1/announcements/{announcement_id}/comments",
        json={"content": "Great post!"},
        headers=commenter_headers,
    )
    assert top_resp.status_code == 201
    top_comment = top_resp.json()
    assert top_comment["content"] == "Great post!"
    assert top_comment["replies"] == []
    assert top_comment["parent_id"] is None

    replier_tokens = await register_and_login(client, username="replier1")
    replier_headers = auth_headers(replier_tokens["access_token"])
    reply_resp = await client.post(
        f"/api/v1/announcements/{announcement_id}/comments",
        json={"content": "I agree!", "parent_id": top_comment["id"]},
        headers=replier_headers,
    )
    assert reply_resp.status_code == 201
    assert reply_resp.json()["parent_id"] == top_comment["id"]

    list_resp = await client.get(f"/api/v1/announcements/{announcement_id}/comments")
    assert list_resp.status_code == 200
    body = list_resp.json()
    assert body["total"] == 1  # only the top-level comment is counted at this level
    assert len(body["items"][0]["replies"]) == 1
    assert body["items"][0]["replies"][0]["content"] == "I agree!"

    # invalid parent_id is rejected
    bad_reply = await client.post(
        f"/api/v1/announcements/{announcement_id}/comments",
        json={"content": "orphan reply", "parent_id": 999999},
        headers=replier_headers,
    )
    assert bad_reply.status_code == 400


async def test_comment_edit_and_delete_permissions(client: AsyncClient) -> None:
    author_tokens = await register_and_login(client, username="postauthor2")
    author_headers = auth_headers(author_tokens["access_token"])
    announcement = await _create_announcement(client, author_headers, "Another Post")
    announcement_id = announcement["id"]

    commenter_tokens = await register_and_login(client, username="commenter2")
    commenter_headers = auth_headers(commenter_tokens["access_token"])
    comment_resp = await client.post(
        f"/api/v1/announcements/{announcement_id}/comments",
        json={"content": "Original comment"},
        headers=commenter_headers,
    )
    comment_id = comment_resp.json()["id"]

    other_tokens = await register_and_login(client, username="rando")
    other_headers = auth_headers(other_tokens["access_token"])

    forbidden_edit = await client.put(
        f"/api/v1/comments/{comment_id}", json={"content": "Hacked"}, headers=other_headers
    )
    assert forbidden_edit.status_code == 403

    edit_resp = await client.put(
        f"/api/v1/comments/{comment_id}",
        json={"content": "Edited comment"},
        headers=commenter_headers,
    )
    assert edit_resp.status_code == 200
    assert edit_resp.json()["content"] == "Edited comment"

    forbidden_delete = await client.delete(f"/api/v1/comments/{comment_id}", headers=other_headers)
    assert forbidden_delete.status_code == 403

    delete_resp = await client.delete(f"/api/v1/comments/{comment_id}", headers=commenter_headers)
    assert delete_resp.status_code == 204
