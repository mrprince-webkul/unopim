"""Scheduled dev-news ingestion: RSS feeds + GitHub trending + optional NewsAPI.

Runs are resilient by design: every network call is individually try/except'd
with a 10s timeout so one bad feed never aborts the whole run. Results are
deduped by `source_url` against both the current batch and the database,
classified into one of the 15 supported topics by keyword matching, summarized
(Claude if configured, else a cleaned RSS description), and capped at the
`NEWS_MAX_ARTICLES` site setting per run.
"""

from __future__ import annotations

import logging
import re
from datetime import datetime, timedelta, timezone
from email.utils import parsedate_to_datetime

import feedparser
import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.news import NewsArticle
from app.services import ai_providers, notifier, settings_service
from app.services.summarizer import generate_tags, summarize_article, summarize_via_provider
from app.utils import reading_time

logger = logging.getLogger("devannounce.news_fetcher")

RSS_SOURCES: list[tuple[str, str]] = [
    ("Hacker News", "https://hnrss.org/frontpage"),
    ("Dev.to", "https://dev.to/feed"),
    ("Reddit r/programming", "https://www.reddit.com/r/programming/.rss"),
    ("TechCrunch AI", "https://techcrunch.com/category/artificial-intelligence/feed/"),
    ("GitHub Blog", "https://github.blog/feed/"),
    ("Next.js Blog", "https://nextjs.org/feed.xml"),
]

# Ordered so more specific topics are matched before generic ones.
CATEGORY_KEYWORDS: list[tuple[str, list[str]]] = [
    ("FastAPI", ["fastapi"]),
    ("Next.js", ["next.js", "nextjs", "vercel"]),
    ("TypeScript", ["typescript"]),
    ("React", ["react", "reactjs", "jsx"]),
    ("JavaScript", ["javascript", "node.js", "nodejs", "deno", "bun", "npm"]),
    ("Python", ["python", "django", "flask", "pypi"]),
    ("PostgreSQL", ["postgres", "postgresql"]),
    ("Redis", ["redis"]),
    ("Kubernetes", ["kubernetes", "k8s"]),
    ("Docker", ["docker", "container"]),
    ("DevOps", ["devops", "ci/cd", "continuous integration", "terraform", "ansible", "pipeline"]),
    ("Cloud", ["aws", "azure", "gcp", "cloud", "serverless", "lambda"]),
    ("Linux", ["linux", "ubuntu", "debian", "kernel"]),
    (
        "AI",
        [
            "ai",
            "artificial intelligence",
            "machine learning",
            "llm",
            "gpt",
            "claude",
            "openai",
            "anthropic",
            "neural network",
        ],
    ),
    ("Open Source", ["open source", "oss", "github", "git "]),
]
DEFAULT_CATEGORY = "Open Source"


def _keyword_pattern(keyword: str) -> re.Pattern[str]:
    # Word-boundary match so "ai" doesn't hit "available" or "react" hit "reaction".
    return re.compile(rf"(?<![a-z0-9]){re.escape(keyword)}(?![a-z0-9])")


_COMPILED_KEYWORDS: list[tuple[str, list[re.Pattern[str]]]] = [
    (category, [_keyword_pattern(keyword) for keyword in keywords])
    for category, keywords in CATEGORY_KEYWORDS
]


def classify_category(title: str, description: str) -> str:
    """Classify an article into one of the 15 supported topics by keyword match."""
    text = f"{title} {description}".lower()
    for category, patterns in _COMPILED_KEYWORDS:
        if any(pattern.search(text) for pattern in patterns):
            return category
    return DEFAULT_CATEGORY


def _extract_image(entry) -> str | None:
    media = entry.get("media_content") or entry.get("media_thumbnail")
    if media and isinstance(media, list):
        for item in media:
            if item.get("url"):
                return item["url"]
    for link in entry.get("links", []) or []:
        if str(link.get("type", "")).startswith("image/"):
            return link.get("href")
    return None


def _parse_published(entry) -> datetime:
    for key in ("published", "updated"):
        value = entry.get(key)
        if value:
            try:
                dt = parsedate_to_datetime(value)
                if dt.tzinfo is None:
                    dt = dt.replace(tzinfo=timezone.utc)
                return dt.astimezone(timezone.utc)
            except (TypeError, ValueError):
                continue
    return datetime.now(timezone.utc)


async def _fetch_rss(client: httpx.AsyncClient, source_name: str, url: str) -> list[dict]:
    try:
        response = await client.get(url, timeout=10.0, headers={"User-Agent": "DevAnnounceBot/1.0"})
        response.raise_for_status()
    except Exception as exc:  # noqa: BLE001
        logger.warning("RSS fetch failed for %s (%s): %s", source_name, url, exc)
        return []

    try:
        parsed = feedparser.parse(response.content)
    except Exception as exc:  # noqa: BLE001
        logger.warning("RSS parse failed for %s: %s", source_name, exc)
        return []

    articles = []
    for entry in parsed.entries[:15]:
        title = (entry.get("title") or "").strip()
        link = (entry.get("link") or "").strip()
        if not title or not link:
            continue
        description = entry.get("summary") or entry.get("description") or ""
        articles.append(
            {
                "title": title,
                "description": description,
                "source_url": link,
                "source_name": source_name,
                "image_url": _extract_image(entry),
                "published_at": _parse_published(entry),
            }
        )
    return articles


async def _fetch_github_trending(client: httpx.AsyncClient) -> list[dict]:
    since = (datetime.now(timezone.utc) - timedelta(days=7)).strftime("%Y-%m-%d")
    try:
        response = await client.get(
            "https://api.github.com/search/repositories",
            params={"q": f"created:>{since}", "sort": "stars", "order": "desc", "per_page": 10},
            timeout=10.0,
            headers={"Accept": "application/vnd.github+json", "User-Agent": "DevAnnounceBot/1.0"},
        )
        response.raise_for_status()
        data = response.json()
    except Exception as exc:  # noqa: BLE001
        logger.warning("GitHub trending fetch failed: %s", exc)
        return []

    articles = []
    for repo in data.get("items", [])[:10]:
        name = repo.get("full_name")
        html_url = repo.get("html_url")
        if not name or not html_url:
            continue
        stars = repo.get("stargazers_count", 0)
        articles.append(
            {
                "title": f"Trending on GitHub: {name} ({stars}★)",
                "description": repo.get("description")
                or f"{name} is trending on GitHub this week.",
                "source_url": html_url,
                "source_name": "GitHub Trending",
                "image_url": (repo.get("owner") or {}).get("avatar_url"),
                "published_at": datetime.now(timezone.utc),
            }
        )
    return articles


async def _fetch_newsapi(client: httpx.AsyncClient, api_key: str) -> list[dict]:
    try:
        response = await client.get(
            "https://newsapi.org/v2/top-headlines",
            params={"category": "technology", "language": "en", "pageSize": 10, "apiKey": api_key},
            timeout=10.0,
        )
        response.raise_for_status()
        data = response.json()
    except Exception as exc:  # noqa: BLE001
        logger.warning("NewsAPI fetch failed: %s", exc)
        return []

    articles = []
    for item in data.get("articles", []) or []:
        url = item.get("url")
        title = item.get("title")
        if not url or not title:
            continue
        published_raw = item.get("publishedAt")
        published = datetime.now(timezone.utc)
        if published_raw:
            try:
                published = datetime.fromisoformat(published_raw.replace("Z", "+00:00"))
            except ValueError:
                pass
        articles.append(
            {
                "title": title,
                "description": item.get("description") or "",
                "source_url": url,
                "source_name": (item.get("source") or {}).get("name") or "NewsAPI",
                "image_url": item.get("urlToImage"),
                "published_at": published,
            }
        )
    return articles


async def _configured_sources(db: AsyncSession) -> list[tuple[str, str]]:
    """Admin-configured source list (JSON), falling back to the built-in RSS list."""
    raw = await settings_service.get_json(db, "NEWS_SOURCES", None)
    if not isinstance(raw, list) or not raw:
        return RSS_SOURCES
    sources: list[tuple[str, str]] = []
    for item in raw:
        if isinstance(item, dict) and item.get("enabled", True) and item.get("url"):
            sources.append((item.get("name") or item["url"], item["url"]))
    return sources or RSS_SOURCES


async def fetch_news(db: AsyncSession, notify_users: bool = True) -> int:
    """Run one full fetch cycle. Returns the number of newly imported articles."""
    if not await settings_service.get_bool(db, "NEWS_FETCH_ENABLED", True):
        logger.info("News fetch disabled via site settings; skipping run.")
        return 0

    max_articles = await settings_service.get_int(db, "NEWS_MAX_ARTICLES", 20)
    ai_enabled = await settings_service.get_bool(db, "AI_SUMMARIZATION_ENABLED", True)
    tags_enabled = await settings_service.get_bool(db, "NEWS_AI_TAGS_ENABLED", True)
    anthropic_key = await settings_service.get_value(db, "ANTHROPIC_API_KEY", "")
    news_api_key = await settings_service.get_value(db, "NEWS_API_KEY", "")
    prompt_template = await settings_service.get_value(db, "NEWS_PROMPT_TEMPLATE", "")
    exclude_raw = await settings_service.get_value(db, "NEWS_EXCLUDE_CATEGORIES", "")
    excluded = {c.strip().lower() for c in exclude_raw.split(",") if c.strip()}

    # Active AI provider (multi-provider engine); None → legacy fallback path.
    provider = await ai_providers.get_active_provider(db) if ai_enabled else None
    sources = await _configured_sources(db)

    collected: list[dict] = []
    async with httpx.AsyncClient() as client:
        for source_name, url in sources:
            collected.extend(await _fetch_rss(client, source_name, url))
        collected.extend(await _fetch_github_trending(client))
        if news_api_key:
            collected.extend(await _fetch_newsapi(client, news_api_key))

    if not collected:
        return 0

    seen_urls: set[str] = set()
    deduped: list[dict] = []
    for article in collected:
        url = article["source_url"]
        if url in seen_urls:
            continue
        seen_urls.add(url)
        deduped.append(article)

    existing_rows = (
        await db.execute(
            select(NewsArticle.source_url).where(NewsArticle.source_url.in_(seen_urls))
        )
    ).all()
    existing_urls = {row[0] for row in existing_rows}
    new_articles = [a for a in deduped if a["source_url"] not in existing_urls][:max_articles]

    imported = 0
    for article in new_articles:
        category = classify_category(article["title"], article["description"])
        if category.lower() in excluded:
            continue
        if provider is not None:
            summary = await summarize_via_provider(
                provider, article["title"], article["description"], prompt_template
            )
        else:
            summary = await summarize_article(
                article["title"], article["description"], anthropic_key, ai_enabled
            )
        tags = ""
        if tags_enabled and provider is not None:
            tags = await generate_tags(provider, article["title"], summary)
        db.add(
            NewsArticle(
                title=article["title"][:500],
                summary=summary,
                image_url=article.get("image_url"),
                source_url=article["source_url"],
                source_name=article["source_name"],
                category=category,
                tags=tags,
                reading_time=reading_time(summary),
                published_at=article["published_at"],
            )
        )
        imported += 1

    if imported:
        await db.commit()
        if notify_users:
            await notifier.notify_all_users(
                db,
                type="news",
                title="Fresh dev news is in",
                body=f"{imported} new article{'s' if imported != 1 else ''} just landed on DevAnnounce.",
                link="/news",
            )

    return imported
