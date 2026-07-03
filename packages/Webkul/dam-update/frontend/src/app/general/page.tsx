"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { PlusCircle, Rss, X } from "lucide-react";

import { AnnouncementFeed } from "@/components/feed/announcement-feed";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/lib/auth";
import { categoriesApi } from "@/lib/api";
import { cn, formatNumber } from "@/lib/utils";
import type { Announcement, AnnouncementSort } from "@/lib/types";

const SORTS: { value: AnnouncementSort; label: string }[] = [
  { value: "latest", label: "Latest" },
  { value: "popular", label: "Popular" },
  { value: "trending", label: "Trending" },
];

function GeneralFeedPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();

  const category = searchParams.get("category") ?? undefined;
  const tag = searchParams.get("tag") ?? undefined;
  const sort = ((searchParams.get("sort") as AnnouncementSort | null) ?? "latest") as AnnouncementSort;

  const [loadedItems, setLoadedItems] = useState<Announcement[]>([]);

  const { data: categories } = useQuery({ queryKey: ["categories"], queryFn: categoriesApi.list });

  function updateParams(next: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(next)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    const qs = params.toString();
    router.push(`/general${qs ? `?${qs}` : ""}`);
  }

  const activeCategory = useMemo(
    () => (categories ?? []).find((c) => c.slug === category),
    [categories, category],
  );

  const topCategories = useMemo(
    () => [...(categories ?? [])].sort((a, b) => b.posts_count - a.posts_count).slice(0, 6),
    [categories],
  );

  const popularTags = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of loadedItems) {
      for (const t of item.tags) counts.set(t, (counts.get(t) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 14);
  }, [loadedItems]);

  return (
    <div className="container py-10">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-2 font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
            Community feed
          </p>
          <h1 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Launches &amp; releases
          </h1>
          <p className="mt-2 max-w-lg text-sm leading-6 text-muted-foreground">
            Launches, releases, and updates shared by the DevAnnounce community.
          </p>
        </div>
        {user ? (
          <Button asChild variant="gradient" size="sm">
            <Link href="/announcements/new">
              <PlusCircle className="h-4 w-4" />
              Write an announcement
            </Link>
          </Button>
        ) : null}
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_300px]">
        <div className="min-w-0">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <Tabs value={sort} onValueChange={(v) => updateParams({ sort: v === "latest" ? null : v })}>
              <TabsList>
                {SORTS.map((s) => (
                  <TabsTrigger key={s.value} value={s.value}>
                    {s.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>

            {activeCategory || tag ? (
              <div className="flex flex-wrap items-center gap-2">
                {activeCategory ? (
                  <button
                    type="button"
                    onClick={() => updateParams({ category: null })}
                    className="inline-flex items-center gap-1 rounded-full border border-primary/40 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary"
                  >
                    {activeCategory.name}
                    <X className="h-3 w-3" />
                  </button>
                ) : null}
                {tag ? (
                  <button
                    type="button"
                    onClick={() => updateParams({ tag: null })}
                    className="inline-flex items-center gap-1 rounded-full border border-primary/40 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary"
                  >
                    #{tag}
                    <X className="h-3 w-3" />
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>

          {categories && categories.length > 0 ? (
            <div className="mb-5 flex flex-wrap gap-2">
              {categories.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => updateParams({ category: category === c.slug ? null : c.slug })}
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                    category === c.slug
                      ? "border-primary/40 bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/30 hover:text-foreground",
                  )}
                >
                  {c.name}
                </button>
              ))}
            </div>
          ) : null}

          <AnnouncementFeed
            category={category}
            tag={tag}
            sort={sort}
            gridClassName="grid-cols-1"
            onItemsChange={setLoadedItems}
            emptyTitle="Nothing here yet"
            emptyDescription="Try a different filter, or check back once the community posts more."
          />
        </div>

        <aside className="space-y-6">
          {topCategories.length > 0 ? (
            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle className="font-display text-base">Top categories</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                {topCategories.map((c) => (
                  <Link
                    key={c.id}
                    href={`/general?category=${c.slug}`}
                    className="card-hover flex items-center justify-between rounded-lg px-2 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
                  >
                    <span>{c.name}</span>
                    <span className="font-mono text-xs text-muted-foreground">{formatNumber(c.posts_count)}</span>
                  </Link>
                ))}
              </CardContent>
            </Card>
          ) : null}

          {popularTags.length > 0 ? (
            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle className="font-display text-base">Popular tags</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {popularTags.map(([t]) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => updateParams({ tag: tag === t ? null : t })}
                    className={cn(
                      "rounded-full px-2.5 py-1 font-mono text-xs transition-colors",
                      tag === t
                        ? "bg-primary/10 text-primary"
                        : "bg-secondary text-secondary-foreground hover:bg-secondary/70",
                    )}
                  >
                    #{t}
                  </button>
                ))}
              </CardContent>
            </Card>
          ) : null}

          {!user ? (
            <Card className="border-beam relative overflow-hidden rounded-2xl border-primary/25">
              <div className="bg-aurora pointer-events-none absolute inset-0" />
              <CardHeader className="relative">
                <CardTitle className="font-display text-base">Join DevAnnounce</CardTitle>
              </CardHeader>
              <CardContent className="relative space-y-3">
                <p className="text-sm text-muted-foreground">
                  Create an account to post announcements, follow developers, and bookmark what matters.
                </p>
                <Button asChild variant="gradient" className="w-full">
                  <Link href="/register">Create account</Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-beam relative overflow-hidden rounded-2xl">
              <div className="bg-aurora pointer-events-none absolute inset-0" />
              <CardHeader className="relative">
                <CardTitle className="flex items-center gap-2 font-display text-base">
                  <Rss className="h-4 w-4 text-primary" />
                  Write an announcement
                </CardTitle>
              </CardHeader>
              <CardContent className="relative space-y-3">
                <p className="text-sm text-muted-foreground">Share what you shipped with the community.</p>
                <Button asChild variant="gradient" className="w-full">
                  <Link href="/announcements/new">
                    <PlusCircle className="h-4 w-4" />
                    New announcement
                  </Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </aside>
      </div>
    </div>
  );
}

export default function GeneralPage() {
  return (
    <Suspense fallback={null}>
      <GeneralFeedPage />
    </Suspense>
  );
}
