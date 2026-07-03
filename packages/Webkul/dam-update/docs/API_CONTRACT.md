# DevAnnounce — API Contract (Source of Truth)

Both backend and frontend MUST follow this contract exactly. Base path: `/api/v1`.

## Conventions

- All responses are JSON. Errors: `{"detail": "message"}` with proper HTTP status codes.
- Paginated responses: `{"items": [...], "total": int, "page": int, "pages": int, "size": int}`.
- Auth: `Authorization: Bearer <access_token>` header. Refresh token lives in an httpOnly cookie named `refresh_token` (path `/api/v1/auth`).
- Datetimes: ISO 8601 UTC strings.
- IDs are integers. Slugs are URL-safe strings.

## Runtime topology

- Nginx on port 80 (container) routes: `/` → frontend:3000, `/api` → backend:8000, `/storage` → minio:9000 (public bucket `devannounce`), WebSocket upgrade for `/api/v1/ws`.
- Browser uses **relative** URLs (`/api/v1/...`). Next.js server-side code uses `process.env.INTERNAL_API_URL` (`http://backend:8000`).

---

## Schemas (TypeScript-ish, mirrored by Pydantic)

```ts
interface User {
  id: number; email: string; username: string; full_name: string | null;
  avatar_url: string | null; bio: string | null;
  github_url: string | null; linkedin_url: string | null; website_url: string | null;
  role: "user" | "admin"; is_verified: boolean; is_banned: boolean;
  created_at: string;
}

interface PublicProfile extends User {
  followers_count: number; following_count: number; posts_count: number;
  is_following: boolean; // false when unauthenticated
}

interface Category { id: number; name: string; slug: string; description: string | null; icon: string | null; color: string | null; posts_count: number; }

interface Attachment { id: number; url: string; filename: string; original_name: string; content_type: string; size: number; downloads_count: number; }

interface Announcement {
  id: number; title: string; slug: string; description: string;
  content: string; // markdown
  thumbnail_url: string | null;
  author: User; category: Category | null; tags: string[];
  github_url: string | null; website_url: string | null; demo_url: string | null;
  cta_label: string | null; cta_url: string | null;
  status: "draft" | "published"; is_pinned: boolean; is_featured: boolean;
  publish_date: string; created_at: string; updated_at: string;
  views_count: number; likes_count: number; comments_count: number; bookmarks_count: number;
  attachments: Attachment[];
  is_liked: boolean; is_bookmarked: boolean; // false when unauthenticated
  reading_time: number; // minutes, computed from content
}

interface Comment {
  id: number; content: string; author: User; announcement_id: number;
  parent_id: number | null; is_hidden: boolean; created_at: string;
  replies: Comment[]; // one level deep on list endpoints
}

interface NewsArticle {
  id: number; title: string; summary: string; image_url: string | null;
  source_url: string; source_name: string; category: string;
  reading_time: number; published_at: string; created_at: string;
}

interface Notification {
  id: number; type: "like" | "comment" | "follow" | "admin" | "news";
  title: string; body: string; link: string | null; is_read: boolean; created_at: string;
}

interface SiteSetting { key: string; value: string; description: string; is_secret: boolean; }
// secrets are returned masked: "sk-a•••••••3f" (first 4 + last 2 chars)

interface ActivityLog { id: number; user: User | null; action: string; detail: string; created_at: string; }
```

---

## Endpoints

### Auth (`/api/v1/auth`)

| Method | Path | Body → Response |
|---|---|---|
| POST | `/auth/register` | `{email, username, password, full_name?}` → `User` (201). Sends verification email (console in dev). |
| POST | `/auth/login` | `{email_or_username, password}` → `{access_token, token_type: "bearer", user: User}` + sets `refresh_token` cookie. 403 if banned. |
| POST | `/auth/refresh` | (cookie) → `{access_token, user}` |
| POST | `/auth/logout` | → `{message}`; revokes refresh token (Redis), clears cookie |
| POST | `/auth/forgot-password` | `{email}` → `{message}` (always 200) |
| POST | `/auth/reset-password` | `{token, new_password}` → `{message}` |
| POST | `/auth/verify-email` | `{token}` → `{message}` |
| GET | `/auth/me` | (auth) → `User` |

Access token: JWT, 30 min, claims `{sub: user_id, type: "access"}`. Refresh: JWT, 7 days, `{sub, type: "refresh", jti}` — jti allowlist kept in Redis. Reset/verify tokens are JWTs with `type: "reset"|"verify"`, 1h/24h expiry.

### Users

| Method | Path | Notes |
|---|---|---|
| GET | `/users/{username}` | → `PublicProfile` |
| PUT | `/users/me` | `{full_name?, bio?, avatar_url?, github_url?, linkedin_url?, website_url?}` → `User` |
| POST/DELETE | `/users/{username}/follow` | follow / unfollow → `{message}`; creates notification |
| GET | `/users/{username}/announcements` | paginated `Announcement`; `?status=draft` only for own profile |
| GET | `/users/me/bookmarks` | paginated `Announcement` |
| GET | `/users/me/stats` | see below |

`/users/me/stats` →
```json
{ "posts": 0, "views": 0, "likes": 0, "bookmarks": 0, "downloads": 0,
  "weekly_views": [{"date": "2026-07-01", "count": 5}],           // last 7 days
  "monthly_engagement": [{"date": "2026-06-01", "views": 1, "likes": 2, "comments": 3}], // last 30 days
  "recent_activity": [{"action": "like", "detail": "...", "created_at": "..."}] }
```

### Categories

- `GET /categories` → `Category[]` (with posts_count)

### Announcements

| Method | Path | Notes |
|---|---|---|
| GET | `/announcements` | paginated. Query: `page, size (default 10, max 50), sort=latest\|popular\|trending, category=<slug>, tag=<slug>, author=<username>, featured=true, pinned=true, q=<text>`. Only `published` with `publish_date <= now`. Pinned first when sort=latest. `trending` = score by (likes*3 + comments*2 + views) over last 7 days; `popular` = all-time likes+views. |
| POST | `/announcements` | (auth) `{title, description, content, category_id?, tags?: string[], thumbnail_url?, github_url?, website_url?, demo_url?, cta_label?, cta_url?, status, publish_date?, attachment_ids?: number[]}` → `Announcement` (201) |
| GET | `/announcements/{slug}` | → `Announcement`. Increments views (deduped per IP+announcement per hour via Redis). Drafts visible to author/admin only. |
| PUT | `/announcements/{id}` | (author or admin) same body as POST, all optional → `Announcement` |
| DELETE | `/announcements/{id}` | (author or admin) → 204 |
| POST/DELETE | `/announcements/{id}/like` | → `{likes_count, is_liked}`; notifies author |
| POST/DELETE | `/announcements/{id}/bookmark` | → `{bookmarks_count, is_bookmarked}` |
| GET | `/announcements/{id}/comments` | paginated top-level `Comment` (replies nested, hidden ones excluded for non-admin) |
| POST | `/announcements/{id}/comments` | (auth) `{content, parent_id?}` → `Comment`; notifies author |
| PUT | `/comments/{id}` | (author) `{content}` |
| DELETE | `/comments/{id}` | (author or admin) → 204 |

### Uploads

- `POST /uploads` (auth, multipart `file`) → `Attachment` (201). Max **25 MB**. Allowed: png jpg jpeg gif webp svg pdf doc docx xls xlsx ppt pptx zip md txt csv. Stored in MinIO bucket `devannounce`, key `uploads/{uuid}.{ext}`, public URL `/storage/devannounce/uploads/{uuid}.{ext}`.
- `GET /uploads/{id}/download` → 302 redirect to file URL; increments downloads_count.

### Dev News

- `GET /news` — paginated `NewsArticle`. Query: `page, size, category, q`.
- `GET /news/categories` → `string[]` of distinct categories present.

News is generated by a scheduled job (APScheduler, daily at 00:00 UTC) — max 10 articles/run from RSS feeds (Hacker News, Dev.to, Reddit r/programming, TechCrunch AI, GitHub blog...) + GitHub trending repos, covering topics: AI, FastAPI, Python, JavaScript, TypeScript, React, Next.js, PostgreSQL, Redis, Docker, Kubernetes, Linux, Cloud, DevOps, Open Source. If site setting `ANTHROPIC_API_KEY` is set and `AI_SUMMARIZATION_ENABLED=true`, summaries are written by Claude (model `claude-haiku-4-5-20251001` via httpx to the Anthropic Messages API); otherwise use trimmed RSS description. Dedupe by source_url.

### Search

- `GET /search?q=&type=all|announcements|news|users&page=&size=` →
```json
{ "announcements": {paginated}, "news": {paginated}, "users": {"items": [PublicProfile...], ...} }
```
(only the requested type is populated when type != all; others are empty paginated objects). Announcements use PostgreSQL FTS (`tsvector` over title/description/content/tags + author username), with ILIKE fallback on non-PG engines.

### Notifications

- `GET /notifications?page=` → paginated `Notification` + extra field `unread_count` at top level.
- `POST /notifications/{id}/read` → `Notification`
- `POST /notifications/read-all` → `{message}`
- **WS** `/api/v1/ws/notifications?token=<access_token>` — server pushes `{"type": "notification", "data": Notification}` on new events. Ping/pong keepalive.

### Admin (all require admin role)

| Method | Path | Notes |
|---|---|---|
| GET | `/admin/stats` | `{users, posts, comments, news_count, downloads, storage_bytes, files_count, user_growth: [{date, count}] (30d), posts_per_day: [{date, count}] (30d), popular_categories: [{name, count}], engagement: {likes, comments, bookmarks, views}}` |
| GET | `/admin/users` | paginated User + `?q=` search |
| POST | `/admin/users/{id}/ban` / `/unban` | → `User` |
| POST | `/admin/announcements/{id}/pin` `/unpin` `/feature` `/unfeature` | → `Announcement` |
| GET | `/admin/comments` | paginated all comments (moderation queue), `?hidden=true` filter |
| POST | `/admin/comments/{id}/hide` `/show` | → `Comment` |
| GET | `/admin/news` | paginated (same as /news but includes all) |
| POST | `/admin/news/fetch` | manually trigger news fetch → `{imported: int, message}` |
| DELETE | `/admin/news/{id}` | → 204 |
| GET | `/admin/categories` / POST / PUT `/admin/categories/{id}` / DELETE | Category CRUD `{name, description?, icon?, color?}` |
| GET | `/admin/settings` | → `SiteSetting[]` (secrets masked) |
| PUT | `/admin/settings` | `{settings: {KEY: "value", ...}}` → `SiteSetting[]`. Empty string clears. Masked values (containing `•`) are ignored (not overwritten). |
| GET | `/admin/logs` | paginated `ActivityLog` |

**Setting keys** (seeded with defaults): `ANTHROPIC_API_KEY` (secret, ""), `NEWS_API_KEY` (secret, "", optional newsapi.org), `AI_SUMMARIZATION_ENABLED` ("true"), `NEWS_FETCH_ENABLED` ("true"), `NEWS_MAX_ARTICLES` ("10").

### Rate limiting

Redis sliding window: 300 req/min per IP globally; 10 req/min for `/auth/login`, `/auth/register`, `/auth/forgot-password`. 429 with `{"detail": "Too many requests"}`.

---

## Frontend module contract

`frontend/src/lib/types.ts` — the interfaces above, plus `Paginated<T>`.

`frontend/src/lib/api.ts` — exports:
- `apiFetch<T>(path, init?)`: fetch wrapper; relative base on client, `INTERNAL_API_URL` on server; attaches Bearer token from auth store; on 401 tries `/auth/refresh` once then retries; throws `ApiError {status, detail}`.
- Grouped clients: `authApi`, `usersApi`, `announcementsApi`, `commentsApi`, `categoriesApi`, `newsApi`, `searchApi`, `notificationsApi`, `uploadsApi`, `adminApi` — one function per endpoint above.

`frontend/src/lib/auth.tsx` — `AuthProvider` + `useAuth()` → `{user, accessToken, login, register, logout, refresh, loading}`. Access token kept in memory + localStorage (`da_access_token`); refresh on mount.

`frontend/src/components/ui/*` — shadcn/ui-style components (standard shadcn APIs, `cn` from `@/lib/utils`): `button, input, textarea, label, card, badge, avatar, dialog, dropdown-menu, tabs, select, skeleton, separator, switch, table, tooltip`. Toasts via `sonner`.

Path alias `@/*` → `./src/*`.

## Design language

Linear/Vercel/GitHub aesthetic. Dark mode default (class strategy, `next-themes`). Neutral zinc palette, indigo→violet gradient accents, rounded-xl cards, soft borders (`border-white/10` dark), subtle glass on navbar (`backdrop-blur`), Inter font, Framer Motion micro-animations (fade/slide on mount, hover lift on cards). Fully responsive.
