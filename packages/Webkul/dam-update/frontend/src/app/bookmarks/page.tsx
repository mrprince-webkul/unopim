"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Bookmark, Loader2 } from "lucide-react";

import { AnnouncementCard } from "@/components/announcements/announcement-card";
import { EmptyState } from "@/components/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useInfiniteScrollSentinel } from "@/hooks/use-infinite-scroll";
import { usersApi } from "@/lib/api";
import { useAuth } from "@/lib/auth";

export default function BookmarksPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace("/login?next=/bookmarks");
  }, [loading, user, router]);

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, isError } = useInfiniteQuery({
    queryKey: ["bookmarks"],
    queryFn: ({ pageParam }) => usersApi.myBookmarks({ page: pageParam, size: 12 }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => (lastPage.page < lastPage.pages ? lastPage.page + 1 : undefined),
    enabled: Boolean(user),
  });

  const items = useMemo(() => data?.pages.flatMap((p) => p.items) ?? [], [data]);

  const sentinelRef = useInfiniteScrollSentinel(() => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage();
  }, Boolean(hasNextPage));

  if (loading || !user) {
    return (
      <div className="container flex min-h-[60vh] items-center justify-center py-10">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="container py-10">
      <div className="mb-8">
        <p className="mb-2 font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
          Saved
        </p>
        <h1 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Bookmarks</h1>
        <p className="mt-2 text-sm text-muted-foreground">Announcements you&apos;ve saved for later.</p>
      </div>

      {isLoading ? (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-56 w-full rounded-2xl" />
          ))}
        </div>
      ) : isError ? (
        <EmptyState title="Couldn't load bookmarks" description="Something went wrong. Try refreshing the page." />
      ) : items.length === 0 ? (
        <EmptyState
          icon={Bookmark}
          title="No bookmarks yet"
          description="Save announcements you want to revisit and they'll show up here."
        />
      ) : (
        <div>
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {items.map((announcement) => (
              <AnnouncementCard key={announcement.id} announcement={announcement} />
            ))}
            {isFetchingNextPage
              ? Array.from({ length: 2 }).map((_, i) => <Skeleton key={`more-${i}`} className="h-56 w-full rounded-2xl" />)
              : null}
          </div>
          <div ref={sentinelRef} className="h-1 w-full" />
        </div>
      )}
    </div>
  );
}
