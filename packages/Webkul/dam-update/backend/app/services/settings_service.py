"""Site settings: seeded defaults, masked reads, and safe writes.

Settings are stored as plain strings in `site_settings`. Secret settings
(API keys) are masked on read (first 4 + last 2 chars, `•` fill) and any
write whose value still contains the mask character `•` is ignored, so the
admin UI can safely round-trip a GET response through a PUT without
clobbering the real secret. An empty string clears a setting.
"""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.settings import SiteSetting

MASK_CHAR = "•"  # •

DEFAULT_NEWS_PROMPT = (
    "Write a concise 2-3 sentence summary of this developer news article, aimed "
    "at software engineers. Be factual and specific, no fluff or marketing "
    "language.\n\nTitle: {title}\n\nContent: {content}"
)

# The default RSS/source list the AI news engine pulls from. Stored as JSON so
# the admin can add/remove/disable sources without a code change.
DEFAULT_NEWS_SOURCES = (
    '[{"name":"Hacker News","url":"https://hnrss.org/frontpage","enabled":true},'
    '{"name":"Dev.to","url":"https://dev.to/feed","enabled":true},'
    '{"name":"GitHub Blog","url":"https://github.blog/feed/","enabled":true},'
    '{"name":"The Verge (Tech)","url":"https://www.theverge.com/rss/index.xml","enabled":true},'
    '{"name":"TechCrunch","url":"https://techcrunch.com/feed/","enabled":true},'
    '{"name":"OpenAI Blog","url":"https://openai.com/blog/rss.xml","enabled":true},'
    '{"name":"Google AI Blog","url":"https://blog.google/technology/ai/rss/","enabled":true},'
    '{"name":"Cloudflare Blog","url":"https://blog.cloudflare.com/rss/","enabled":true},'
    '{"name":"AWS News","url":"https://aws.amazon.com/about-aws/whats-new/recent/feed/","enabled":true},'
    '{"name":"Docker Blog","url":"https://www.docker.com/blog/feed/","enabled":true},'
    '{"name":"Kubernetes Blog","url":"https://kubernetes.io/feed.xml","enabled":true},'
    '{"name":"Python.org","url":"https://blog.python.org/feeds/posts/default","enabled":true},'
    '{"name":"React Blog","url":"https://react.dev/rss.xml","enabled":true},'
    '{"name":"Next.js Blog","url":"https://nextjs.org/feed.xml","enabled":true},'
    '{"name":"Redis Blog","url":"https://redis.io/blog/feed/","enabled":true},'
    '{"name":"PostgreSQL News","url":"https://www.postgresql.org/news.rss","enabled":true}]'
)

DEFAULT_SETTINGS: list[dict[str, str | bool]] = [
    # --- AI / news (legacy single-key, still honoured for back-compat) ----
    {
        "key": "ANTHROPIC_API_KEY",
        "value": "",
        "description": "Anthropic API key (fallback provider when no AI provider is active).",
        "is_secret": True,
    },
    {
        "key": "NEWS_API_KEY",
        "value": "",
        "description": "Optional newsapi.org API key for additional top tech headlines.",
        "is_secret": True,
    },
    {
        "key": "AI_SUMMARIZATION_ENABLED",
        "value": "true",
        "description": "Use the active AI provider to summarize news articles.",
        "is_secret": False,
    },
    {
        "key": "NEWS_FETCH_ENABLED",
        "value": "true",
        "description": "Enable the scheduled news fetch job.",
        "is_secret": False,
    },
    {
        "key": "NEWS_MAX_ARTICLES",
        "value": "20",
        "description": "Maximum number of articles imported per fetch run.",
        "is_secret": False,
    },
    # --- News generation config -------------------------------------------
    {
        "key": "NEWS_FETCH_INTERVAL",
        "value": "daily",
        "description": "How often to fetch news: hourly, 6h, 12h, or daily.",
        "is_secret": False,
    },
    {
        "key": "NEWS_PROMPT_TEMPLATE",
        "value": DEFAULT_NEWS_PROMPT,
        "description": "AI prompt template for summaries. Use {title} and {content} placeholders.",
        "is_secret": False,
    },
    {
        "key": "NEWS_SOURCES",
        "value": DEFAULT_NEWS_SOURCES,
        "description": "JSON array of news sources ({name,url,enabled}) the engine pulls from.",
        "is_secret": False,
    },
    {
        "key": "NEWS_EXCLUDE_CATEGORIES",
        "value": "",
        "description": "Comma-separated category slugs to exclude from imported news.",
        "is_secret": False,
    },
    {
        "key": "NEWS_AI_TAGS_ENABLED",
        "value": "true",
        "description": "Ask the AI provider to generate tags for each article.",
        "is_secret": False,
    },
    # --- Branding ---------------------------------------------------------
    {"key": "BRAND_APP_NAME", "value": "DevAnnounce", "description": "Application name shown across the UI.", "is_secret": False},
    {"key": "BRAND_BROWSER_TITLE", "value": "DevAnnounce — Ship it. Announce it.", "description": "Browser tab title.", "is_secret": False},
    {"key": "BRAND_TAGLINE", "value": "Ship it. Announce it.", "description": "Short brand tagline.", "is_secret": False},
    {"key": "BRAND_HERO_TAGLINE", "value": "A real-time changelog for everything the community builds.", "description": "Hero subtitle on the landing page.", "is_secret": False},
    {"key": "BRAND_LOGO_URL", "value": "", "description": "URL/path to the primary logo (blank = built-in mark).", "is_secret": False},
    {"key": "BRAND_LOGIN_LOGO_URL", "value": "", "description": "Logo shown on the login screen.", "is_secret": False},
    {"key": "BRAND_FAVICON_URL", "value": "", "description": "Favicon URL/path.", "is_secret": False},
    {"key": "BRAND_LOGIN_BG_URL", "value": "", "description": "Login page background image/video URL.", "is_secret": False},
    {"key": "BRAND_FOOTER_TEXT", "value": "Built for developers who ship.", "description": "Footer text.", "is_secret": False},
    {"key": "BRAND_COPYRIGHT", "value": "© DevAnnounce", "description": "Copyright line.", "is_secret": False},
    {"key": "BRAND_SOCIAL_GITHUB", "value": "", "description": "GitHub profile URL.", "is_secret": False},
    {"key": "BRAND_SOCIAL_TWITTER", "value": "", "description": "X/Twitter profile URL.", "is_secret": False},
    {"key": "BRAND_SOCIAL_LINKEDIN", "value": "", "description": "LinkedIn profile URL.", "is_secret": False},
    {"key": "BRAND_CONTACT_EMAIL", "value": "", "description": "Public contact email.", "is_secret": False},
    # --- Theme ------------------------------------------------------------
    {"key": "THEME_DEFAULT", "value": "midnight", "description": "Default theme: midnight, arctic, emerald, cyber, or sunset.", "is_secret": False},
    {"key": "THEME_ALLOW_CUSTOM", "value": "true", "description": "Allow users to build & save custom themes.", "is_secret": False},
    # --- Application config ----------------------------------------------
    {"key": "CONFIG_TIMEZONE", "value": "UTC", "description": "Default display timezone.", "is_secret": False},
    {"key": "CONFIG_DATE_FORMAT", "value": "MMM d, yyyy", "description": "Default date format (date-fns tokens).", "is_secret": False},
    {"key": "CONFIG_UPLOAD_MAX_MB", "value": "25", "description": "Maximum upload / attachment size in MB.", "is_secret": False},
    {"key": "CONFIG_STORAGE_PROVIDER", "value": "minio", "description": "Object storage provider: local, minio, or s3.", "is_secret": False},
    {"key": "CONFIG_MAINTENANCE_MODE", "value": "false", "description": "Put the public site into maintenance mode.", "is_secret": False},
    {"key": "CONFIG_MAINTENANCE_MESSAGE", "value": "We'll be back shortly — DevAnnounce is getting an upgrade.", "description": "Message shown during maintenance.", "is_secret": False},
    # --- Mail (SMTP) ------------------------------------------------------
    {"key": "SMTP_HOST", "value": "", "description": "Outbound SMTP host (blank = log emails to stdout).", "is_secret": False},
    {"key": "SMTP_PORT", "value": "587", "description": "SMTP port.", "is_secret": False},
    {"key": "SMTP_USER", "value": "", "description": "SMTP username.", "is_secret": False},
    {"key": "SMTP_PASSWORD", "value": "", "description": "SMTP password.", "is_secret": True},
    {"key": "SMTP_FROM", "value": "DevAnnounce <no-reply@devannounce.dev>", "description": "From address for outbound mail.", "is_secret": False},
    {"key": "SMTP_USE_TLS", "value": "true", "description": "Use STARTTLS for SMTP.", "is_secret": False},
]


def mask_secret(value: str) -> str:
    """Mask a secret value: first 4 + last 2 chars visible, `•` filling the middle.

    Values of length <= 6 are fully masked (no chars revealed).
    """
    if not value:
        return ""
    if len(value) <= 6:
        return MASK_CHAR * len(value)
    middle = MASK_CHAR * (len(value) - 6)
    return f"{value[:4]}{middle}{value[-2:]}"


async def seed_default_settings(db: AsyncSession) -> None:
    """Idempotently insert default settings that don't already exist."""
    result = await db.execute(select(SiteSetting.key))
    existing_keys = {row[0] for row in result.all()}
    for defaults in DEFAULT_SETTINGS:
        if defaults["key"] in existing_keys:
            continue
        db.add(SiteSetting(**defaults))
    await db.commit()


async def list_settings(db: AsyncSession) -> list[SiteSetting]:
    result = await db.execute(select(SiteSetting).order_by(SiteSetting.key))
    return list(result.scalars().all())


async def list_settings_masked(db: AsyncSession) -> list[dict]:
    # Self-healing: ensure defaults exist even if `python -m app.seed` never
    # ran against this database (e.g. tests that only create the schema).
    await seed_default_settings(db)
    settings_rows = await list_settings(db)
    return [
        {
            "key": s.key,
            "value": mask_secret(s.value) if s.is_secret else s.value,
            "description": s.description,
            "is_secret": s.is_secret,
        }
        for s in settings_rows
    ]


async def update_settings(db: AsyncSession, updates: dict[str, str]) -> list[dict]:
    """Apply updates, ignoring masked values, clearing on empty string."""
    await seed_default_settings(db)
    result = await db.execute(select(SiteSetting).where(SiteSetting.key.in_(updates.keys())))
    rows = {row.key: row for row in result.scalars().all()}
    for key, value in updates.items():
        row = rows.get(key)
        if row is None:
            continue
        if MASK_CHAR in value:
            continue  # masked placeholder round-tripped from a GET — ignore
        row.value = value  # empty string clears
    await db.commit()
    return await list_settings_masked(db)


async def get_value(db: AsyncSession, key: str, default: str = "") -> str:
    result = await db.execute(select(SiteSetting.value).where(SiteSetting.key == key))
    row = result.scalar_one_or_none()
    return row if row is not None else default


async def get_bool(db: AsyncSession, key: str, default: bool = False) -> bool:
    raw = await get_value(db, key, "true" if default else "false")
    return raw.strip().lower() in {"1", "true", "yes", "on"}


async def get_int(db: AsyncSession, key: str, default: int = 0) -> int:
    raw = await get_value(db, key, str(default))
    try:
        return int(raw)
    except ValueError:
        return default


async def get_json(db: AsyncSession, key: str, default):
    """Parse a JSON-valued setting, returning `default` on missing/invalid."""
    import json

    raw = await get_value(db, key, "")
    if not raw:
        return default
    try:
        return json.loads(raw)
    except (ValueError, TypeError):
        return default
