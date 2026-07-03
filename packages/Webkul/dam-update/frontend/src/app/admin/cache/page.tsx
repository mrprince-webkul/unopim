"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2,
  Flame,
  History,
  KeyRound,
  Loader2,
  Percent,
  RotateCcw,
  Trash2,
  XCircle,
} from "lucide-react";
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Panel, PanelHeader, ROW_HOVER_CLASS, TABLE_HEAD_CLASS } from "@/components/admin/panel";
import { StatTile } from "@/components/admin/stat-tile";
import { Reveal, RevealStagger } from "@/components/motion";
import { adminApi, ApiError } from "@/lib/api";
import { cn, formatNumber } from "@/lib/utils";

const SHIMMER_LINE = "h-8 w-full rounded-md bg-gradient-to-r from-secondary via-secondary/50 to-secondary bg-[length:200%_100%] animate-shimmer";

/** Renders seconds as a compact human TTL, e.g. 300 -> "5m". */
function formatTtl(seconds: number | undefined): string {
  if (!seconds || seconds <= 0) return "—";
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.round(seconds / 3600)}h`;
  return `${Math.round(seconds / 86400)}d`;
}

export default function AdminCachePage() {
  const queryClient = useQueryClient();
  const [clearingGroup, setClearingGroup] = useState<string | null>(null);
  const [warming, setWarming] = useState(false);
  const [clearingAll, setClearingAll] = useState(false);
  const [clearAllOpen, setClearAllOpen] = useState(false);
  const [resetting, setResetting] = useState(false);

  const { data: stats, isLoading, isError } = useQuery({
    queryKey: ["admin", "cache-stats"],
    queryFn: adminApi.cacheStats,
    refetchInterval: 10_000,
  });

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["admin", "cache-stats"] });
  }

  async function handleClearGroup(group: string) {
    setClearingGroup(group);
    try {
      const res = await adminApi.clearCacheGroup(group);
      toast.success(res.detail || `Cleared ${res.cleared} key${res.cleared === 1 ? "" : "s"} from "${group}"`);
      invalidate();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.detail : "Something went wrong");
    } finally {
      setClearingGroup(null);
    }
  }

  async function handleWarm() {
    setWarming(true);
    try {
      const res = await adminApi.warmCache();
      toast.success(
        res.count > 0 ? `Warmed ${res.count} cache${res.count === 1 ? "" : "s"}: ${res.warmed.join(", ")}` : "Nothing to warm",
      );
      invalidate();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.detail : "Warm-up failed");
    } finally {
      setWarming(false);
    }
  }

  async function handleClearAll() {
    setClearingAll(true);
    try {
      const res = await adminApi.clearCache();
      toast.success(res.detail || `Cleared ${res.cleared} key${res.cleared === 1 ? "" : "s"}`);
      setClearAllOpen(false);
      invalidate();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.detail : "Clear failed");
    } finally {
      setClearingAll(false);
    }
  }

  async function handleResetStats() {
    setResetting(true);
    try {
      const res = await adminApi.resetCacheStats();
      toast.success(res.detail || "Stats reset");
      invalidate();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.detail : "Reset failed");
    } finally {
      setResetting(false);
    }
  }

  const hitPct = stats ? Math.max(0, Math.min(100, stats.hit_ratio * 100)) : 0;
  const groupNames = stats
    ? Array.from(new Set([...Object.keys(stats.groups), ...Object.keys(stats.ttls)])).sort()
    : [];

  return (
    <div className="space-y-6">
      <Reveal>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.2em] text-primary">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/60" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
              </span>
              Live · refreshes every 10s
            </p>
            <h2 className="mt-1 font-display text-lg font-semibold text-foreground">Cache</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Runtime performance for the read-through cache layer.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={handleResetStats} disabled={resetting}>
              {resetting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
              Reset stats
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={handleWarm} disabled={warming}>
              {warming ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Flame className="h-3.5 w-3.5" />}
              Warm cache
            </Button>
            <Button type="button" variant="destructive" size="sm" onClick={() => setClearAllOpen(true)}>
              <Trash2 className="h-3.5 w-3.5" />
              Clear all
            </Button>
          </div>
        </div>
      </Reveal>

      <RevealStagger className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <StatTile
          icon={Percent}
          label="Hit ratio"
          loading={isLoading}
          formatted={stats ? `${(stats.hit_ratio * 100).toFixed(1)}%` : undefined}
        />
        <StatTile icon={CheckCircle2} label="Hits" value={stats?.hits} loading={isLoading} />
        <StatTile icon={XCircle} label="Misses" value={stats?.misses} loading={isLoading} />
        <StatTile icon={KeyRound} label="Cached keys" value={stats?.keys} loading={isLoading} />
        <StatTile icon={History} label="Stale served" value={stats?.stale_served} loading={isLoading} />
        <StatTile icon={RotateCcw} label="Invalidations" value={stats?.invalidations} loading={isLoading} />
      </RevealStagger>

      <Reveal>
        <Panel>
          <PanelHeader
            eyebrow="Traffic split"
            title="Hit / miss ratio"
            description="Share of cache reads served from cache versus recomputed from source."
          />
          <div className="space-y-3 p-5">
            {isLoading ? (
              <div className="h-3 w-full animate-pulse rounded-full bg-secondary" />
            ) : (
              <>
                <div className="flex h-3 w-full overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-400 to-emerald-300 transition-all duration-500"
                    style={{ width: `${hitPct}%` }}
                  />
                  <div
                    className="h-full bg-muted-foreground/25 transition-all duration-500"
                    style={{ width: `${100 - hitPct}%` }}
                  />
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <span className="h-2 w-2 rounded-full bg-emerald-400" aria-hidden />
                    Hits — {formatNumber(stats?.hits ?? 0)} ({hitPct.toFixed(1)}%)
                  </span>
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <span className="h-2 w-2 rounded-full bg-muted-foreground/40" aria-hidden />
                    Misses — {formatNumber(stats?.misses ?? 0)} ({(100 - hitPct).toFixed(1)}%)
                  </span>
                </div>
              </>
            )}
          </div>
        </Panel>
      </Reveal>

      <Reveal>
        <Panel>
          <PanelHeader
            eyebrow={`${groupNames.length} group${groupNames.length === 1 ? "" : "s"}`}
            title="Cache groups"
            description="Per-group key counts and configured TTL."
          />
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className={TABLE_HEAD_CLASS}>Group</TableHead>
                  <TableHead className={TABLE_HEAD_CLASS}>Keys</TableHead>
                  <TableHead className={TABLE_HEAD_CLASS}>TTL</TableHead>
                  <TableHead className={cn(TABLE_HEAD_CLASS, "text-right")}>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <TableRow key={i} className={ROW_HOVER_CLASS}>
                      <TableCell colSpan={4}>
                        <div className={SHIMMER_LINE} />
                      </TableCell>
                    </TableRow>
                  ))
                ) : isError || !stats || groupNames.length === 0 ? (
                  <TableRow className={ROW_HOVER_CLASS}>
                    <TableCell colSpan={4} className="py-10 text-center text-sm text-muted-foreground">
                      {isError ? "Couldn't load cache stats." : "No cache groups configured."}
                    </TableCell>
                  </TableRow>
                ) : (
                  groupNames.map((group) => (
                    <TableRow key={group} className={ROW_HOVER_CLASS}>
                      <TableCell className="font-mono text-sm text-foreground">{group}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatNumber(stats.groups[group] ?? 0)}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {formatTtl(stats.ttls[group])}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => handleClearGroup(group)}
                          disabled={clearingGroup === group}
                        >
                          {clearingGroup === group ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                          )}
                          Clear
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </Panel>
      </Reveal>

      <Dialog open={clearAllOpen} onOpenChange={setClearAllOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Clear the entire cache?</DialogTitle>
            <DialogDescription>
              This purges every cached key across all groups. The next reads will recompute from source, which can
              briefly increase load.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setClearAllOpen(false)} disabled={clearingAll}>
              Cancel
            </Button>
            <Button type="button" variant="destructive" onClick={handleClearAll} disabled={clearingAll}>
              {clearingAll ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Clear all
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
