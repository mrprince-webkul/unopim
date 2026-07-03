"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Eye, EyeOff, Loader2, MessageSquare, Pencil, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { UserAvatar } from "@/components/user-avatar";
import { adminApi, announcementsApi, commentsApi, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { cn, timeAgo } from "@/lib/utils";
import type { Comment } from "@/lib/types";

export function CommentItem({
  comment,
  announcementId,
  depth = 0,
  onChanged,
}: {
  comment: Comment;
  announcementId: number;
  depth?: number;
  onChanged: () => void;
}) {
  const { user, isAdmin } = useAuth();
  const [replying, setReplying] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(comment.content);
  const [busy, setBusy] = useState(false);

  const isOwn = user?.id === comment.author.id;

  async function submitReply() {
    const trimmed = replyText.trim();
    if (!trimmed) return;
    setBusy(true);
    try {
      await announcementsApi.addComment(announcementId, { content: trimmed, parent_id: comment.id });
      setReplyText("");
      setReplying(false);
      onChanged();
      toast.success("Reply posted");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.detail : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  async function submitEdit() {
    const trimmed = editText.trim();
    if (!trimmed) return;
    setBusy(true);
    try {
      await commentsApi.update(comment.id, trimmed);
      setEditing(false);
      onChanged();
      toast.success("Comment updated");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.detail : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (typeof window !== "undefined" && !window.confirm("Delete this comment? This cannot be undone.")) return;
    setBusy(true);
    try {
      await commentsApi.remove(comment.id);
      onChanged();
      toast.success("Comment deleted");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.detail : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  async function handleToggleHidden() {
    setBusy(true);
    try {
      if (comment.is_hidden) await adminApi.showComment(comment.id);
      else await adminApi.hideComment(comment.id);
      onChanged();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.detail : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={cn("flex gap-3", depth > 0 && "ml-4 mt-4 border-l border-border/60 pl-4 sm:ml-8")}>
      <Link href={`/profile/${comment.author.username}`} className="shrink-0">
        <UserAvatar user={comment.author} className="h-8 w-8" />
      </Link>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/profile/${comment.author.username}`}
            className="text-sm font-medium text-foreground hover:text-primary"
          >
            {comment.author.username}
          </Link>
          <span className="text-xs text-muted-foreground">{timeAgo(comment.created_at)}</span>
          {comment.is_hidden ? (
            <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-[11px] font-medium text-destructive">
              Hidden
            </span>
          ) : null}
        </div>

        {editing ? (
          <div className="mt-2 space-y-2">
            <Textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              className="min-h-[80px] focus-visible:border-primary/50 focus-visible:shadow-[0_0_0_3px_hsl(var(--glow)/0.12)]"
            />
            <div className="flex gap-2">
              <Button type="button" size="sm" onClick={submitEdit} disabled={busy}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Save
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => {
                  setEditing(false);
                  setEditText(comment.content);
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <p className="mt-1 whitespace-pre-wrap text-sm text-foreground/90">{comment.content}</p>
        )}

        <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          {depth === 0 && user ? (
            <button
              type="button"
              onClick={() => setReplying((v) => !v)}
              className="inline-flex items-center gap-1 font-medium hover:text-foreground"
            >
              <MessageSquare className="h-3.5 w-3.5" /> Reply
            </button>
          ) : null}
          {isOwn && !editing ? (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="inline-flex items-center gap-1 font-medium hover:text-foreground"
            >
              <Pencil className="h-3.5 w-3.5" /> Edit
            </button>
          ) : null}
          {isOwn || isAdmin ? (
            <button
              type="button"
              onClick={handleDelete}
              className="inline-flex items-center gap-1 font-medium text-destructive/80 hover:text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" /> Delete
            </button>
          ) : null}
          {isAdmin ? (
            <button
              type="button"
              onClick={handleToggleHidden}
              className="inline-flex items-center gap-1 font-medium hover:text-foreground"
            >
              {comment.is_hidden ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
              {comment.is_hidden ? "Show" : "Hide"}
            </button>
          ) : null}
        </div>

        {replying ? (
          <div className="mt-3 space-y-2">
            <Textarea
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder={`Reply to ${comment.author.username}…`}
              className="min-h-[70px] focus-visible:border-primary/50 focus-visible:shadow-[0_0_0_3px_hsl(var(--glow)/0.12)]"
            />
            <div className="flex gap-2">
              <Button type="button" size="sm" onClick={submitReply} disabled={busy || !replyText.trim()}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Post reply
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => setReplying(false)}>
                Cancel
              </Button>
            </div>
          </div>
        ) : null}

        {comment.replies?.length ? (
          <div className="mt-2 space-y-4">
            {comment.replies.map((reply) => (
              <CommentItem
                key={reply.id}
                comment={reply}
                announcementId={announcementId}
                depth={depth + 1}
                onChanged={onChanged}
              />
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
