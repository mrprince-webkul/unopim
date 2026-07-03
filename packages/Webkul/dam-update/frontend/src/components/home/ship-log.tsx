"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowUpRight, Eye, Heart, MessageCircle, Pin } from "lucide-react";

import { UserAvatar } from "@/components/user-avatar";
import { cn, formatNumber, formatDate, timeAgo } from "@/lib/utils";
import type { Announcement } from "@/lib/types";

const EASE = [0.21, 0.47, 0.32, 0.98] as const;

/** A short, commit-ish reference derived from the id — a developer-native detail. */
function refOf(id: number): string {
  return `#${id.toString(16).padStart(4, "0")}`;
}

function StatRow({ a }: { a: Announcement }) {
  return (
    <span className="flex items-center gap-3 font-mono text-[11px] tabular-nums text-muted-foreground/70">
      <span className="flex items-center gap-1">
        <Eye className="h-3.5 w-3.5" />
        {formatNumber(a.views_count)}
      </span>
      <span className="flex items-center gap-1">
        <Heart className="h-3.5 w-3.5" />
        {formatNumber(a.likes_count)}
      </span>
      <span className="flex items-center gap-1">
        <MessageCircle className="h-3.5 w-3.5" />
        {formatNumber(a.comments_count)}
      </span>
    </span>
  );
}

/** The lead entry — typography-forward, breaks the timeline rhythm, pulsing "latest" node. */
export function ShipLogLead({ announcement }: { announcement: Announcement }) {
  const { slug, title, description, thumbnail_url, author, category, tags, publish_date } = announcement;
  const color = category?.color ?? "hsl(var(--primary))";

  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: EASE }}
      className="group relative pb-8 pl-9"
    >
      {/* spine continues down toward the list */}
      <span aria-hidden className="absolute bottom-0 left-[9px] top-8 w-px bg-gradient-to-b from-border/80 to-border" />
      {/* pulsing lead node */}
      <span aria-hidden className="absolute left-[3px] top-1.5 flex h-[13px] w-[13px] items-center justify-center">
        <span
          className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-40"
          style={{ backgroundColor: color }}
        />
        <span
          className="relative h-[11px] w-[11px] rounded-full ring-2 ring-background"
          style={{ backgroundColor: color }}
        />
      </span>

      <Link href={`/announcements/${slug}`} className="block">
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 font-mono text-[11px]">
          <span
            className="inline-flex items-center rounded-full px-2 py-0.5 font-semibold uppercase tracking-[0.14em]"
            style={{ color, backgroundColor: `color-mix(in srgb, ${color} 14%, transparent)` }}
          >
            Latest ship
          </span>
          <span className="tabular-nums text-muted-foreground/70">{formatDate(publish_date, "yyyy.MM.dd")}</span>
          <span aria-hidden className="text-muted-foreground/30">·</span>
          <span className="tabular-nums text-muted-foreground/45">{refOf(announcement.id)}</span>
          {category ? (
            <>
              <span aria-hidden className="text-muted-foreground/30">·</span>
              <Link
                href={`/general?category=${category.slug}`}
                className="inline-flex items-center gap-1.5 hover:opacity-80"
                style={{ color }}
              >
                <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
                {category.name}
              </Link>
            </>
          ) : null}
        </div>

        {thumbnail_url ? (
          <div className="relative mt-4 aspect-[21/9] w-full overflow-hidden rounded-2xl border border-border bg-muted">
            <Image
              src={thumbnail_url}
              alt={title}
              fill
              sizes="(max-width: 1024px) 100vw, 760px"
              className="object-cover transition-transform duration-700 group-hover:scale-[1.03]"
            />
            <span className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
          </div>
        ) : null}

        <h2 className="mt-4 max-w-2xl text-balance font-display text-2xl font-bold leading-[1.15] tracking-tight text-foreground transition-colors group-hover:text-primary sm:text-[32px]">
          {title}
        </h2>
        <p className="mt-2.5 max-w-2xl text-[15px] leading-7 text-muted-foreground line-clamp-3">{description}</p>

        {tags.length > 0 ? (
          <div className="mt-3.5 flex flex-wrap gap-1.5">
            {tags.slice(0, 4).map((tag) => (
              <span
                key={tag}
                className="rounded-md border border-border/60 bg-secondary/40 px-2 py-0.5 font-mono text-[11px] text-muted-foreground"
              >
                #{tag}
              </span>
            ))}
          </div>
        ) : null}

        <div className="mt-5 flex items-center gap-3">
          <span className="flex items-center gap-2">
            <UserAvatar user={author} className="h-6 w-6" />
            <span className="text-[13px] font-medium text-foreground/85">{author.username}</span>
          </span>
          <span aria-hidden className="text-muted-foreground/30">·</span>
          <span className="text-xs text-muted-foreground/70">{timeAgo(publish_date)}</span>
          <span className="ml-auto hidden items-center gap-1.5 text-[13px] font-medium text-primary opacity-0 transition-opacity duration-300 group-hover:opacity-100 sm:inline-flex">
            Read
            <ArrowUpRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </span>
        </div>
      </Link>
    </motion.article>
  );
}

/** A compact timeline row attached to the git-graph spine. */
export function ShipLogEntry({
  announcement,
  index,
  isLast,
}: {
  announcement: Announcement;
  index: number;
  isLast: boolean;
}) {
  const { slug, title, description, author, category, publish_date, is_pinned } = announcement;
  const color = category?.color ?? "hsl(var(--primary))";

  return (
    <motion.article
      initial={{ opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "0px 0px -8% 0px" }}
      transition={{ duration: 0.35, delay: Math.min(index * 0.03, 0.15), ease: EASE }}
      className="group relative pl-9"
    >
      {/* spine segment (full height so consecutive rows join seamlessly) */}
      <span aria-hidden className={cn("absolute left-[9px] top-0 w-px bg-border", isLast ? "h-7" : "h-full")} />
      {/* commit node */}
      <span
        aria-hidden
        className="absolute left-[3px] top-[7px] flex h-[13px] w-[13px] items-center justify-center rounded-full border border-border bg-background transition-all duration-300 group-hover:border-transparent group-hover:ring-4 group-hover:ring-[color-mix(in_srgb,var(--node)_18%,transparent)]"
        style={{ ["--node" as string]: color }}
      >
        <span
          className="h-[6px] w-[6px] rounded-full transition-transform duration-300 group-hover:scale-125"
          style={{ backgroundColor: color }}
        />
      </span>

      <Link
        href={`/announcements/${slug}`}
        className={cn("block pb-5", isLast ? "" : "border-b border-border/50")}
      >
        <div className="flex items-center gap-2 font-mono text-[11px] text-muted-foreground/70">
          <span className="tabular-nums">{formatDate(publish_date, "yyyy.MM.dd")}</span>
          <span aria-hidden className="text-muted-foreground/30">·</span>
          <span className="tabular-nums text-muted-foreground/40">{refOf(announcement.id)}</span>
          {is_pinned ? (
            <span className="inline-flex items-center gap-1 text-primary/80">
              <Pin className="h-3 w-3" />
              pinned
            </span>
          ) : null}
          {category ? (
            <span className="ml-auto inline-flex items-center gap-1.5" style={{ color }}>
              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
              {category.name}
            </span>
          ) : null}
        </div>

        <h3 className="mt-2 font-display text-[18px] font-semibold leading-snug tracking-tight text-foreground transition-colors group-hover:text-primary">
          {title}
        </h3>
        <p className="mt-1 line-clamp-1 text-sm leading-6 text-muted-foreground">{description}</p>

        <div className="mt-2.5 flex items-center gap-2.5 text-xs text-muted-foreground">
          <UserAvatar user={author} className="h-5 w-5" />
          <span className="font-medium text-foreground/75">{author.username}</span>
          <span className="ml-auto">
            <StatRow a={announcement} />
          </span>
        </div>
      </Link>
    </motion.article>
  );
}
