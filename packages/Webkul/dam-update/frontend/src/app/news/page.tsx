"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Newspaper, Search } from "lucide-react";

import { NewsCard, FeaturedNewsCard } from "@/components/news/news-card";
import { PageHeader, HeaderStats } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useDebouncedValue } from "@/hooks/use-debounce";
import { newsApi } from "@/lib/api";
import { cn, formatNumber } from "@/lib/utils";

const SIZE = 10;
const GRID_CLASS = "grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5";

function NewsCardSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-border bg-card">
      <Skeleton className="h-24 w-full rounded-none" />
      <div className="flex flex-col gap-2 p-3">
        <Skeleton className="h-4 w-4/5" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-2/3" />
      </div>
    </div>
  );
}

/** Build a compact page-number window: 1 … n-1 [n] n+1 … last. */
function pageWindow(current: number, total: number): (number | "…")[] {
  const wanted = new Set([1, total, current, current - 1, current + 1]);
  const pages = [...wanted].filter((n) => n >= 1 && n <= total).sort((a, b) => a - b);
  const out: (number | "…")[] = [];
  let prev = 0;
  for (const n of pages) {
    if (n - prev > 1) out.push("…");
    out.push(n);
    prev = n;
  }
  return out;
}

function Pagination({
  page,
  pages,
  onChange,
}: {
  page: number;
  pages: number;
  onChange: (p: number) => void;
}) {
  const btn =
    "flex h-9 min-w-9 items-center justify-center rounded-lg border border-border bg-card px-3 text-sm font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground disabled:pointer-events-none disabled:opacity-40";

  return (
    <nav className="mt-8 flex items-center justify-center gap-1.5" aria-label="Pagination">
      <button className={btn} disabled={page <= 1} onClick={() => onChange(page - 1)} aria-label="Previous page">
        <ChevronLeft className="h-4 w-4" />
      </button>
      {pageWindow(page, pages).map((n, i) =>
        n === "…" ? (
          <span key={`e${i}`} className="px-1.5 text-sm text-muted-foreground/60">
            …
          </span>
        ) : (
          <button
            key={n}
            onClick={() => onChange(n)}
            aria-current={n === page ? "page" : undefined}
            className={cn(
              btn,
              n === page &&
                "border-primary/50 bg-primary/10 text-primary shadow-[inset_0_0_0_1px_hsl(var(--primary)/0.3)] hover:text-primary",
            )}
          >
            {n}
          </button>
        ),
      )}
      <button className={btn} disabled={page >= pages} onClick={() => onChange(page + 1)} aria-label="Next page">
        <ChevronRight className="h-4 w-4" />
      </button>
    </nav>
  );
}

function NewsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const category = searchParams.get("category") ?? undefined;
  const initialQ = searchParams.get("q") ?? "";
  const page = Math.max(1, Number(searchParams.get("page") ?? "1") || 1);

  const [search, setSearch] = useState(initialQ);
  const debouncedSearch = useDebouncedValue(search, 400);

  // Sync the debounced search into the URL — but only when it actually changes
  // (not on mount), so deep-linking to ?page=N doesn't get its page stripped.
  useEffect(() => {
    const currentQ = searchParams.get("q") ?? "";
    if (debouncedSearch === currentQ) return;
    const params = new URLSearchParams(searchParams.toString());
    if (debouncedSearch) params.set("q", debouncedSearch);
    else params.delete("q");
    params.delete("page"); // a new search resets to page 1
    const qs = params.toString();
    router.replace(`/news${qs ? `?${qs}` : ""}`, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  const { data: categories } = useQuery({ queryKey: ["news", "categories"], queryFn: newsApi.categories });

  const { data, isLoading, isError, isFetching } = useQuery({
    queryKey: ["news", "feed", { category, q: debouncedSearch, page }],
    queryFn: () => newsApi.list({ page, size: SIZE, category, q: debouncedSearch || undefined }),
    placeholderData: keepPreviousData,
  });

  const articles = data?.items ?? [];
  const total = data?.total;
  const pages = data?.pages ?? 1;
  const topicCount = categories?.length ?? 0;

  // Two editorial lead stories, only on the unfiltered first page with enough articles.
  const showFeatured = page === 1 && !category && !debouncedSearch && articles.length >= 4;
  const featured = showFeatured ? articles.slice(0, 2) : [];
  const gridArticles = showFeatured ? articles.slice(2) : articles;

  function setCategory(next: string | undefined) {
    const params = new URLSearchParams(searchParams.toString());
    if (next) params.set("category", next);
    else params.delete("category");
    params.delete("page");
    const qs = params.toString();
    router.push(`/news${qs ? `?${qs}` : ""}`);
  }

  function goToPage(p: number) {
    const params = new URLSearchParams(searchParams.toString());
    if (p > 1) params.set("page", String(p));
    else params.delete("page");
    const qs = params.toString();
    router.push(`/news${qs ? `?${qs}` : ""}`, { scroll: false });
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="container py-8 sm:py-10">
      <PageHeader
        eyebrow="Dev news"
        icon={Newspaper}
        title="Stay current with the"
        highlight="ecosystem"
        description="Imported nightly from Hacker News, Dev.to, GitHub trending, and more — deduplicated, categorized, and summarized so you can skim what matters."
        actions={
          total != null ? (
            <HeaderStats
              items={[
                { label: "Articles", value: formatNumber(total) },
                { label: "Topics", value: String(topicCount) },
              ]}
            />
          ) : undefined
        }
      >
        <span className="mt-4 inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/[0.07] px-3 py-1.5 text-xs font-medium text-primary">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
          </span>
          Curated nightly at 00:00 UTC · summarized by AI
        </span>
      </PageHeader>

      {/* Sticky glass filter toolbar */}
      <div className="sticky top-14 z-30 -mx-1 mb-6 mt-6 px-1">
        <div className="flex items-center gap-3 rounded-xl border border-border bg-background/70 p-2 shadow-sm backdrop-blur-xl">
          <div className="mask-fade-x flex-1 overflow-x-auto scrollbar-none">
            <div className="flex gap-1.5">
              <FilterChip active={!category} onClick={() => setCategory(undefined)}>
                All
              </FilterChip>
              {(categories ?? []).map((c) => (
                <FilterChip
                  key={c}
                  active={category === c}
                  onClick={() => setCategory(category === c ? undefined : c)}
                >
                  {c}
                </FilterChip>
              ))}
            </div>
          </div>

          <div className="relative hidden w-56 shrink-0 sm:block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search news…"
              className="h-9 border-transparent bg-secondary/50 pl-9"
            />
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className={GRID_CLASS}>
          {Array.from({ length: 10 }).map((_, i) => (
            <NewsCardSkeleton key={i} />
          ))}
        </div>
      ) : isError ? (
        <EmptyState title="Couldn't load news" description="Something went wrong. Try refreshing the page." />
      ) : articles.length === 0 ? (
        <EmptyState
          icon={Newspaper}
          title="No articles found"
          description="Try a different search term or category."
        />
      ) : (
        <div className={cn("space-y-6 transition-opacity", isFetching && "opacity-60")}>
          {featured.length > 0 ? (
            <div className="grid gap-4 lg:grid-cols-2">
              {featured.map((article) => (
                <FeaturedNewsCard key={article.id} article={article} />
              ))}
            </div>
          ) : null}

          <div className={GRID_CLASS}>
            {gridArticles.map((article) => (
              <NewsCard key={article.id} article={article} />
            ))}
          </div>

          {articles.length > 0 ? <Pagination page={page} pages={pages} onChange={goToPage} /> : null}
        </div>
      )}
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "shrink-0 whitespace-nowrap rounded-lg px-3 py-1.5 text-[13px] font-medium capitalize transition-colors",
        active
          ? "bg-primary/10 text-primary shadow-[inset_0_0_0_1px_hsl(var(--primary)/0.35)]"
          : "text-muted-foreground hover:bg-accent hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

export default function NewsPage() {
  return (
    <Suspense fallback={null}>
      <NewsPageContent />
    </Suspense>
  );
}
