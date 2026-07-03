"""Admin tests: settings masking + masked-update-ignored, and ban blocking login."""

from __future__ import annotations

from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import hash_password
from app.models.user import User
from tests.conftest import auth_headers, register_and_login


async def _create_admin(db_session: AsyncSession, username: str = "admin1") -> None:
    admin = User(
        email=f"{username}@example.com",
        username=username,
        password_hash=hash_password("password123"),
        role="admin",
        is_verified=True,
    )
    db_session.add(admin)
    await db_session.commit()


async def _admin_headers(client: AsyncClient, username: str = "admin1") -> dict:
    resp = await client.post(
        "/api/v1/auth/login", json={"email_or_username": username, "password": "password123"}
    )
    assert resp.status_code == 200, resp.text
    return auth_headers(resp.json()["access_token"])


async def test_settings_masking_and_masked_update_ignored(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    await _create_admin(db_session)
    headers = await _admin_headers(client)

    get_resp = await client.get("/api/v1/admin/settings", headers=headers)
    assert get_resp.status_code == 200
    settings_by_key = {s["key"]: s for s in get_resp.json()}
    assert settings_by_key["ANTHROPIC_API_KEY"]["is_secret"] is True
    assert settings_by_key["ANTHROPIC_API_KEY"]["value"] == ""  # empty secret stays empty
    assert settings_by_key["NEWS_FETCH_ENABLED"]["value"] == "true"

    secret_value = "sk-ant-1234567890abcdef"
    update_resp = await client.put(
        "/api/v1/admin/settings",
        json={"settings": {"ANTHROPIC_API_KEY": secret_value}},
        headers=headers,
    )
    assert update_resp.status_code == 200
    updated = {s["key"]: s for s in update_resp.json()}
    masked_value = updated["ANTHROPIC_API_KEY"]["value"]
    assert masked_value != secret_value
    assert masked_value.startswith("sk-a")
    assert masked_value.endswith("ef")
    assert "•" in masked_value

    # Re-submitting the masked (already-bulleted) value must NOT clobber the real secret.
    reput_resp = await client.put(
        "/api/v1/admin/settings",
        json={"settings": {"ANTHROPIC_API_KEY": masked_value}},
        headers=headers,
    )
    assert reput_resp.status_code == 200
    reput_updated = {s["key"]: s for s in reput_resp.json()}
    assert reput_updated["ANTHROPIC_API_KEY"]["value"] == masked_value


async def test_admin_ban_blocks_login(client: AsyncClient, db_session: AsyncSession) -> None:
    await _create_admin(db_session)
    headers = await _admin_headers(client)

    user_tokens = await register_and_login(client, username="bannedguy")
    user_id = user_tokens["user"]["id"]

    ban_resp = await client.post(f"/api/v1/admin/users/{user_id}/ban", headers=headers)
    assert ban_resp.status_code == 200
    assert ban_resp.json()["is_banned"] is True

    login_after_ban = await client.post(
        "/api/v1/auth/login", json={"email_or_username": "bannedguy", "password": "password123"}
    )
    assert login_after_ban.status_code == 403

    unban_resp = await client.post(f"/api/v1/admin/users/{user_id}/unban", headers=headers)
    assert unban_resp.status_code == 200
    assert unban_resp.json()["is_banned"] is False

    login_after_unban = await client.post(
        "/api/v1/auth/login", json={"email_or_username": "bannedguy", "password": "password123"}
    )
    assert login_after_unban.status_code == 200


async def test_non_admin_cannot_access_admin_routes(client: AsyncClient) -> None:
    tokens = await register_and_login(client, username="regularjoe")
    headers = auth_headers(tokens["access_token"])
    resp = await client.get("/api/v1/admin/stats", headers=headers)
    assert resp.status_code == 403
