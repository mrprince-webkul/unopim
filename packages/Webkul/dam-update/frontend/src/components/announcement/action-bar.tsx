"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bookmark, Heart, Loader2, Pencil, Share2, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { announcementsApi, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { cn, formatNumber } from "@/lib/utils";
import type { Announcement } from "@/lib/types";

export function ActionBar({ announcement }: { announcement: Announcement }) {
  const { user, isAdmin } = useAuth();
  const router = useRouter();

  const [liked, setLiked] = useState(announcement.is_liked);
  const [likes, setLikes] = useState(announcement.likes_count);
  const [bookmarked, setBookmarked] = useState(announcement.is_bookmarked);
  const [bookmarks, setBookmarks] = useState(announcement.bookmarks_count);
  const [likeBusy, setLikeBusy] = useState(false);
  const [bookmarkBusy, setBookmarkBusy] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const canEdit = Boolean(user && (user.id === announcement.author.id || isAdmin));

  function requireAuth() {
    if (user) return true;
    router.push(`/login?next=/announcements/${announcement.slug}`);
    return false;
  }

  async function handleLike() {
    if (!requireAuth() || likeBusy) return;
    const prevLiked = liked;
    const prevLikes = likes;
    setLikeBusy(true);
    setLiked(!prevLiked);
    setLikes(prevLikes + (prevLiked ? -1 : 1));
    try {
      const res = prevLiked
        ? await announcementsApi.unlike(announcement.id)
        : await announcementsApi.like(announcement.id);
      setLiked(res.is_liked);
      setLikes(res.likes_count);
    } catch (err) {
      setLiked(prevLiked);
      setLikes(prevLikes);
      toast.error(err instanceof ApiError ? err.detail : "Something went wrong");
    } finally {
      setLikeBusy(false);
    }
  }

  async function handleBookmark() {
    if (!requireAuth() || bookmarkBusy) return;
    const prevBookmarked = bookmarked;
    const prevBookmarks = bookmarks;
    setBookmarkBusy(true);
    setBookmarked(!prevBookmarked);
    setBookmarks(prevBookmarks + (prevBookmarked ? -1 : 1));
    try {
      const res = prevBookmarked
        ? await announcementsApi.unbookmark(announcement.id)
        : await announcementsApi.bookmark(announcement.id);
      setBookmarked(res.is_bookmarked);
      setBookmarks(res.bookmarks_count);
    } catch (err) {
      setBookmarked(prevBookmarked);
      setBookmarks(prevBookmarks);
      toast.error(err instanceof ApiError ? err.detail : "Something went wrong");
    } finally {
      setBookmarkBusy(false);
    }
  }

  async function handleShare() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("Link copied to clipboard");
    } catch {
      toast.error("Couldn't copy the link");
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await announcementsApi.remove(announcement.id);
      toast.success("Announcement deleted");
      setDeleteOpen(false);
      router.push("/general");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.detail : "Something went wrong");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="glass inline-flex flex-wrap items-center gap-1 rounded-full border border-border/70 p-1.5">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={handleLike}
        className={cn(
          "rounded-full",
          liked && "bg-rose-500/10 text-rose-500 hover:bg-rose-500/15 hover:text-rose-500",
        )}
      >
        <Heart className={cn("h-4 w-4", liked && "fill-current")} />
        {formatNumber(likes)}
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={handleBookmark}
        className={cn(
          "rounded-full",
          bookmarked && "bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary",
        )}
      >
        <Bookmark className={cn("h-4 w-4", bookmarked && "fill-current")} />
        {formatNumber(bookmarks)}
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="rounded-full"
        onClick={handleShare}
        aria-label="Copy link"
      >
        <Share2 className="h-4 w-4" />
      </Button>

      {canEdit ? (
        <>
          <span className="mx-1 h-5 w-px shrink-0 bg-border" aria-hidden />
          <Button asChild variant="ghost" size="icon" className="rounded-full" aria-label="Edit announcement">
            <Link href={`/announcements/${announcement.slug}/edit`}>
              <Pencil className="h-4 w-4" />
            </Link>
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Delete announcement"
            className="rounded-full text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </>
      ) : null}

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this announcement?</DialogTitle>
            <DialogDescription>
              This action cannot be undone. The post, its comments, and attachments will be permanently removed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDeleteOpen(false)} disabled={deleting}>
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
