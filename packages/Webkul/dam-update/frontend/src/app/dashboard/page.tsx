"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  Bookmark,
  Download,
  Eye,
  Heart,
  Loader2,
  PlusCircle,
  Settings,
  User as UserIcon,
  FileText,
} from "lucide-react";

import { MonthlyEngagementChart, WeeklyViewsChart } from "@/components/dashboard/charts";
import { MyPosts } from "@/components/dashboard/my-posts";
import { LegendChip, Panel, PanelHeader } from "@/components/dashboard/panel";
import { StatTile } from "@/components/dashboard/stat-tile";
import { Reveal, RevealItem, RevealStagger } from "@/components/motion";
import { Button } from "@/components/ui/button";
import { usersApi } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { timeAgo } from "@/lib/utils";

const STAT_ITEMS = [
  { key: "posts" as const, label: "Posts", icon: FileText },
  { key: "views" as const, label: "Views", icon: Eye },
  { key: "likes" as const, label: "Likes", icon: Heart },
  { key: "bookmarks" as const, label: "Bookmarks", icon: Bookmark },
  { key: "downloads" as const, label: "Downloads", icon: Download },
];

const QUICK_ACTIONS = [
  { href: "/announcements/new", label: "New announcement", icon: PlusCircle },
  { href: "/bookmarks", label: "Bookmarks", icon: Bookmark },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

const SHIMMER_LINE = "h-4 rounded-md bg-gradient-to-r from-secondary via-secondary/50 to-secondary bg-[length:200%_100%] animate-shimmer";
const SHIMMER_BLOCK = "rounded-xl bg-gradient-to-r from-secondary via-secondary/50 to-secondary bg-[length:200%_100%] animate-shimmer";

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace("/login?next=/dashboard");
  }, [loading, user, router]);

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["user-stats"],
    queryFn: usersApi.myStats,
    enabled: Boolean(user),
  });

  if (loading || !user) {
    return (
      <div className="container flex min-h-[60vh] items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const displayName = user.full_name || user.username;

  return (
    <div className="container py-8">
      <Reveal>
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-primary">Dashboard</p>
            <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Welcome back, <span className="gradient-text">{displayName}</span>
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground">Here&apos;s how your announcements are doing.</p>
          </div>
          <Button asChild variant="gradient">
            <Link href="/announcements/new">
              <PlusCircle className="h-4 w-4" />
              New announcement
            </Link>
          </Button>
        </div>
      </Reveal>

      <RevealStagger className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {STAT_ITEMS.map((item) => (
          <StatTile
            key={item.key}
            icon={item.icon}
            label={item.label}
            value={stats?.[item.key] ?? 0}
            loading={statsLoading}
          />
        ))}
      </RevealStagger>

      <div className="mb-8 grid gap-6 lg:grid-cols-2">
        <Reveal>
          <Panel>
            <PanelHeader
              eyebrow="This week"
              title="Views this week"
              action={<LegendChip color="hsl(var(--chart-1))" label="Views" />}
            />
            <div className="p-4 pt-2">
              {statsLoading ? (
                <div className={`${SHIMMER_BLOCK} h-[220px] w-full`} />
              ) : (
                <WeeklyViewsChart data={stats?.weekly_views ?? []} />
              )}
            </div>
          </Panel>
        </Reveal>

        <Reveal delay={0.05}>
          <Panel>
            <PanelHeader
              eyebrow="Last 30 days"
              title="Engagement"
              action={
                <div className="flex flex-wrap items-center gap-3">
                  <LegendChip color="hsl(var(--chart-1))" label="Views" />
                  <LegendChip color="hsl(var(--chart-2))" label="Likes" />
                  <LegendChip color="hsl(var(--chart-4))" label="Comments" />
                </div>
              }
            />
            <div className="p-4 pt-2">
              {statsLoading ? (
                <div className={`${SHIMMER_BLOCK} h-[260px] w-full`} />
              ) : (
                <MonthlyEngagementChart data={stats?.monthly_engagement ?? []} />
              )}
            </div>
          </Panel>
        </Reveal>
      </div>

      <div className="mb-8 grid gap-6 lg:grid-cols-3">
        <Reveal className="lg:col-span-2">
          <Panel>
            <PanelHeader eyebrow="Timeline" title="Recent activity" />
            <div className="p-5">
              {statsLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className={`${SHIMMER_LINE} w-full`} />
                  ))}
                </div>
              ) : !stats?.recent_activity.length ? (
                <p className="text-sm text-muted-foreground">No recent activity yet.</p>
              ) : (
                <ul>
                  {stats.recent_activity.map((activity, i) => (
                    <li key={i} className="relative flex gap-3 pb-5 pl-1 last:pb-0">
                      {i < stats.recent_activity.length - 1 ? (
                        <span className="absolute bottom-0 left-[3px] top-2.5 w-px border-l border-border" />
                      ) : null}
                      <span className="relative mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                      <div className="flex min-w-0 flex-1 flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                        <span className="text-sm text-foreground/90">{activity.detail}</span>
                        <span className="shrink-0 font-mono text-[11px] text-muted-foreground">
                          {timeAgo(activity.created_at)}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Panel>
        </Reveal>

        <Reveal delay={0.05}>
          <Panel className="h-full">
            <PanelHeader eyebrow="Shortcuts" title="Quick actions" />
            <RevealStagger className="grid grid-cols-1 gap-2.5 p-4">
              {QUICK_ACTIONS.map((action) => (
                <RevealItem key={action.href}>
                  <Link
                    href={action.href}
                    className="group flex items-center gap-3 rounded-xl border border-border bg-secondary/20 px-3 py-2.5 text-sm font-medium text-foreground transition-colors hover:border-primary/40 hover:bg-primary/[0.06]"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-primary/25 bg-primary/[0.08] text-primary">
                      <action.icon className="h-4 w-4" />
                    </span>
                    {action.label}
                  </Link>
                </RevealItem>
              ))}
              <RevealItem>
                <Link
                  href={`/profile/${user.username}`}
                  className="group flex items-center gap-3 rounded-xl border border-border bg-secondary/20 px-3 py-2.5 text-sm font-medium text-foreground transition-colors hover:border-primary/40 hover:bg-primary/[0.06]"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-primary/25 bg-primary/[0.08] text-primary">
                    <UserIcon className="h-4 w-4" />
                  </span>
                  View profile
                </Link>
              </RevealItem>
            </RevealStagger>
          </Panel>
        </Reveal>
      </div>

      <Reveal>
        <Panel>
          <PanelHeader eyebrow="Content" title="My posts" />
          <div className="p-5">
            <MyPosts username={user.username} />
          </div>
        </Panel>
      </Reveal>
    </div>
  );
}
