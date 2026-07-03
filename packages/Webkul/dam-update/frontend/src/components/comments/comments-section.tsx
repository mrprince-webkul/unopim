"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, MessageCircle } from "lucide-react";
import { toast } from "sonner";

import { CommentItem } from "@/components/comments/comment-item";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { UserAvatar } from "@/components/user-avatar";
import { announcementsApi, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";

const SIZE = 20;

export function CommentsSection({ announcementId }: { announcementId: number }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const queryKey = ["comments", announcementId] as const;

  const { data, isLoading, isError, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey,
    queryFn: ({ pageParam }) => announcementsApi.comments(announcementId, { page: pageParam, size: SIZE }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => (lastPage.page < lastPage.pages ? lastPage.page + 1 : undefined),
  });

  const comments = data?.pages.flatMap((p) => p.items) ?? [];
  const total = data?.pages[0]?.total ?? 0;

  function onChanged() {
    queryClient.invalidateQueries({ queryKey });
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = content.trim();
    if (!trimmed) return;
    setSubmitting(true);
    try {
      await announcementsApi.addComment(announcementId, { content: trimmed });
      setContent("");
      onChanged();
      toast.success("Comment posted");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.detail : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-semibold tracking-tight text-foreground">
        <MessageCircle className="h-5 w-5 text-primary" />
        Comments{total ? ` (${total})` : ""}
      </h2>

      {user ? (
        <form onSubmit={handleSubmit} className="mb-8 flex gap-3">
          <UserAvatar user={user} className="h-9 w-9 shrink-0" />
          <div className="flex-1 space-y-2">
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Add a comment…"
              className="min-h-[80px] focus-visible:border-primary/50 focus-visible:shadow-[0_0_0_3px_hsl(var(--glow)/0.12)]"
            />
            <div className="flex justify-end">
              <Button type="submit" size="sm" variant="gradient" disabled={submitting || !content.trim()}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Post comment
              </Button>
            </div>
          </div>
        </form>
      ) : (
        <Card className="mb-8 rounded-2xl">
          <CardContent className="flex flex-col items-center gap-3 py-8 text-center">
            <p className="text-sm text-muted-foreground">Log in to join the conversation.</p>
            <Button asChild size="sm" variant="gradient">
              <Link href="/login">Log in</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="space-y-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex gap-3">
              <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3 w-32" />
                <Skeleton className="h-3 w-full" />
              </div>
            </div>
          ))}
        </div>
      ) : isError ? (
        <p className="text-sm text-muted-foreground">Couldn&apos;t load comments.</p>
      ) : comments.length === 0 ? (
        <p className="text-sm text-muted-foreground">No comments yet — be the first to say something.</p>
      ) : (
        <div className="space-y-6">
          {comments.map((comment) => (
            <CommentItem key={comment.id} comment={comment} announcementId={announcementId} onChanged={onChanged} />
          ))}
        </div>
      )}

      {hasNextPage ? (
        <div className="mt-6 flex justify-center">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
          >
            {isFetchingNextPage ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Load more comments
          </Button>
        </div>
      ) : null}
    </div>
  );
}
