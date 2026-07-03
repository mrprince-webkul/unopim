"""Auth flow tests: register -> login -> me -> refresh -> logout, and bad credentials."""

from __future__ import annotations

from httpx import AsyncClient

from tests.conftest import auth_headers, register_and_login


async def test_register_login_me_refresh_logout(client: AsyncClient) -> None:
    tokens = await register_and_login(client, username="alice")
    access_token = tokens["access_token"]
    assert tokens["token_type"] == "bearer"
    assert tokens["user"]["username"] == "alice"
    assert tokens["user"]["is_verified"] is False

    me_resp = await client.get("/api/v1/auth/me", headers=auth_headers(access_token))
    assert me_resp.status_code == 200
    assert me_resp.json()["username"] == "alice"

    assert "refresh_token" in client.cookies

    refresh_resp = await client.post("/api/v1/auth/refresh")
    assert refresh_resp.status_code == 200
    refreshed = refresh_resp.json()
    assert refreshed["access_token"]
    assert refreshed["user"]["username"] == "alice"

    logout_resp = await client.post("/api/v1/auth/logout")
    assert logout_resp.status_code == 200
    assert "message" in logout_resp.json()

    # Refresh token was revoked on logout.
    refresh_after_logout = await client.post("/api/v1/auth/refresh")
    assert refresh_after_logout.status_code == 401


async def test_login_wrong_password_returns_401(client: AsyncClient) -> None:
    await register_and_login(client, username="bob")

    resp = await client.post(
        "/api/v1/auth/login", json={"email_or_username": "bob", "password": "wrong-password"}
    )
    assert resp.status_code == 401
    assert "detail" in resp.json()


async def test_register_duplicate_username_rejected(client: AsyncClient) -> None:
    await register_and_login(client, username="carol")
    resp = await client.post(
        "/api/v1/auth/register",
        json={
            "email": "carol2@example.com",
            "username": "carol",
            "password": "password123",
        },
    )
    assert resp.status_code == 400


async def test_login_accepts_email_or_username(client: AsyncClient) -> None:
    await register_and_login(client, username="daveuser", email="dave@example.com")

    by_email = await client.post(
        "/api/v1/auth/login",
        json={"email_or_username": "dave@example.com", "password": "password123"},
    )
    assert by_email.status_code == 200

    by_username = await client.post(
        "/api/v1/auth/login", json={"email_or_username": "daveuser", "password": "password123"}
    )
    assert by_username.status_code == 200
