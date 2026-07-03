"use client";

import { useEffect, useMemo } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { FileQuestion } from "lucide-react";

import { AnnouncementCard } from "@/components/announcements/announcement-card";
import { EmptyState } from "@/components/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useInfiniteScrollSentinel } from "@/hooks/use-infinite-scroll";
import { announcementsApi } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { Announcement, AnnouncementSort } from "@/lib/types";

export interface AnnouncementFeedProps {
  category?: string;
  tag?: string;
  sort?: AnnouncementSort;
  author?: string;
  q?: string;
  size?: number;
  gridClassName?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  onItemsChange?: (items: Announcement[]) => void;
}

function CardSkeleton() {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-5">
      <Skeleton className="h-4 w-24 rounded-full" />
      <Skeleton className="h-5 w-4/5" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-2/3" />
      <div className="mt-auto flex items-center justify-between pt-2">
        <Skeleton className="h-6 w-24 rounded-full" />
        <Skeleton className="h-4 w-16" />
      </div>
    </div>
  );
}

export function AnnouncementFeed({
  category,
  tag,
  sort = "latest",
  author,
  q,
  size = 12,
  gridClassName,
  emptyTitle = "No announcements yet",
  emptyDescription = "Check back soon, or be the first to post here.",
  onItemsChange,
}: AnnouncementFeedProps) {
  const queryKey = ["announcements", "feed", { category, tag, sort, author, q, size }] as const;

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, isError } = useInfiniteQuery({
    queryKey,
    queryFn: ({ pageParam }) =>
      announcementsApi.list({ page: pageParam, size, category, tag, sort, author, q }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => (lastPage.page < lastPage.pages ? lastPage.page + 1 : undefined),
  });

  const items = useMemo(() => data?.pages.flatMap((p) => p.items) ?? [], [data]);

  useEffect(() => {
    onItemsChange?.(items);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  const sentinelRef = useInfiniteScrollSentinel(() => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage();
  }, Boolean(hasNextPage));

  if (isLoading) {
    return (
      <div className={cn("grid gap-5", gridClassName ?? "sm:grid-cols-2")}>
        {Array.from({ length: 6 }).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <EmptyState
        icon={FileQuestion}
        title="Couldn't load announcements"
        description="Something went wrong while fetching this feed. Try refreshing the page."
      />
    );
  }

  if (items.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <div>
      <div className={cn("grid gap-5", gridClassName ?? "sm:grid-cols-2")}>
        {items.map((announcement) => (
          <AnnouncementCard key={announcement.id} announcement={announcement} />
        ))}
        {isFetchingNextPage
          ? Array.from({ length: 2 }).map((_, i) => <CardSkeleton key={`more-${i}`} />)
          : null}
      </div>
      <div ref={sentinelRef} className="h-1 w-full" />
    </div>
  );
}
