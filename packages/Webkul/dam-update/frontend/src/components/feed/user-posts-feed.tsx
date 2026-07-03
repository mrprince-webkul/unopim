"use client";

import { useMemo } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";

import { AnnouncementCard } from "@/components/announcements/announcement-card";
import { EmptyState } from "@/components/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useInfiniteScrollSentinel } from "@/hooks/use-infinite-scroll";
import { usersApi } from "@/lib/api";
import { cn } from "@/lib/utils";

export function UserPostsFeed({
  username,
  status,
  gridClassName,
  emptyTitle,
  emptyDescription,
}: {
  username: string;
  status?: "draft" | "published";
  gridClassName?: string;
  emptyTitle: string;
  emptyDescription?: string;
}) {
  const queryKey = ["user-announcements", username, status] as const;

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, isError } = useInfiniteQuery({
    queryKey,
    queryFn: ({ pageParam }) => usersApi.announcements(username, { page: pageParam, size: 12, status }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => (lastPage.page < lastPage.pages ? lastPage.page + 1 : undefined),
  });

  const items = useMemo(() => data?.pages.flatMap((p) => p.items) ?? [], [data]);

  const sentinelRef = useInfiniteScrollSentinel(() => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage();
  }, Boolean(hasNextPage));

  if (isLoading) {
    return (
      <div className={cn("grid gap-5", gridClassName ?? "sm:grid-cols-2")}>
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-56 w-full rounded-2xl" />
        ))}
      </div>
    );
  }

  if (isError) {
    return <EmptyState title="Couldn't load posts" description="Something went wrong. Try refreshing the page." />;
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
          ? Array.from({ length: 2 }).map((_, i) => <Skeleton key={`more-${i}`} className="h-56 w-full rounded-2xl" />)
          : null}
      </div>
      <div ref={sentinelRef} className="h-1 w-full" />
    </div>
  );
}
