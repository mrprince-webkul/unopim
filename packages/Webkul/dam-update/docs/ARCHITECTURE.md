# DevAnnounce — Architecture

## Services (docker-compose)

| Service | Image / Build | Role |
|---|---|---|
| `nginx` | nginx:1.27-alpine | Single public entrypoint (`APP_PORT`, default 8080). Routes `/` → frontend, `/api` → backend (incl. WebSockets), `/storage` → MinIO. Gzip, security headers, 30 MB upload limit. |
| `frontend` | `./frontend` (node:22-alpine, standalone Next.js) | SSR + client app. Server components call the backend via `INTERNAL_API_URL=http://backend:8000`; the browser uses relative `/api/v1` URLs. |
| `backend` | `./backend` (python:3.13-slim) | FastAPI + Uvicorn (single worker — in-process WebSocket manager + APScheduler). Entrypoint runs Alembic migrations and idempotent seeding before boot. |
| `postgres` | postgres:16-alpine | Primary datastore + full-text search (tsvector + GIN). |
| `redis` | redis:7-alpine | Rate limiting, refresh-token allowlist, view-dedupe, caching. |
| `minio` | minio/minio | S3-compatible object storage; bucket auto-created with anonymous read by `minio-init`. Swap env vars to use AWS S3 in production. |

## Request flow

1. Browser hits Nginx. Static Next.js assets are cached immutable for a year.
2. `/api/v1/*` proxies to FastAPI with `Upgrade` headers so `/api/v1/ws/notifications` WebSockets pass through.
3. Uploaded files are streamed by the backend into MinIO; public URLs are `/storage/<bucket>/<key>` served by Nginx → MinIO (anonymous read on the bucket).

## Auth model

- Access token: 30-min JWT sent as `Authorization: Bearer`.
- Refresh token: 7-day JWT in an httpOnly `refresh_token` cookie scoped to `/api/v1/auth`; its `jti` is allowlisted in Redis so logout revokes it.
- Password hashing: bcrypt. Email verification & password reset use short-lived purpose-scoped JWTs (links are logged to the backend console in dev; SMTP configurable).

## Dev News pipeline

APScheduler (in the backend lifespan) runs daily at 00:00 UTC, plus on-demand via `POST /api/v1/admin/news/fetch`:

1. Pull candidate articles from RSS feeds (Hacker News, Dev.to, r/programming, TechCrunch AI, GitHub blog, …), GitHub trending repos, and optionally NewsAPI.
2. Classify into the 15 tracked topics by keyword; dedupe by `source_url`.
3. Summarize: if `ANTHROPIC_API_KEY` is set in site settings (Admin → Settings) and AI summarization is enabled, summaries are generated with Claude via the Anthropic Messages API; otherwise trimmed RSS descriptions are used.
4. Store max `NEWS_MAX_ARTICLES` (default 10) per run; notify users over WebSockets.

Runtime configuration (API keys, toggles) lives in the `site_settings` table — editable from the Admin portal, secrets always masked in responses, never overwritten by masked values.

## Data model (core tables)

`users`, `announcements` (denormalized counters + `search_vector`), `attachments`, `categories`, `tags` + `announcement_tags`, `comments` (self-referencing), `likes`, `bookmarks`, `follows`, `news_articles`, `notifications`, `site_settings`, `activity_logs`, `analytics_events`.

## Security

CSRF-resistant by design (Bearer tokens for state-changing calls; the refresh cookie is `SameSite=Lax` and only used on `/auth` endpoints), Redis sliding-window rate limiting (strict on auth endpoints), security headers at both Nginx and FastAPI layers, SQLAlchemy parameterized queries, Pydantic validation on every input, upload extension/size whitelisting, secrets masked in admin API.
