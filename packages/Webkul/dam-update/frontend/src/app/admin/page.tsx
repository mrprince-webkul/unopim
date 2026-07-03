"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  Bot,
  Database,
  Download,
  FileText,
  HardDrive,
  ListChecks,
  MessageCircle,
  Newspaper,
  Server,
  UserCheck,
  UserPlus,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { PostsPerDayChart, UserGrowthChart } from "@/components/admin/charts";
import { LegendChip, Panel, PanelHeader } from "@/components/admin/panel";
import { StatTile } from "@/components/admin/stat-tile";
import { Reveal, RevealStagger } from "@/components/motion";
import { adminApi } from "@/lib/api";
import { cn, formatBytes, formatNumber } from "@/lib/utils";
import type { AdminStats, HealthCheck, SystemHealth } from "@/lib/types";

const STAT_ITEMS: { key: keyof AdminStats; label: string; icon: LucideIcon }[] = [
  { key: "users", label: "Total Users", icon: Users },
  { key: "active_users", label: "Active Users", icon: UserCheck },
  { key: "new_users_today", label: "New Today", icon: UserPlus },
  { key: "posts", label: "Announcements", icon: FileText },
  { key: "news_count", label: "Dev News", icon: Newspaper },
  { key: "downloads", label: "Downloads", icon: Download },
  { key: "comments", label: "Comments", icon: MessageCircle },
];

const CATEGORY_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

const ENGAGEMENT_ITEMS: { key: keyof AdminStats["engagement"]; label: string }[] = [
  { key: "views", label: "Views" },
  { key: "likes", label: "Likes" },
  { key: "comments", label: "Comments" },
  { key: "bookmarks", label: "Bookmarks" },
];

const HEALTH_ITEMS: { key: keyof SystemHealth; label: string; icon: LucideIcon }[] = [
  { key: "database", label: "Database", icon: Database },
  { key: "redis", label: "Redis", icon: Server },
  { key: "storage", label: "Storage", icon: HardDrive },
  { key: "ai", label: "AI Engine", icon: Bot },
  { key: "queue", label: "Queue", icon: ListChecks },
];

type HealthTone = "ok" | "warn" | "down";

/** Amber covers degraded / idle / needs_key / stopped — anything short of a clean "ok". */
function healthTone(status: string): HealthTone {
  if (status === "ok") return "ok";
  if (status === "down") return "down";
  return "warn";
}

const TONE_DOT: Record<HealthTone, string> = {
  ok: "bg-emerald-500 shadow-[0_0_8px_2px_rgba(16,185,129,0.55)]",
  warn: "bg-amber-500 shadow-[0_0_8px_2px_rgba(245,158,11,0.55)]",
  down: "bg-red-500 shadow-[0_0_8px_2px_rgba(239,68,68,0.55)]",
};

const TONE_TEXT: Record<HealthTone, string> = {
  ok: "text-emerald-500 dark:text-emerald-400",
  warn: "text-amber-500 dark:text-amber-400",
  down: "text-red-500 dark:text-red-400",
};

const SHIMMER_BLOCK = "rounded-xl bg-gradient-to-r from-secondary via-secondary/50 to-secondary bg-[length:200%_100%] animate-shimmer";
const SHIMMER_LINE = "h-4 rounded-md bg-gradient-to-r from-secondary via-secondary/50 to-secondary bg-[length:200%_100%] animate-shimmer";

/** Decorative scale indicator, not tied to a hard storage quota. */
function storageUsageWidth(bytes: number): number {
  const gb = bytes / 1024 ** 3;
  return Math.min(100, Math.max(4, Math.round(gb * 12)));
}

function HealthChip({ label, icon: Icon, check }: { label: string; icon: LucideIcon; check?: HealthCheck }) {
  const tone = check ? healthTone(check.status) : "warn";
  return (
    <div className="rounded-xl border border-border bg-background/40 p-4 transition-colors duration-300 hover:border-primary/30">
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-sm font-medium text-foreground">
          <Icon className="h-4 w-4 text-muted-foreground" />
          {label}
        </span>
        <span className={cn("h-2 w-2 shrink-0 animate-pulse rounded-full", TONE_DOT[tone])} aria-hidden />
      </div>
      <p className={cn("mt-2.5 font-mono text-[10px] uppercase tracking-[0.18em]", TONE_TEXT[tone])}>
        {check?.status ?? "unknown"}
      </p>
      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{check?.detail ?? "No data yet."}</p>
    </div>
  );
}

export default function AdminOverviewPage() {
  const { data: stats, isLoading } = useQuery({ queryKey: ["admin", "stats"], queryFn: adminApi.stats });
  const { data: health, isLoading: healthLoading } = useQuery({
    queryKey: ["admin", "health"],
    queryFn: adminApi.health,
    refetchInterval: 15_000,
  });
  const { data: aiStatus, isLoading: aiLoading } = useQuery({
    queryKey: ["admin", "ai", "status"],
    queryFn: adminApi.aiStatus,
    refetchInterval: 15_000,
  });

  const maxCategoryCount = Math.max(1, ...(stats?.popular_categories.map((c) => c.count) ?? [1]));
  const providerPct = aiStatus && aiStatus.total > 0 ? Math.round((aiStatus.enabled_count / aiStatus.total) * 100) : 0;

  return (
    <div className="space-y-6">
      <RevealStagger className="grid grid-cols-2 gap-4 sm:grid-cols-4 xl:grid-cols-8">
        {STAT_ITEMS.map((item) => (
          <StatTile
            key={item.key}
            icon={item.icon}
            label={item.label}
            value={stats ? (stats[item.key] as number) : 0}
            loading={isLoading}
          />
        ))}
        <StatTile
          icon={HardDrive}
          label="Storage"
          loading={isLoading}
          formatted={stats ? formatBytes(stats.storage_bytes) : undefined}
          extra={
            !isLoading && stats ? (
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-emerald-400"
                  style={{ width: `${storageUsageWidth(stats.storage_bytes)}%` }}
                />
              </div>
            ) : undefined
          }
        />
      </RevealStagger>

      <div className="grid gap-6 lg:grid-cols-3">
        <Reveal className="lg:col-span-2">
          <Panel>
            <PanelHeader
              eyebrow="Every 15s"
              title="System health"
              action={
                <span className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" aria-hidden />
                  Live
                </span>
              }
            />
            <div className="grid grid-cols-2 gap-3 p-5 sm:grid-cols-3 lg:grid-cols-5">
              {healthLoading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className={`${SHIMMER_BLOCK} h-[104px] w-full`} />
                  ))
                : HEALTH_ITEMS.map((item) => (
                    <HealthChip key={item.key} label={item.label} icon={item.icon} check={health?.[item.key]} />
                  ))}
            </div>
          </Panel>
        </Reveal>

        <Reveal delay={0.05}>
          <Panel>
            <PanelHeader eyebrow="Engine" title="AI engine" />
            <div className="space-y-5 p-5">
              {aiLoading ? (
                <>
                  <div className={`${SHIMMER_LINE} w-2/3`} />
                  <div className={`${SHIMMER_LINE} w-1/2`} />
                </>
              ) : aiStatus?.active_provider ? (
                <div>
                  <p className="font-display text-lg font-semibold text-foreground">
                    {aiStatus.active_model ?? "Unnamed model"}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">via {aiStatus.active_provider}</p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No active provider —{" "}
                  <Link href="/admin/ai" className="text-primary hover:underline">
                    configure in AI Providers
                  </Link>
                  .
                </p>
              )}
              <div>
                <div className="mb-1.5 flex items-center justify-between text-xs">
                  <span className="font-mono uppercase tracking-wider text-muted-foreground">Providers enabled</span>
                  <span className="font-mono tabular-nums text-foreground">
                    {aiStatus?.enabled_count ?? 0} / {aiStatus?.total ?? 0}
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-violet-400 to-fuchsia-400"
                    style={{ width: `${providerPct}%` }}
                  />
                </div>
              </div>
            </div>
          </Panel>
        </Reveal>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Reveal>
          <Panel>
            <PanelHeader
              eyebrow="30 days"
              title="User growth"
              action={<LegendChip color="hsl(var(--chart-1))" label="New users" />}
            />
            <div className="p-4 pt-2">
              {isLoading ? (
                <div className={`${SHIMMER_BLOCK} h-[240px] w-full`} />
              ) : (
                <UserGrowthChart data={stats?.user_growth ?? []} />
              )}
            </div>
          </Panel>
        </Reveal>
        <Reveal delay={0.05}>
          <Panel>
            <PanelHeader
              eyebrow="30 days"
              title="Posts per day"
              action={<LegendChip color="hsl(var(--chart-3))" label="Posts" />}
            />
            <div className="p-4 pt-2">
              {isLoading ? (
                <div className={`${SHIMMER_BLOCK} h-[240px] w-full`} />
              ) : (
                <PostsPerDayChart data={stats?.posts_per_day ?? []} />
              )}
            </div>
          </Panel>
        </Reveal>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Reveal>
          <Panel>
            <PanelHeader eyebrow="Content mix" title="Popular categories" />
            <div className="space-y-4 p-5">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => <div key={i} className={`${SHIMMER_LINE} w-full`} />)
              ) : !stats?.popular_categories.length ? (
                <p className="text-sm text-muted-foreground">No data yet.</p>
              ) : (
                stats.popular_categories.map((c, i) => {
                  const color = CATEGORY_COLORS[i % CATEGORY_COLORS.length];
                  return (
                    <div key={c.name}>
                      <div className="mb-1.5 flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2 text-foreground">
                          <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: color }} aria-hidden />
                          {c.name}
                        </span>
                        <span className="font-mono text-xs text-muted-foreground">{formatNumber(c.count)}</span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${(c.count / maxCategoryCount) * 100}%`,
                            background: `linear-gradient(to right, ${color}, hsl(var(--chart-2)))`,
                          }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </Panel>
        </Reveal>

        <Reveal delay={0.05}>
          <Panel>
            <PanelHeader eyebrow="Totals" title="Engagement summary" />
            <div className="grid grid-cols-2 gap-4 p-5 sm:grid-cols-4">
              {ENGAGEMENT_ITEMS.map((item) => (
                <div key={item.key}>
                  {isLoading ? (
                    <div className={`${SHIMMER_LINE} w-14`} />
                  ) : (
                    <p className="font-mono text-xl font-semibold tabular-nums text-foreground">
                      {formatNumber(stats?.engagement[item.key] ?? 0)}
                    </p>
                  )}
                  <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                    {item.label}
                  </p>
                </div>
              ))}
            </div>
          </Panel>
        </Reveal>
      </div>
    </div>
  );
}
