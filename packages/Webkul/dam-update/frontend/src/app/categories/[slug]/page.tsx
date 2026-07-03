"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { AnnouncementFeed } from "@/components/feed/announcement-feed";
import { EmptyState } from "@/components/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { categoriesApi } from "@/lib/api";
import { resolveLucideIcon } from "@/lib/icons";
import { formatNumber } from "@/lib/utils";

export default function CategoryDetailPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;

  const { data: categories, isLoading, isError } = useQuery({
    queryKey: ["categories"],
    queryFn: categoriesApi.list,
  });

  const category = categories?.find((c) => c.slug === slug);

  if (isLoading) {
    return (
      <div className="container py-10">
        <div className="mb-8 flex items-center gap-4">
          <Skeleton className="h-14 w-14 rounded-2xl" />
          <div className="space-y-2">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>
      </div>
    );
  }

  if (isError || !category) {
    return (
      <div className="container py-10">
        <EmptyState
          title="Category not found"
          description="This category doesn't exist or may have been removed."
        />
      </div>
    );
  }

  const Icon = resolveLucideIcon(category.icon);

  return (
    <div className="container py-10">
      <div className="mb-8 flex items-center gap-4">
        <span
          className="glow-sm flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-border"
          style={{
            backgroundColor: `${category.color ?? "hsl(var(--primary))"}1a`,
            color: category.color ?? "hsl(var(--primary))",
          }}
        >
          <Icon className="h-7 w-7" />
        </span>
        <div>
          <p className="mb-1 font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
            Category
          </p>
          <h1 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            {category.name}
          </h1>
          {category.description ? <p className="mt-1 text-sm text-muted-foreground">{category.description}</p> : null}
          <p className="mt-1 font-mono text-xs font-medium text-muted-foreground">
            {formatNumber(category.posts_count)} posts
          </p>
        </div>
      </div>

      <AnnouncementFeed
        category={category.slug}
        gridClassName="sm:grid-cols-2 xl:grid-cols-3"
        emptyTitle="No posts in this category yet"
        emptyDescription="Be the first to publish an announcement here."
      />
    </div>
  );
}
