import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  ChevronRight,
  Download,
  ExternalLink,
  File as FileIconDefault,
  FileArchive,
  FileImage,
  FileSpreadsheet,
  FileText,
  Github,
  Globe,
  Paperclip,
  Pin,
  PlayCircle,
  Sparkles,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { ActionBar } from "@/components/announcement/action-bar";
import { CommentsSection } from "@/components/comments/comments-section";
import { Markdown } from "@/components/markdown";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { UserAvatar } from "@/components/user-avatar";
import { uploadsApi } from "@/lib/api";
import { formatBytes, formatDate, formatNumber } from "@/lib/utils";
import type { Announcement } from "@/lib/types";

export const dynamic = "force-dynamic";

function apiBase(): string {
  return process.env.INTERNAL_API_URL ?? "http://localhost:8080";
}

async function fetchAnnouncement(slug: string): Promise<Announcement | null> {
  const res = await fetch(`${apiBase()}/api/v1/announcements/${encodeURIComponent(slug)}`, {
    cache: "no-store",
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Failed to load announcement: ${res.status}`);
  return (await res.json()) as Announcement;
}

function fileTypeIcon(contentType: string): LucideIcon {
  if (contentType.startsWith("image/")) return FileImage;
  if (contentType.includes("zip") || contentType.includes("compressed")) return FileArchive;
  if (contentType.includes("sheet") || contentType.includes("excel") || contentType === "text/csv")
    return FileSpreadsheet;
  if (contentType.includes("text") || contentType.includes("pdf") || contentType.includes("word")) return FileText;
  return FileIconDefault;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  try {
    const announcement = await fetchAnnouncement(slug);
    if (!announcement) return { title: "Announcement not found" };
    return {
      title: announcement.title,
      description: announcement.description,
      openGraph: {
        title: announcement.title,
        description: announcement.description,
        images: announcement.thumbnail_url ? [announcement.thumbnail_url] : undefined,
      },
    };
  } catch {
    return { title: "Announcement" };
  }
}

export default async function AnnouncementDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  let announcement: Announcement | null = null;
  try {
    announcement = await fetchAnnouncement(slug);
  } catch {
    announcement = null;
  }

  if (!announcement) notFound();

  const {
    id,
    title,
    content,
    thumbnail_url,
    author,
    category,
    tags,
    github_url,
    website_url,
    demo_url,
    cta_label,
    cta_url,
    is_pinned,
    is_featured,
    publish_date,
    views_count,
    reading_time,
    attachments,
  } = announcement;

  const resourceLinks = [
    github_url ? { href: github_url, label: "GitHub", icon: Github } : null,
    website_url ? { href: website_url, label: "Website", icon: Globe } : null,
    demo_url ? { href: demo_url, label: "Live demo", icon: PlayCircle } : null,
  ].filter(Boolean) as { href: string; label: string; icon: LucideIcon }[];

  return (
    <div className="container max-w-4xl py-10">
      <nav className="mb-4 flex items-center gap-1.5 text-sm text-muted-foreground">
        <Link href="/general" className="transition-colors hover:text-foreground">
          General
        </Link>
        {category ? (
          <>
            <ChevronRight className="h-3.5 w-3.5 shrink-0" />
            <Link href={`/categories/${category.slug}`} className="transition-colors hover:text-foreground">
              {category.name}
            </Link>
          </>
        ) : null}
        <ChevronRight className="h-3.5 w-3.5 shrink-0" />
        <span className="truncate text-foreground">{title}</span>
      </nav>

      {is_pinned || is_featured ? (
        <div className="mb-3 flex flex-wrap items-center gap-2">
          {is_pinned ? (
            <Badge variant="secondary">
              <Pin className="h-3 w-3" /> Pinned
            </Badge>
          ) : null}
          {is_featured ? (
            <Badge variant="gradient">
              <Sparkles className="h-3 w-3" /> Featured
            </Badge>
          ) : null}
        </div>
      ) : null}

      <h1 className="font-display text-3xl font-extrabold tracking-tight text-foreground text-balance sm:text-4xl">
        {title}
      </h1>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
        <Link href={`/profile/${author.username}`} className="group flex min-w-0 items-center gap-3">
          <UserAvatar user={author} className="h-11 w-11 shrink-0 ring-2 ring-transparent transition-all group-hover:ring-primary/30" />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground group-hover:text-primary">
              {author.full_name || author.username}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {formatDate(publish_date)} · {reading_time} min read · {formatNumber(views_count)} views
            </p>
          </div>
        </Link>

        <ActionBar announcement={announcement} />
      </div>

      {thumbnail_url ? (
        <div className="glow-sm relative my-8 aspect-video w-full overflow-hidden rounded-2xl border border-border bg-muted">
          <Image
            src={thumbnail_url}
            alt={title}
            fill
            priority
            sizes="(max-width: 768px) 100vw, 768px"
            className="object-cover"
          />
        </div>
      ) : (
        <Separator className="my-8" />
      )}

      <Markdown content={content} />

      {tags.length > 0 ? (
        <div className="mt-8 flex flex-wrap gap-2">
          {tags.map((tag) => (
            <Link key={tag} href={`/general?tag=${encodeURIComponent(tag)}`}>
              <Badge variant="secondary" className="font-mono">
                #{tag}
              </Badge>
            </Link>
          ))}
        </div>
      ) : null}

      {cta_url ? (
        <Button asChild size="lg" variant="gradient" className="mt-8 w-full sm:w-auto">
          <a href={cta_url} target="_blank" rel="noreferrer">
            {cta_label || "Learn more"}
            <ExternalLink className="h-4 w-4" />
          </a>
        </Button>
      ) : null}

      {resourceLinks.length > 0 ? (
        <div className="mt-6 flex flex-wrap gap-3">
          {resourceLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors hover:border-primary/40 hover:text-primary"
            >
              <link.icon className="h-4 w-4" />
              {link.label}
              <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
            </a>
          ))}
        </div>
      ) : null}

      {attachments.length > 0 ? (
        <div className="mt-8 rounded-2xl border border-border bg-card p-4">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
            <Paperclip className="h-4 w-4 text-primary" />
            Attachments ({attachments.length})
          </h3>
          <ul className="space-y-2">
            {attachments.map((attachment) => {
              const Icon = fileTypeIcon(attachment.content_type);
              return (
                <li
                  key={attachment.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-border/70 px-3 py-2.5 transition-colors hover:border-primary/30"
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-secondary text-muted-foreground">
                      <Icon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">{attachment.original_name}</p>
                      <p className="font-mono text-xs text-muted-foreground">
                        {formatBytes(attachment.size)} · {attachment.downloads_count} downloads
                      </p>
                    </div>
                  </div>
                  <a
                    href={uploadsApi.downloadUrl(attachment.id)}
                    className="shrink-0 rounded-full p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                    aria-label={`Download ${attachment.original_name}`}
                  >
                    <Download className="h-4 w-4" />
                  </a>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      <Separator className="my-10" />

      <CommentsSection announcementId={id} />
    </div>
  );
}
