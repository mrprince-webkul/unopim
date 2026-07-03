"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { isToday, parseISO } from "date-fns";
import { Bell, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { notificationsApi } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { cn, timeAgo } from "@/lib/utils";
import type { Notification } from "@/lib/types";

const QUERY_KEY = ["notifications", "page"];

function NotificationRow({ n, onOpen }: { n: Notification; onOpen: (n: Notification) => void }) {
  return (
    <button
      type="button"
      onClick={() => onOpen(n)}
      className={cn(
        "flex w-full items-start gap-3 rounded-xl border border-border px-4 py-3 text-left transition-colors hover:border-primary/30 hover:bg-accent",
        !n.is_read && "border-l-2 border-l-primary bg-primary/[0.04]",
      )}
    >
      {!n.is_read ? (
        <span className="mt-1.5 h-2 w-2 shrink-0 animate-pulse-soft rounded-full bg-primary" />
      ) : (
        <span className="mt-1.5 h-2 w-2 shrink-0" />
      )}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground">{n.title}</p>
        <p className="mt-0.5 text-sm text-muted-foreground">{n.body}</p>
        <p className="mt-1 font-mono text-xs text-muted-foreground/70">{timeAgo(n.created_at)}</p>
      </div>
    </button>
  );
}

export default function NotificationsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!loading && !user) router.replace("/login?next=/notifications");
  }, [loading, user, router]);

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useInfiniteQuery({
    queryKey: QUERY_KEY,
    queryFn: ({ pageParam }) => notificationsApi.list({ page: pageParam, size: 20 }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => (lastPage.page < lastPage.pages ? lastPage.page + 1 : undefined),
    enabled: Boolean(user),
  });

  const notifications = useMemo(() => data?.pages.flatMap((p) => p.items) ?? [], [data]);
  const unreadCount = data?.pages[0]?.unread_count ?? 0;

  const today = notifications.filter((n) => isToday(parseISO(n.created_at)));
  const earlier = notifications.filter((n) => !isToday(parseISO(n.created_at)));

  async function handleOpen(n: Notification) {
    try {
      if (!n.is_read) {
        await notificationsApi.markRead(n.id);
        queryClient.invalidateQueries({ queryKey: QUERY_KEY });
        queryClient.invalidateQueries({ queryKey: ["notifications", "bell"] });
      }
    } catch {
      // best-effort
    }
    if (n.link) router.push(n.link);
  }

  async function handleMarkAllRead() {
    try {
      await notificationsApi.markAllRead();
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ["notifications", "bell"] });
    } catch {
      toast.error("Couldn't mark notifications as read");
    }
  }

  if (loading || !user) {
    return (
      <div className="container flex min-h-[60vh] items-center justify-center py-10">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="container max-w-2xl py-10">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="mb-2 font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
            Inbox
          </p>
          <h1 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Notifications
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">Stay on top of likes, comments, and follows.</p>
        </div>
        {unreadCount > 0 ? (
          <Button type="button" variant="outline" size="sm" onClick={handleMarkAllRead}>
            Mark all read
          </Button>
        ) : null}
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <EmptyState icon={Bell} title="No notifications yet" description="You're all caught up." />
      ) : (
        <div className="space-y-8">
          {today.length > 0 ? (
            <div>
              <h2 className="mb-3 font-mono text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">Today</h2>
              <div className="space-y-2">
                {today.map((n) => (
                  <NotificationRow key={n.id} n={n} onOpen={handleOpen} />
                ))}
              </div>
            </div>
          ) : null}

          {earlier.length > 0 ? (
            <div>
              <h2 className="mb-3 font-mono text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">Earlier</h2>
              <div className="space-y-2">
                {earlier.map((n) => (
                  <NotificationRow key={n.id} n={n} onOpen={handleOpen} />
                ))}
              </div>
            </div>
          ) : null}

          {hasNextPage ? (
            <div className="flex justify-center">
              <Button type="button" variant="outline" size="sm" onClick={() => fetchNextPage()} disabled={isFetchingNextPage}>
                {isFetchingNextPage ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Load more
              </Button>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
