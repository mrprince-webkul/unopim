"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Bookmark, Eye, Heart, MessageCircle, Paperclip, Pin, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { UserAvatar } from "@/components/user-avatar";
import { announcementsApi, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { cn, formatNumber, timeAgo } from "@/lib/utils";
import type { Announcement } from "@/lib/types";

export function AnnouncementCard({
  announcement,
  compact = false,
}: {
  announcement: Announcement;
  compact?: boolean;
}) {
  const {
    id,
    slug,
    title,
    description,
    thumbnail_url,
    author,
    category,
    tags,
    is_pinned,
    is_featured,
    publish_date,
    views_count,
    likes_count,
    comments_count,
    reading_time,
    attachments,
  } = announcement;

  const router = useRouter();
  const { user } = useAuth();
  const [bookmarked, setBookmarked] = useState(announcement.is_bookmarked);
  const [saving, setSaving] = useState(false);

  async function toggleBookmark(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      router.push(`/login?next=/announcements/${slug}`);
      return;
    }
    if (saving) return;
    setSaving(true);
    const next = !bookmarked;
    setBookmarked(next);
    try {
      const res = next ? await announcementsApi.bookmark(id) : await announcementsApi.unbookmark(id);
      setBookmarked(res.is_bookmarked);
    } catch (err) {
      setBookmarked(!next);
      toast.error(err instanceof ApiError ? err.detail : "Couldn't update bookmark");
    } finally {
      setSaving(false);
    }
  }

  return (
    <motion.article
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "25% 0px 25% 0px" }}
      transition={{ duration: 0.4, ease: [0.21, 0.47, 0.32, 0.98] }}
      className="card-hover group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-card"
    >
      {!compact && thumbnail_url ? (
        <Link href={`/announcements/${slug}`} className="relative block aspect-video w-full overflow-hidden bg-muted">
          <Image
            src={thumbnail_url}
            alt={title}
            fill
            sizes="(max-width: 768px) 100vw, 420px"
            className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
          />
          <span className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
          {category ? (
            <span className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-black/40 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur">
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: category.color ?? "hsl(var(--primary))" }}
              />
              {category.name}
            </span>
          ) : null}
        </Link>
      ) : null}

      <div className={cn("flex flex-1 flex-col gap-3", compact ? "p-4" : "p-5")}>
        <div className="flex items-center gap-2">
          {is_pinned ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-border bg-secondary/60 px-2 py-0.5 text-[11px] font-medium text-secondary-foreground">
              <Pin className="h-3 w-3" /> Pinned
            </span>
          ) : null}
          {is_featured ? (
            <Badge variant="gradient" className="text-[11px]">
              <Sparkles className="h-3 w-3" /> Featured
            </Badge>
          ) : null}
          {(compact || !thumbnail_url) && category ? (
            <Link
              href={`/general?category=${category.slug}`}
              className="inline-flex items-center gap-1.5 rounded-full border border-border px-2 py-0.5 text-[11px] font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
            >
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: category.color ?? "hsl(var(--primary))" }}
              />
              {category.name}
            </Link>
          ) : null}

          <button
            type="button"
            onClick={toggleBookmark}
            aria-label={bookmarked ? "Remove bookmark" : "Bookmark"}
            className={cn(
              "ml-auto rounded-lg p-1.5 transition-all",
              bookmarked
                ? "text-primary"
                : "text-muted-foreground/50 opacity-0 hover:bg-accent hover:text-foreground focus-visible:opacity-100 group-hover:opacity-100",
            )}
          >
            <Bookmark className={cn("h-4 w-4", bookmarked && "fill-current")} />
          </button>
        </div>

        <Link href={`/announcements/${slug}`} className="group/title">
          <h3
            className={cn(
              "font-display font-semibold tracking-tight text-foreground transition-colors group-hover/title:text-primary",
              compact ? "line-clamp-1 text-base" : "line-clamp-2 text-lg",
            )}
          >
            {title}
          </h3>
        </Link>

        <p className="line-clamp-2 text-sm leading-6 text-muted-foreground">{description}</p>

        {tags.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {tags.slice(0, compact ? 3 : 4).map((tag) => (
              <Link
                key={tag}
                href={`/general?tag=${encodeURIComponent(tag)}`}
                className="rounded-md border border-border/60 bg-secondary/40 px-2 py-0.5 font-mono text-[11px] text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
              >
                #{tag}
              </Link>
            ))}
            {attachments.length > 0 ? (
              <Link
                href={`/announcements/${slug}`}
                className="inline-flex items-center gap-1 rounded-md border border-border/60 bg-secondary/40 px-2 py-0.5 text-[11px] text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
              >
                <Paperclip className="h-3 w-3" />
                {attachments.length}
              </Link>
            ) : null}
          </div>
        ) : null}

        <div className="mt-auto flex items-center justify-between gap-2 border-t border-border/60 pt-3">
          <Link href={`/profile/${author.username}`} className="flex min-w-0 items-center gap-2">
            <UserAvatar user={author} className="h-6 w-6" />
            <span className="truncate text-xs font-medium text-muted-foreground hover:text-foreground">
              {author.username}
            </span>
            <span className="shrink-0 text-xs text-muted-foreground/60">· {timeAgo(publish_date)}</span>
          </Link>

          <div className="flex shrink-0 items-center gap-2.5 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Eye className="h-3.5 w-3.5" />
              {formatNumber(views_count)}
            </span>
            <span className="flex items-center gap-1">
              <Heart className="h-3.5 w-3.5" />
              {formatNumber(likes_count)}
            </span>
            <span className="flex items-center gap-1">
              <MessageCircle className="h-3.5 w-3.5" />
              {formatNumber(comments_count)}
            </span>
            <span className="hidden sm:inline">{reading_time} min</span>
          </div>
        </div>
      </div>
    </motion.article>
  );
}
