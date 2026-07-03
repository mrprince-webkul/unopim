"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, Loader2, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/empty-state";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useInfiniteScrollSentinel } from "@/hooks/use-infinite-scroll";
import { announcementsApi, usersApi, ApiError } from "@/lib/api";
import { formatDate, formatNumber } from "@/lib/utils";
import type { Announcement, AnnouncementStatus } from "@/lib/types";

const SHIMMER_ROW = "h-16 w-full rounded-xl bg-gradient-to-r from-secondary via-secondary/50 to-secondary bg-[length:200%_100%] animate-shimmer";

function PostRow({ announcement, onDeleted }: { announcement: Announcement; onDeleted: () => void }) {
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    try {
      await announcementsApi.remove(announcement.id);
      toast.success("Announcement deleted");
      setOpen(false);
      onDeleted();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.detail : "Something went wrong");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="group flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-secondary/10 px-4 py-3 transition-colors duration-200 hover:border-primary/30 hover:bg-primary/[0.04]">
      <div className="min-w-0 flex-1">
        <Link
          href={`/announcements/${announcement.slug}`}
          className="block truncate font-medium text-foreground hover:text-primary"
        >
          {announcement.title}
        </Link>
        <p className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <Badge
            variant="outline"
            className={
              announcement.status === "published"
                ? "border-emerald-500/40 text-emerald-500 dark:text-emerald-400 capitalize"
                : "capitalize"
            }
          >
            {announcement.status}
          </Badge>
          <span className="font-mono">{formatDate(announcement.publish_date)}</span>
          <span className="flex items-center gap-1 font-mono">
            <Eye className="h-3 w-3" />
            {formatNumber(announcement.views_count)}
          </span>
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        <Button asChild variant="ghost" size="icon" aria-label="Edit announcement">
          <Link href={`/announcements/${announcement.slug}/edit`}>
            <Pencil className="h-4 w-4" />
          </Link>
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Delete announcement"
          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
          onClick={() => setOpen(true)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete &ldquo;{announcement.title}&rdquo;?</DialogTitle>
            <DialogDescription>This action cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={deleting}>
              Cancel
            </Button>
            <Button type="button" variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PostsList({ username, status }: { username: string; status: AnnouncementStatus }) {
  const queryClient = useQueryClient();
  const queryKey = ["user-announcements", username, status] as const;

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, isError } = useInfiniteQuery({
    queryKey,
    queryFn: ({ pageParam }) => usersApi.announcements(username, { page: pageParam, size: 10, status }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => (lastPage.page < lastPage.pages ? lastPage.page + 1 : undefined),
  });

  const items = useMemo(() => data?.pages.flatMap((p) => p.items) ?? [], [data]);

  const sentinelRef = useInfiniteScrollSentinel(() => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage();
  }, Boolean(hasNextPage));

  function handleDeleted() {
    queryClient.invalidateQueries({ queryKey });
    queryClient.invalidateQueries({ queryKey: ["user-stats"] });
  }

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className={SHIMMER_ROW} />
        ))}
      </div>
    );
  }

  if (isError) return <EmptyState title="Couldn't load posts" description="Something went wrong. Try again." />;

  if (items.length === 0) {
    return (
      <EmptyState
        title={status === "draft" ? "No drafts" : "No published posts yet"}
        description={
          status === "draft"
            ? "Drafts you save will appear here."
            : "Publish your first announcement to see it here."
        }
      />
    );
  }

  return (
    <div>
      <div className="space-y-2">
        {items.map((a) => (
          <PostRow key={a.id} announcement={a} onDeleted={handleDeleted} />
        ))}
        {isFetchingNextPage ? (
          <div className="space-y-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={`more-${i}`} className={SHIMMER_ROW} />
            ))}
          </div>
        ) : null}
      </div>
      <div ref={sentinelRef} className="h-1 w-full" />
    </div>
  );
}

export function MyPosts({ username }: { username: string }) {
  return (
    <Tabs defaultValue="published">
      <TabsList>
        <TabsTrigger value="published">Published</TabsTrigger>
        <TabsTrigger value="draft">Drafts</TabsTrigger>
      </TabsList>
      <TabsContent value="published" className="mt-4">
        <PostsList username={username} status="published" />
      </TabsContent>
      <TabsContent value="draft" className="mt-4">
        <PostsList username={username} status="draft" />
      </TabsContent>
    </Tabs>
  );
}
