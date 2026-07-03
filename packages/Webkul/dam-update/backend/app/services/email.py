"""Email delivery.

In development (and always, as a fallback) emails are logged to stdout with
a readable banner containing the verification/reset link. If SMTP_HOST is
configured, we additionally attempt real delivery — best effort, failures
are logged and swallowed so the request never fails because of email.
"""

from __future__ import annotations

import asyncio
import logging
import smtplib
from email.message import EmailMessage

from app.core.config import settings
from app.models.user import User

logger = logging.getLogger("devannounce.email")


def _log_email(to: str, subject: str, link: str, body: str) -> None:
    banner = "=" * 64
    logger.info(
        "\n%s\n EMAIL\n To: %s\n Subject: %s\n Link: %s\n\n %s\n%s",
        banner,
        to,
        subject,
        link,
        body,
        banner,
    )


def _send_smtp_sync(to: str, subject: str, body: str) -> None:
    message = EmailMessage()
    message["From"] = settings.SMTP_FROM
    message["To"] = to
    message["Subject"] = subject
    message.set_content(body)

    with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10) as server:
        if settings.SMTP_USE_TLS:
            server.starttls()
        if settings.SMTP_USER and settings.SMTP_PASSWORD:
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
        server.send_message(message)


async def send_email(to: str, subject: str, link: str, body: str) -> None:
    """Log an email (always) and attempt real SMTP delivery (if configured)."""
    _log_email(to, subject, link, body)
    if not settings.SMTP_HOST:
        return
    try:
        await asyncio.to_thread(_send_smtp_sync, to, subject, f"{body}\n\n{link}")
    except Exception as exc:  # noqa: BLE001
        logger.warning("SMTP delivery failed (email was still logged above): %s", exc)


async def send_verification_email(user: User, token: str) -> None:
    link = f"{settings.FRONTEND_ORIGIN}/verify-email?token={token}"
    await send_email(
        to=user.email,
        subject="Verify your DevAnnounce email",
        link=link,
        body=(
            f"Hi {user.username},\n\n"
            "Welcome to DevAnnounce! Please verify your email address by visiting "
            "the link below. It expires in 24 hours."
        ),
    )


async def send_password_reset_email(user: User, token: str) -> None:
    link = f"{settings.FRONTEND_ORIGIN}/reset-password?token={token}"
    await send_email(
        to=user.email,
        subject="Reset your DevAnnounce password",
        link=link,
        body=(
            f"Hi {user.username},\n\n"
            "We received a request to reset your password. Visit the link below "
            "to choose a new one. It expires in 1 hour. If you didn't request this, "
            "you can safely ignore this email."
        ),
    )
