"""Idempotent database seeding.

Always seeds: the single admin account, default site settings, and the 8
launch categories. When `SEED_DEMO_DATA=true`, additionally seeds 5 demo
users, ~14 published announcements (plus one draft) with realistic
engagement (likes/comments/bookmarks/follows + scattered analytics view
events), ~10 news articles, a handful of notifications, and a few activity
log entries.

Safe to run repeatedly: it no-ops as soon as an admin user already exists.
Run directly via `python -m app.seed`.
"""

from __future__ import annotations

import asyncio
import logging
import random
from datetime import datetime, timedelta, timezone

from sqlalchemy import select

from app.core.config import settings
from app.core.database import AsyncSessionLocal, engine
from app.core.security import hash_password
from app.models.activity import ActivityLog
from app.models.analytics import AnalyticsEvent
from app.models.announcement import Announcement, Bookmark, Like, Tag
from app.models.category import Category
from app.models.comment import Comment
from app.models.news import NewsArticle
from app.models.notification import Notification
from app.models.user import Follow, User
from app.services.ai_providers import seed_default_providers
from app.services.settings_service import seed_default_settings
from app.utils import slugify

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s [%(name)s] %(message)s")
logger = logging.getLogger("devannounce.seed")

ADMIN_EMAIL = "admin@devannounce.com"
ADMIN_USERNAME = "admin"
DEMO_PASSWORD = "password123"

CATEGORIES = [
    {
        "name": "AI & ML",
        "icon": "brain-circuit",
        "color": "#8b5cf6",
        "description": "Artificial intelligence, machine learning, and LLM engineering.",
    },
    {
        "name": "Web Development",
        "icon": "layout-template",
        "color": "#3b82f6",
        "description": "Frontend, backend, and full-stack web engineering.",
    },
    {
        "name": "DevOps & Cloud",
        "icon": "cloud",
        "color": "#06b6d4",
        "description": "Infrastructure, CI/CD, and cloud-native operations.",
    },
    {
        "name": "Databases",
        "icon": "database",
        "color": "#10b981",
        "description": "Relational, NoSQL, and distributed data stores.",
    },
    {
        "name": "Open Source",
        "icon": "git-branch",
        "color": "#f59e0b",
        "description": "Open source projects, releases, and community news.",
    },
    {
        "name": "Mobile",
        "icon": "smartphone",
        "color": "#ec4899",
        "description": "iOS, Android, and cross-platform mobile development.",
    },
    {
        "name": "Security",
        "icon": "shield",
        "color": "#ef4444",
        "description": "Application security, supply chain, and infrastructure hardening.",
    },
    {
        "name": "Tooling",
        "icon": "wrench",
        "color": "#6366f1",
        "description": "Developer tooling, CLIs, and productivity.",
    },
]

DEMO_USERS = [
    {
        "username": "ada",
        "email": "ada@devannounce.com",
        "full_name": "Ada Lovelace",
        "bio": "Writing algorithms since 1843. Now shipping DevAnnounce's frontend.",
        "github_url": "https://github.com/ada",
        "avatar_seed": "ada-lovelace",
    },
    {
        "username": "linus",
        "email": "linus@devannounce.com",
        "full_name": "Linus Torvalds",
        "bio": "I write kernels, and occasionally version control systems.",
        "github_url": "https://github.com/torvalds",
        "avatar_seed": "linus-torvalds",
    },
    {
        "username": "grace",
        "email": "grace@devannounce.com",
        "full_name": "Grace Hopper",
        "bio": "Compilers, COBOL, and convincing people that bugs are literal.",
        "github_url": "https://github.com/grace-hopper",
        "avatar_seed": "grace-hopper",
    },
    {
        "username": "guido",
        "email": "guido@devannounce.com",
        "full_name": "Guido van Rossum",
        "bio": "Benevolent dictator emeritus. Fan of readable code and significant whitespace.",
        "github_url": "https://github.com/gvanrossum",
        "avatar_seed": "guido-van-rossum",
    },
    {
        "username": "margaret",
        "email": "margaret@devannounce.com",
        "full_name": "Margaret Hamilton",
        "bio": "Wrote the software that landed Apollo 11. Now writing Kubernetes operators.",
        "github_url": "https://github.com/margaret-hamilton",
        "avatar_seed": "margaret-hamilton",
    },
]

COMMENT_TEMPLATES = [
    "This is great work, thanks for writing it up in detail.",
    "We ran into the exact same issue last quarter — glad to see it documented.",
    "Curious how this performs at higher concurrency, any benchmarks?",
    "Bookmarking this for our next architecture review.",
    "Nice writeup! Did you consider the tradeoffs with the alternative approach?",
    "This matches what we've seen in production too.",
    "Really clear explanation, the code samples helped a lot.",
    "Following up — would love a part two on this.",
]

REPLY_TEMPLATES = [
    "Good question — we benchmarked it at ~5k req/s on a single node.",
    "Yep, we considered it but the operational overhead wasn't worth it for our team size.",
    "Thanks! Glad it was useful.",
    "Same experience here, this saved us a lot of debugging time.",
    "Working on a follow-up post now, stay tuned.",
]


def _avatar_url(seed: str) -> str:
    return f"https://api.dicebear.com/9.x/identicon/svg?seed={seed}"


def _build_content(
    intro: str,
    highlights: list[str],
    code_lang: str,
    code: str,
    table: list[tuple[str, ...]] | None = None,
    outro: str = "",
) -> str:
    """Assemble a markdown body with a heading, bullet list, code block, and optional table."""
    parts = [intro, "", "## Highlights", ""]
    parts += [f"- {h}" for h in highlights]
    parts += ["", "## Example", "", f"```{code_lang}", code, "```"]
    if table:
        header, *rows = table
        parts += ["", "## Comparison", "", "| " + " | ".join(header) + " |"]
        parts.append("|" + "|".join(["---"] * len(header)) + "|")
        for row in rows:
            parts.append("| " + " | ".join(row) + " |")
    if outro:
        parts += ["", outro]
    return "\n".join(parts)


def _announcement_defs() -> list[dict]:
    return [
        {
            "title": "FastAPI Hits 1.0: Async by Default, Stability for Everyone",
            "author": "guido",
            "category": "Web Development",
            "tags": ["fastapi", "python", "async", "api"],
            "description": (
                "The FastAPI core team ships a stable 1.0 release with a hardened async "
                "pipeline, first-class WebSockets, and a smaller dependency footprint."
            ),
            "content": _build_content(
                "After four years in the `0.x` series, FastAPI 1.0 is finally here. The "
                "headline change is a fully async-by-default request pipeline — sync "
                "path operations are now automatically off-loaded to a bounded thread pool "
                "instead of the default executor.",
                [
                    "Native WebSocket dependency injection, matching HTTP routes",
                    "Startup time reduced by ~35% via lazy OpenAPI schema generation",
                    "First-class Pydantic v2 support with zero shims",
                    "New `Annotated`-first dependency syntax across the docs",
                ],
                "python",
                (
                    "from fastapi import FastAPI\n\n"
                    "app = FastAPI()\n\n"
                    '@app.get("/health")\n'
                    "async def health() -> dict:\n"
                    '    return {"status": "ok"}\n'
                ),
                table=[
                    ("Metric", "0.115", "1.0"),
                    ("Cold start", "420ms", "270ms"),
                    ("P99 latency", "18ms", "11ms"),
                ],
            ),
            "github_url": "https://github.com/fastapi/fastapi",
            "days_ago": 2,
        },
        {
            "title": "Introducing the DevAnnounce CLI: Ship Announcements from Your Terminal",
            "author": "ada",
            "category": "Tooling",
            "tags": ["cli", "devtools", "productivity"],
            "description": (
                "A new command-line tool lets you draft, preview, and publish DevAnnounce "
                "posts without leaving your terminal."
            ),
            "content": _build_content(
                "Most of us live in a terminal all day, so we built a CLI that mirrors the "
                "web editor: draft in markdown, preview locally, and publish with a single "
                "command.",
                [
                    "`da new` scaffolds a post with frontmatter for tags/category",
                    "`da preview` renders the markdown exactly as the web app does",
                    "`da publish` uploads attachments and sets the announcement live",
                    "Ships as a single static binary, no runtime dependencies",
                ],
                "bash",
                (
                    'da new "My Announcement"\nda preview ./my-announcement.md\nda publish ./my-announcement.md\n'
                ),
            ),
            "github_url": "https://github.com/devannounce/cli",
            "cta_label": "Install the CLI",
            "cta_url": "https://github.com/devannounce/cli#install",
            "days_ago": 5,
        },
        {
            "title": "PostgreSQL 17: What's New for Application Developers",
            "author": "linus",
            "category": "Databases",
            "tags": ["postgresql", "database", "sql"],
            "description": (
                "Incremental backups, faster vacuum, and a smarter query planner headline "
                "this release."
            ),
            "content": _build_content(
                "PostgreSQL 17 focuses on operational quality-of-life: backups, vacuum, and "
                "planner improvements that matter most once you're running at scale.",
                [
                    "Incremental backups via `pg_basebackup --incremental`",
                    "Vacuum now uses a new memory structure, up to 20x less memory",
                    "`MERGE` command now supports `RETURNING`",
                    "JSON_TABLE for turning JSON into relational rows",
                ],
                "sql",
                (
                    'SELECT *\nFROM JSON_TABLE(\n  \'[{"id":1,"name":"a"}]\', \'$[*]\'\n  '
                    "COLUMNS (id INT PATH '$.id', name TEXT PATH '$.name')\n) AS jt;\n"
                ),
                table=[
                    ("Feature", "PG 16", "PG 17"),
                    ("Vacuum memory", "1x", "0.05x"),
                    ("Incremental backup", "No", "Yes"),
                ],
            ),
            "days_ago": 8,
        },
        {
            "title": "Building Type-Safe APIs with FastAPI and Pydantic v2",
            "author": "grace",
            "category": "Web Development",
            "tags": ["fastapi", "pydantic", "validation", "typing"],
            "description": (
                "A practical walkthrough of schema-first API design using Pydantic v2's new "
                "validation engine."
            ),
            "content": _build_content(
                "Pydantic v2's Rust core (`pydantic-core`) made validation dramatically "
                "faster, but it also changed a few ergonomics worth knowing before you migrate.",
                [
                    "`model_config = ConfigDict(from_attributes=True)` replaces `orm_mode`",
                    "Field validators are now explicit with `@field_validator`",
                    "Discriminated unions are first-class via `Field(discriminator=...)`",
                    "Serialization is 5-50x faster than v1 in our benchmarks",
                ],
                "python",
                (
                    "from pydantic import BaseModel, ConfigDict\n\n"
                    "class UserRead(BaseModel):\n"
                    "    model_config = ConfigDict(from_attributes=True)\n"
                    "    id: int\n    username: str\n"
                ),
            ),
            "days_ago": 11,
        },
        {
            "title": "Kubernetes Cost Optimization Playbook",
            "author": "margaret",
            "category": "DevOps & Cloud",
            "tags": ["kubernetes", "cloud", "cost", "devops"],
            "description": (
                "Five battle-tested strategies our platform team used to cut our K8s bill by "
                "40% without touching reliability."
            ),
            "content": _build_content(
                "We spent a quarter auditing our cluster spend across three environments. "
                "Here's what actually moved the needle, in order of impact.",
                [
                    "Right-sized requests/limits using VPA in recommendation-only mode",
                    "Moved batch workloads to spot node pools with graceful eviction handling",
                    "Consolidated 40+ small services onto shared node pools via topology spread",
                    "Set namespace-level resource quotas to stop silent over-provisioning",
                ],
                "yaml",
                (
                    "apiVersion: v1\nkind: ResourceQuota\nmetadata:\n  name: team-quota\nspec:\n"
                    '  hard:\n    requests.cpu: "20"\n    requests.memory: 40Gi\n'
                ),
                table=[
                    ("Strategy", "Monthly savings"),
                    ("Right-sizing", "$14,200"),
                    ("Spot nodes", "$9,800"),
                    ("Consolidation", "$6,100"),
                ],
            ),
            "days_ago": 14,
        },
        {
            "title": "Open Sourcing Our Internal Redis Client",
            "author": "linus",
            "category": "Open Source",
            "tags": ["redis", "open-source", "client-library"],
            "description": (
                "After two years of internal use, we're releasing our high-throughput Redis "
                "client under the MIT license."
            ),
            "content": _build_content(
                "We built this client to squeeze more throughput out of pipelined Redis "
                "workloads than the libraries we tried. Today we're open-sourcing it.",
                [
                    "Automatic pipelining across concurrent callers in the same event loop",
                    "Zero-copy RESP3 parsing",
                    "Built-in circuit breaker for degraded Redis nodes",
                    "MIT licensed, no telemetry, no external dependencies",
                ],
                "python",
                (
                    'import fastredis\n\nclient = fastredis.connect("redis://localhost:6379/0")\nawait client.set("key", "value")\n'
                ),
            ),
            "github_url": "https://github.com/devannounce/fast-redis",
            "is_pinned": True,
            "is_featured": True,
            "days_ago": 1,
        },
        {
            "title": "Fine-Tuning Open Models for Code Review",
            "author": "guido",
            "category": "AI & ML",
            "tags": ["ai", "machine-learning", "llm", "code-review"],
            "description": (
                "We fine-tuned an open-weights model on 50k internal code reviews — here's "
                "what worked and what didn't."
            ),
            "content": _build_content(
                "Generic LLM code review is noisy: too many stylistic nits, not enough "
                "signal on architecture and correctness. Fine-tuning on our own review "
                "history fixed most of that.",
                [
                    "LoRA fine-tuning on 50k historical PR review comments",
                    "Precision on 'blocking' comments improved from 61% to 89%",
                    "Inference cost stayed flat by quantizing to 4-bit for serving",
                    "False positive rate on style nits dropped by 70%",
                ],
                "python",
                (
                    'from peft import LoraConfig\n\nconfig = LoraConfig(r=16, lora_alpha=32, target_modules=["q_proj", "v_proj"])\n'
                ),
            ),
            "is_featured": True,
            "days_ago": 4,
        },
        {
            "title": "Zero-Downtime Postgres Migrations at Scale",
            "author": "grace",
            "category": "Databases",
            "tags": ["postgresql", "migrations", "sre"],
            "description": (
                "How we run schema migrations against a 4TB production database without a "
                "single dropped connection."
            ),
            "content": _build_content(
                "Every migration follows the same expand/contract pattern: add, backfill, "
                "swap, remove — never a blocking rewrite in a single step.",
                [
                    "Add new columns as nullable, backfill in batches with `LIMIT`/`OFFSET`",
                    "Use `CREATE INDEX CONCURRENTLY` to avoid table locks",
                    "Dual-write during the transition window, verified with checksums",
                    "Automated rollback plan tested in staging before every migration",
                ],
                "sql",
                ("CREATE INDEX CONCURRENTLY idx_announcements_slug\nON announcements (slug);\n"),
            ),
            "days_ago": 17,
        },
        {
            "title": "Securing Your Supply Chain: SBOMs in Practice",
            "author": "margaret",
            "category": "Security",
            "tags": ["security", "supply-chain", "sbom"],
            "description": (
                "A pragmatic guide to generating, publishing, and verifying software bills "
                "of materials in CI."
            ),
            "content": _build_content(
                "SBOMs only help if they're generated automatically, published somewhere "
                "discoverable, and actually checked before deploy — here's our setup.",
                [
                    "Generate CycloneDX SBOMs on every build with `syft`",
                    "Publish signed SBOMs as release artifacts",
                    "Gate deploys on `grype` scan results above medium severity",
                    "Rotate signing keys quarterly via our KMS",
                ],
                "bash",
                (
                    "syft packages dir:. -o cyclonedx-json=sbom.json\ngrype sbom:sbom.json --fail-on medium\n"
                ),
            ),
            "days_ago": 20,
        },
        {
            "title": "React Server Components: A Practical Guide",
            "author": "ada",
            "category": "Web Development",
            "tags": ["react", "nextjs", "javascript"],
            "description": (
                "What changes (and what doesn't) when you move a real production app to "
                "server components."
            ),
            "content": _build_content(
                "Server components aren't a rewrite — they're a new default for anything "
                "that doesn't need interactivity. Here's how we migrated incrementally.",
                [
                    "Start with leaf components with no `useState`/`useEffect`",
                    "Keep client boundaries small and push them down the tree",
                    "Data fetching moves into the component, no more prop drilling",
                    "Bundle size dropped 31% after migrating our dashboard",
                ],
                "tsx",
                (
                    "// app/announcements/page.tsx\n"
                    "export default async function Page() {\n"
                    "  const data = await getAnnouncements();\n"
                    "  return <List items={data} />;\n"
                    "}\n"
                ),
            ),
            "days_ago": 6,
        },
        {
            "title": "Announcing the DevAnnounce Mobile Beta",
            "author": "ada",
            "category": "Mobile",
            "tags": ["mobile", "ios", "android", "beta"],
            "description": (
                "Read announcements, get push notifications, and bookmark posts on the go — "
                "sign up for the beta today."
            ),
            "content": _build_content(
                "We've heard you: the timeline is better on a phone. The beta ships with "
                "push notifications, offline reading, and biometric login.",
                [
                    "Push notifications for likes, comments, and follows",
                    "Offline reading list synced from your bookmarks",
                    "Face ID / fingerprint login",
                    "Built with React Native + Expo, same design system as web",
                ],
                "tsx",
                (
                    'import { useNotifications } from "@devannounce/mobile";\n\nconst { unreadCount } = useNotifications();\n'
                ),
            ),
            "demo_url": "https://apps.devannounce.dev/beta",
            "cta_label": "Join the beta",
            "cta_url": "https://apps.devannounce.dev/beta",
            "is_pinned": True,
            "days_ago": 3,
        },
        {
            "title": "Docker Compose v3: Multi-Stage Dev Environments",
            "author": "linus",
            "category": "DevOps & Cloud",
            "tags": ["docker", "devops", "containers"],
            "description": (
                "Compose's new profile and multi-stage support make local dev environments "
                "faster to boot and easier to share."
            ),
            "content": _build_content(
                "The new `profiles` key lets one `docker-compose.yml` serve minimal, full, "
                "and CI configurations without duplicating service definitions.",
                [
                    "`profiles:` gates services behind named groups",
                    "`depends_on` now supports `condition: service_healthy`",
                    "Build cache is now shared across profiles by default",
                    "Cold start for our stack dropped from 90s to 35s",
                ],
                "yaml",
                (
                    'services:\n  worker:\n    profiles: ["full"]\n    depends_on:\n      redis:\n        condition: service_healthy\n'
                ),
            ),
            "days_ago": 23,
        },
        {
            "title": "Claude in Your CI Pipeline: AI Code Review at DevAnnounce",
            "author": "guido",
            "category": "AI & ML",
            "tags": ["ai", "claude", "ci-cd", "automation"],
            "description": (
                "We wired Claude into our pull request pipeline for first-pass code review. "
                "Here's the architecture and the guardrails."
            ),
            "content": _build_content(
                "Claude reviews every PR before a human does — not to replace reviewers, but "
                "to catch the obvious stuff fast so humans focus on architecture.",
                [
                    "Runs as a GitHub Action, posts inline review comments",
                    "Scoped to diffs only, never sees unrelated files",
                    "Confidence threshold before posting a 'blocking' comment",
                    "Caught 23% of bugs before human review in our first month",
                ],
                "yaml",
                (
                    "- name: AI Review\n  uses: devannounce/ai-review-action@v1\n  with:\n    model: claude-haiku-4-5-20251001\n"
                ),
            ),
            "github_url": "https://github.com/devannounce/ai-review-bot",
            "demo_url": "https://devannounce.dev/demos/ai-review",
            "is_featured": True,
            "days_ago": 9,
        },
        {
            "title": "Why We Chose Redis Streams Over Kafka for Notifications",
            "author": "grace",
            "category": "Tooling",
            "tags": ["redis", "kafka", "architecture"],
            "description": (
                "A smaller queue for a smaller team: the tradeoffs behind our real-time "
                "notification pipeline."
            ),
            "content": _build_content(
                "Kafka is the right answer at a certain scale. We're not at that scale yet, "
                "and Redis Streams gave us 90% of the benefit for a fraction of the ops cost.",
                [
                    "One less stateful system to operate and monitor",
                    "Consumer groups give us at-least-once delivery, same as Kafka",
                    "Sub-millisecond p99 publish latency in production",
                    "Revisit this decision above ~50k events/sec sustained",
                ],
                "python",
                ('await redis.xadd("notifications", {"user_id": 1, "type": "like"})\n'),
                table=[
                    ("", "Redis Streams", "Kafka"),
                    ("Ops overhead", "Low", "High"),
                    ("Our current load", "Fits", "Overkill"),
                ],
            ),
            "days_ago": 26,
        },
    ]


def _draft_def() -> dict:
    return {
        "title": "Draft: Upcoming Profile Redesign Notes",
        "author": "ada",
        "category": "Web Development",
        "tags": ["design", "wip"],
        "description": "Internal notes for the upcoming profile page redesign — not ready for publication yet.",
        "content": _build_content(
            "Rough notes ahead of the profile redesign kickoff meeting.",
            [
                "New tabbed layout for posts/bookmarks/activity",
                "Avatar upload via the uploads API",
                "Dark mode contrast pass",
            ],
            "text",
            "TODO: attach Figma link once ready.",
        ),
        "status": "draft",
        "days_ago": 0,
    }


NEWS_DEFS = [
    {
        "title": "Introducing GPT-5",
        "source_name": "OpenAI",
        "source_url": "https://openai.com/index/introducing-gpt-5/",
        "category": "AI",
        "summary": (
            "OpenAI's latest flagship model brings stronger reasoning and lower latency to "
            "the API, with a unified pricing tier replacing the previous model lineup."
        ),
        "days_ago": 3,
    },
    {
        "title": "Next.js 15",
        "source_name": "Vercel",
        "source_url": "https://nextjs.org/blog/next-15",
        "category": "Next.js",
        "summary": (
            "Next.js 15 stabilizes the App Router caching semantics, ships a new "
            "`after()` API for post-response work, and improves React 19 support."
        ),
        "days_ago": 6,
    },
    {
        "title": "Kubernetes v1.31 Release",
        "source_name": "Kubernetes Blog",
        "source_url": "https://kubernetes.io/blog/2024/08/13/kubernetes-v1-31-release/",
        "category": "Kubernetes",
        "summary": (
            "Kubernetes 1.31 graduates several storage and networking features to stable "
            "and improves the structured authorization configuration API."
        ),
        "days_ago": 9,
    },
    {
        "title": "Redis 8 is Generally Available",
        "source_name": "Redis",
        "source_url": "https://redis.io/blog/redis-8-ga/",
        "category": "Redis",
        "summary": (
            "Redis 8 merges Redis Stack capabilities into core, adding native JSON, search, "
            "and time series support without extra modules."
        ),
        "days_ago": 12,
    },
    {
        "title": "Docker Desktop 4.31",
        "source_name": "Docker Blog",
        "source_url": "https://www.docker.com/blog/docker-desktop-4-31/",
        "category": "Docker",
        "summary": (
            "This release focuses on faster builds via improved BuildKit caching and adds "
            "a redesigned resource usage dashboard."
        ),
        "days_ago": 15,
    },
    {
        "title": "GitHub Copilot Workspace",
        "source_name": "GitHub Blog",
        "source_url": "https://github.blog/2024-04-29-github-copilot-workspace/",
        "category": "AI",
        "summary": (
            "Copilot Workspace lets developers go from a GitHub issue to a working pull "
            "request through a task-oriented, AI-native flow."
        ),
        "days_ago": 18,
    },
    {
        "title": "PostgreSQL 17 Released",
        "source_name": "PostgreSQL",
        "source_url": "https://www.postgresql.org/about/news/postgresql-17-released-2936/",
        "category": "PostgreSQL",
        "summary": (
            "PostgreSQL 17 improves vacuum memory usage, adds incremental backups, and "
            "introduces the SQL/JSON `JSON_TABLE` function."
        ),
        "days_ago": 21,
    },
    {
        "title": "Announcing TypeScript 5.6",
        "source_name": "Microsoft DevBlogs",
        "source_url": "https://devblogs.microsoft.com/typescript/announcing-typescript-5-6/",
        "category": "TypeScript",
        "summary": (
            "TypeScript 5.6 adds disallowed nullish and truthy checks, iterator helper "
            "methods, and faster incremental builds."
        ),
        "days_ago": 24,
    },
    {
        "title": "React 19",
        "source_name": "React Blog",
        "source_url": "https://react.dev/blog/2024/04/25/react-19",
        "category": "React",
        "summary": (
            "React 19 stabilizes Actions, adds the `use()` hook for reading resources "
            "during render, and ships a new React Compiler in experimental form."
        ),
        "days_ago": 27,
    },
    {
        "title": "Django Security Releases",
        "source_name": "Django Project",
        "source_url": "https://www.djangoproject.com/weblog/",
        "category": "Python",
        "summary": (
            "The Django team shipped coordinated security patches addressing a "
            "denial-of-service vector in form field validation across supported branches."
        ),
        "days_ago": 29,
    },
]


async def _seed_core(db) -> tuple[User, dict[str, Category]]:
    """Seed the admin user, default settings, and categories. Always runs."""
    admin = User(
        email=ADMIN_EMAIL,
        username=ADMIN_USERNAME,
        password_hash=hash_password(DEMO_PASSWORD),
        full_name="DevAnnounce Admin",
        role="admin",
        is_verified=True,
    )
    db.add(admin)

    categories: dict[str, Category] = {}
    for cat_data in CATEGORIES:
        category = Category(
            name=cat_data["name"],
            slug=slugify(cat_data["name"]),
            description=cat_data["description"],
            icon=cat_data["icon"],
            color=cat_data["color"],
        )
        db.add(category)
        categories[cat_data["name"]] = category

    await db.flush()
    await seed_default_settings(db)  # commits internally
    await seed_default_providers(db)  # commits internally
    return admin, categories


async def _seed_demo_data(db, admin: User, categories: dict[str, Category]) -> None:
    """Seed demo users, announcements, engagement, news, notifications, and logs."""
    users: dict[str, User] = {}
    for u in DEMO_USERS:
        user = User(
            email=u["email"],
            username=u["username"],
            password_hash=hash_password(DEMO_PASSWORD),
            full_name=u["full_name"],
            bio=u["bio"],
            github_url=u["github_url"],
            avatar_url=_avatar_url(u["avatar_seed"]),
            role="user",
            is_verified=True,
        )
        db.add(user)
        users[u["username"]] = user
    await db.flush()

    all_users = [*users.values(), admin]
    tag_cache: dict[str, Tag] = {}
    now = datetime.now(timezone.utc)

    async def make_tags(names: list[str]) -> list[Tag]:
        tags = []
        for name in names:
            slug = slugify(name)
            tag = tag_cache.get(slug)
            if tag is None:
                tag = Tag(name=name, slug=slug)
                db.add(tag)
                await db.flush()
                tag_cache[slug] = tag
            tags.append(tag)
        return tags

    announcements: list[Announcement] = []
    for data in _announcement_defs():
        author = users[data["author"]]
        category = categories.get(data["category"])
        publish_date = now - timedelta(days=data["days_ago"], hours=random.randint(0, 23))
        announcement = Announcement(
            title=data["title"],
            slug=slugify(data["title"]),
            description=data["description"],
            content=data["content"],
            author_id=author.id,
            category_id=category.id if category else None,
            github_url=data.get("github_url"),
            website_url=data.get("website_url"),
            demo_url=data.get("demo_url"),
            cta_label=data.get("cta_label"),
            cta_url=data.get("cta_url"),
            status="published",
            is_pinned=data.get("is_pinned", False),
            is_featured=data.get("is_featured", False),
            publish_date=publish_date,
        )
        announcement.tags = await make_tags(data["tags"])
        db.add(announcement)
        await db.flush()
        announcements.append(announcement)

    # One draft, owned by ada, not counted among the published set above.
    draft_data = _draft_def()
    draft_author = users[draft_data["author"]]
    draft = Announcement(
        title=draft_data["title"],
        slug=slugify(draft_data["title"]),
        description=draft_data["description"],
        content=draft_data["content"],
        author_id=draft_author.id,
        category_id=categories.get(draft_data["category"]).id,
        status="draft",
        publish_date=now,
    )
    draft.tags = await make_tags(draft_data["tags"])
    db.add(draft)
    await db.flush()

    # Engagement: likes, bookmarks, comments (+ occasional reply), analytics views.
    for announcement in announcements:
        others = [u for u in all_users if u.id != announcement.author_id]

        likers = random.sample(others, k=random.randint(1, min(4, len(others))))
        for u in likers:
            db.add(Like(user_id=u.id, announcement_id=announcement.id))
        announcement.likes_count = len(likers)

        bookmarkers = random.sample(others, k=random.randint(0, min(3, len(others))))
        for u in bookmarkers:
            db.add(Bookmark(user_id=u.id, announcement_id=announcement.id))
        announcement.bookmarks_count = len(bookmarkers)

        comments_count = 0
        commenters = random.sample(others, k=random.randint(0, min(3, len(others))))
        for commenter in commenters:
            comment_time = announcement.publish_date + timedelta(
                hours=random.randint(1, 72), minutes=random.randint(0, 59)
            )
            comment = Comment(
                content=random.choice(COMMENT_TEMPLATES),
                author_id=commenter.id,
                announcement_id=announcement.id,
                created_at=min(comment_time, now),
            )
            db.add(comment)
            await db.flush()
            comments_count += 1
            if random.random() < 0.4:
                reply_candidates = [u for u in all_users if u.id != commenter.id]
                replier = random.choice(reply_candidates)
                reply = Comment(
                    content=random.choice(REPLY_TEMPLATES),
                    author_id=replier.id,
                    announcement_id=announcement.id,
                    parent_id=comment.id,
                    created_at=min(
                        comment.created_at + timedelta(hours=random.randint(1, 24)), now
                    ),
                )
                db.add(reply)
                comments_count += 1
        announcement.comments_count = comments_count

        announcement.views_count = random.randint(40, 400)
        for _ in range(random.randint(10, 30)):
            event_time = now - timedelta(
                days=random.randint(0, 29),
                hours=random.randint(0, 23),
                minutes=random.randint(0, 59),
            )
            db.add(
                AnalyticsEvent(
                    event_type="view",
                    announcement_id=announcement.id,
                    user_id=random.choice(all_users).id if random.random() < 0.3 else None,
                    created_at=event_time,
                )
            )

    # Follows: everyone follows a couple of others.
    seen_pairs: set[tuple[int, int]] = set()
    for follower in all_users:
        candidates = [u for u in all_users if u.id != follower.id]
        following = random.sample(candidates, k=random.randint(1, min(3, len(candidates))))
        for followee in following:
            pair = (follower.id, followee.id)
            if pair in seen_pairs:
                continue
            seen_pairs.add(pair)
            db.add(Follow(follower_id=follower.id, following_id=followee.id))

    # News articles.
    for news_data in NEWS_DEFS:
        published_at = now - timedelta(days=news_data["days_ago"])
        db.add(
            NewsArticle(
                title=news_data["title"],
                summary=news_data["summary"],
                source_url=news_data["source_url"],
                source_name=news_data["source_name"],
                category=news_data["category"],
                reading_time=max(1, len(news_data["summary"].split()) // 200 or 1),
                published_at=published_at,
            )
        )

    # A handful of notifications.
    sample_announcement = announcements[0]
    db.add(
        Notification(
            user_id=users["linus"].id,
            type="like",
            title="New like",
            body=f'{users["ada"].username} liked your announcement "{sample_announcement.title}"',
            link=f"/announcements/{sample_announcement.slug}",
            is_read=False,
        )
    )
    db.add(
        Notification(
            user_id=users["ada"].id,
            type="comment",
            title="New comment",
            body=f'{users["grace"].username} commented on your announcement',
            link=f"/announcements/{announcements[1].slug}",
            is_read=True,
        )
    )
    db.add(
        Notification(
            user_id=users["guido"].id,
            type="follow",
            title="New follower",
            body=f'{users["margaret"].username} started following you',
            link=f"/users/{users['margaret'].username}",
            is_read=False,
        )
    )
    db.add(
        Notification(
            user_id=admin.id,
            type="news",
            title="Fresh dev news is in",
            body="10 new articles just landed on DevAnnounce.",
            link="/news",
            is_read=True,
        )
    )

    # A few activity logs.
    db.add(ActivityLog(user_id=admin.id, action="seed", detail="Initial database seed completed."))
    db.add(
        ActivityLog(
            user_id=admin.id,
            action="fetch_news",
            detail=f"Seeded {len(NEWS_DEFS)} news article(s).",
        )
    )
    db.add(
        ActivityLog(
            user_id=admin.id,
            action="pin_announcement",
            detail=f"Pinned announcement '{announcements[5].title}'.",
        )
    )

    await db.commit()


async def seed() -> None:
    async with AsyncSessionLocal() as db:
        existing_admin = (
            await db.execute(select(User).where(User.role == "admin"))
        ).scalar_one_or_none()
        if existing_admin is not None:
            logger.info("Seed skipped: an admin user already exists.")
            return

        logger.info("Seeding core data (admin, settings, categories)...")
        admin, categories = await _seed_core(db)

        if settings.SEED_DEMO_DATA:
            logger.info("SEED_DEMO_DATA=true — seeding demo users, announcements, and news...")
            await _seed_demo_data(db, admin, categories)
            logger.info("Demo data seeded.")
        else:
            logger.info("SEED_DEMO_DATA=false — skipping demo data.")

    logger.info("Seed complete.")


async def main() -> None:
    try:
        await seed()
    finally:
        await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
