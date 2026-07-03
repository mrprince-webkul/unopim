import Link from "next/link";
import { ArrowUpRight, Hash, Layers, Newspaper } from "lucide-react";

import { HomeFeed } from "@/components/home/home-feed";
import { HomeHero } from "@/components/home/home-hero";
import { JoinCard } from "@/components/home/join-card";
import { timeAgo } from "@/lib/utils";
import type { Announcement, Category, NewsArticle, Paginated } from "@/lib/types";

export const dynamic = "force-dynamic";

const API_BASE = process.env.INTERNAL_API_URL ?? "http://localhost:8080";

async function fetchJson<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${API_BASE}/api/v1${path}`, { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

async function getRailData() {
  const [posts, news, categories] = await Promise.all([
    fetchJson<Paginated<Announcement>>("/announcements?sort=latest&size=50"),
    fetchJson<Paginated<NewsArticle>>("/news?size=5"),
    fetchJson<Category[]>("/categories"),
  ]);

  const tagCounts = new Map<string, number>();
  for (const post of posts?.items ?? []) {
    for (const tag of post.tags) tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
  }
  const topTags = [...tagCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([tag, count]) => ({ tag, count }));

  const topCategories = [...(categories ?? [])]
    .sort((a, b) => b.posts_count - a.posts_count)
    .slice(0, 6);

  return { news: news?.items ?? [], topTags, topCategories };
}

function RailCard({
  title,
  icon: Icon,
  href,
  children,
}: {
  title: string;
  icon: typeof Newspaper;
  href?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border bg-card">
      <div className="flex items-center gap-2 border-b border-border/70 px-4 py-3">
        <Icon className="h-3.5 w-3.5 text-primary" />
        <h2 className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          {title}
        </h2>
        {href ? (
          <Link
            href={href}
            className="ml-auto inline-flex items-center gap-0.5 text-[11.5px] font-medium text-primary hover:opacity-80"
          >
            View all
            <ArrowUpRight className="h-3 w-3" />
          </Link>
        ) : null}
      </div>
      <div className="p-2">{children}</div>
    </section>
  );
}

export default async function HomePage() {
  const { news, topTags, topCategories } = await getRailData();
  const branding = (await fetchJson<Record<string, string>>("/settings/public")) ?? {};
  const copyright = branding.BRAND_COPYRIGHT || "© DevAnnounce";

  return (
    <div className="mx-auto grid w-full max-w-[1200px] items-start gap-6 p-4 sm:p-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="min-w-0 space-y-8">
        <HomeHero />
        <HomeFeed />
      </div>

      <aside className="space-y-4 lg:sticky lg:top-20">
        <JoinCard />

        <RailCard title="Dev News" icon={Newspaper} href="/news">
          {news.length > 0 ? (
            <div className="space-y-0.5">
              {news.map((article) => (
                <a
                  key={article.id}
                  href={article.source_url}
                  target="_blank"
                  rel="noreferrer"
                  className="group block rounded-lg px-2 py-2 transition-colors hover:bg-accent"
                >
                  <div className="flex items-center gap-2">
                    <span className="rounded border border-primary/25 bg-primary/[0.07] px-1.5 py-px font-mono text-[9px] font-medium uppercase tracking-wider text-primary">
                      {article.category}
                    </span>
                    <span className="text-[10.5px] text-muted-foreground/70">
                      {timeAgo(article.published_at)}
                    </span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-[13px] font-medium leading-snug text-foreground/90 transition-colors group-hover:text-foreground">
                    {article.title}
                  </p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">{article.source_name}</p>
                </a>
              ))}
            </div>
          ) : (
            <p className="px-2 py-3 text-[12.5px] text-muted-foreground">
              No news yet — the nightly import runs at 00:00 UTC.
            </p>
          )}
        </RailCard>

        <RailCard title="Trending tags" icon={Hash}>
          <div className="flex flex-wrap gap-1.5 p-2">
            {topTags.length > 0 ? (
              topTags.map(({ tag, count }) => (
                <Link
                  key={tag}
                  href={`/general?tag=${encodeURIComponent(tag)}`}
                  className="rounded-md border border-border bg-secondary/40 px-2 py-1 font-mono text-[11px] text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
                >
                  #{tag}
                  <span className="ml-1 text-muted-foreground/50">{count}</span>
                </Link>
              ))
            ) : (
              <p className="text-[12.5px] text-muted-foreground">No tags yet.</p>
            )}
          </div>
        </RailCard>

        <RailCard title="Categories" icon={Layers} href="/categories">
          <div className="space-y-0.5">
            {topCategories.map((category) => (
              <Link
                key={category.id}
                href={`/general?category=${category.slug}`}
                className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-[13px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: category.color ?? "hsl(var(--primary))" }}
                />
                <span className="truncate">{category.name}</span>
                <span className="ml-auto font-mono text-[11px] text-muted-foreground/60">
                  {category.posts_count}
                </span>
              </Link>
            ))}
          </div>
        </RailCard>

        <p className="px-2 text-[11px] leading-5 text-muted-foreground/60">
          {copyright} ·{" "}
          <a href="/api/v1/docs" target="_blank" rel="noreferrer" className="hover:text-muted-foreground">
            API
          </a>{" "}
          ·{" "}
          <Link href="/search" className="hover:text-muted-foreground">
            Search
          </Link>
        </p>
      </aside>
    </div>
  );
}
