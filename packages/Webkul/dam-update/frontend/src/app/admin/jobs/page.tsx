"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow, parseISO } from "date-fns";
import { Clock, Loader2, Play, RotateCcw } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Panel, PanelHeader, ROW_HOVER_CLASS, TABLE_HEAD_CLASS } from "@/components/admin/panel";
import { Reveal, RevealItem, RevealStagger } from "@/components/motion";
import { adminApi, ApiError } from "@/lib/api";
import { cn, formatDate, formatNumber } from "@/lib/utils";
import type { JobInfo, JobRun } from "@/lib/types";

const SHIMMER_LINE = "h-8 w-full rounded-md bg-gradient-to-r from-secondary via-secondary/50 to-secondary bg-[length:200%_100%] animate-shimmer";
const SHIMMER_CARD = "h-[164px] rounded-2xl bg-gradient-to-r from-secondary via-secondary/50 to-secondary bg-[length:200%_100%] animate-shimmer";

const TRIGGER_DOT: Record<string, string> = {
  manual: "bg-primary",
  scheduled: "bg-cyan-400",
  retry: "bg-amber-400",
};

function formatNextRun(iso: string | null): string {
  if (!iso) return "—";
  try {
    return formatDistanceToNow(parseISO(iso), { addSuffix: true });
  } catch {
    return "—";
  }
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function StatusBadge({ status }: { status: JobRun["status"] }) {
  if (status === "success") {
    return (
      <Badge variant="outline" className="border-emerald-500/40 text-emerald-500 dark:text-emerald-400">
        Success
      </Badge>
    );
  }
  if (status === "failed") return <Badge variant="destructive">Failed</Badge>;
  return (
    <Badge variant="outline" className="border-amber-500/40 text-amber-500 dark:text-amber-400">
      Running
    </Badge>
  );
}

function TriggerChip({ trigger }: { trigger: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
      <span className={cn("h-1.5 w-1.5 rounded-full", TRIGGER_DOT[trigger] ?? "bg-muted-foreground")} aria-hidden />
      {trigger}
    </span>
  );
}

function JobCard({ job, running, onRun }: { job: JobInfo; running: boolean; onRun: () => void }) {
  return (
    <RevealItem>
      <div className="group relative overflow-hidden rounded-2xl border border-border bg-card p-5 transition-colors duration-300 hover:border-primary/35">
        <div className="pointer-events-none absolute -right-6 -top-10 h-28 w-28 rounded-full bg-primary/10 opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100" />
        <div className="relative">
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">{job.name}</p>
          <h3 className="mt-1 font-display text-[15px] font-semibold text-foreground">{job.label}</h3>
          <p className="mt-1.5 text-sm text-muted-foreground">{job.description}</p>
          <div className="mt-4 flex items-center justify-between gap-3">
            <span className="inline-flex items-center gap-1.5 font-mono text-xs text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              {job.next_run ? `Next ${formatNextRun(job.next_run)}` : "Not scheduled"}
            </span>
            <Button type="button" size="sm" variant="outline" onClick={onRun} disabled={running}>
              {running ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
              Run now
            </Button>
          </div>
        </div>
      </div>
    </RevealItem>
  );
}

export default function AdminJobsPage() {
  const queryClient = useQueryClient();
  const [runningJob, setRunningJob] = useState<string | null>(null);
  const [retryingId, setRetryingId] = useState<number | null>(null);

  const { data: overview, isLoading: jobsLoading } = useQuery({
    queryKey: ["admin", "jobs"],
    queryFn: adminApi.jobs,
  });

  const {
    data: runs,
    isLoading: runsLoading,
    isError: runsError,
  } = useQuery({
    queryKey: ["admin", "jobs", "runs"],
    queryFn: adminApi.jobRuns,
    refetchInterval: 10_000,
  });

  function invalidateAll() {
    queryClient.invalidateQueries({ queryKey: ["admin", "jobs"] });
  }

  async function handleRunJob(name: string) {
    setRunningJob(name);
    try {
      const res = await adminApi.runJob(name);
      toast.success(res.detail || `${res.name} finished`);
      invalidateAll();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.detail : "Job failed to run");
    } finally {
      setRunningJob(null);
    }
  }

  async function handleRetry(id: number) {
    setRetryingId(id);
    try {
      const res = await adminApi.retryRun(id);
      toast.success(res.detail || `${res.name} retried`);
      invalidateAll();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.detail : "Retry failed");
    } finally {
      setRetryingId(null);
    }
  }

  function jobLabel(name: string): string {
    return overview?.jobs.find((j) => j.name === name)?.label ?? name;
  }

  return (
    <div className="space-y-6">
      <Reveal>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-primary">Scheduler</p>
            <h2 className="mt-1 font-display text-lg font-semibold text-foreground">Background jobs</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Registered jobs, manual triggers, and run history.
            </p>
          </div>
          {jobsLoading ? (
            <div className="h-11 w-56 animate-pulse rounded-2xl bg-secondary" />
          ) : (
            <div className="flex items-center gap-4 rounded-2xl border border-border bg-card px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span
                    className={cn(
                      "absolute inline-flex h-full w-full animate-ping rounded-full",
                      overview?.worker_running ? "bg-emerald-400/60" : "bg-red-400/60",
                    )}
                  />
                  <span
                    className={cn(
                      "relative inline-flex h-2 w-2 rounded-full",
                      overview?.worker_running ? "bg-emerald-400" : "bg-red-400",
                    )}
                  />
                </span>
                <span className="text-sm font-medium text-foreground">
                  {overview?.worker_running ? "Worker running" : "Worker stopped"}
                </span>
              </div>
              <div className="h-8 w-px bg-border" aria-hidden />
              <p className="font-mono text-sm text-muted-foreground">
                <span className="text-foreground">{overview?.scheduled ?? 0}</span> scheduled
              </p>
            </div>
          )}
        </div>
      </Reveal>

      {jobsLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className={SHIMMER_CARD} />
          ))}
        </div>
      ) : !overview?.jobs.length ? (
        <Panel>
          <div className="p-10 text-center text-sm text-muted-foreground">No jobs registered.</div>
        </Panel>
      ) : (
        <RevealStagger className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {overview.jobs.map((job) => (
            <JobCard
              key={job.name}
              job={job}
              running={runningJob === job.name}
              onRun={() => handleRunJob(job.name)}
            />
          ))}
        </RevealStagger>
      )}

      <Reveal>
        <Panel>
          <PanelHeader eyebrow="History" title="Run history" description="Most recent job executions, manual and scheduled." />
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className={TABLE_HEAD_CLASS}>Job</TableHead>
                  <TableHead className={TABLE_HEAD_CLASS}>Status</TableHead>
                  <TableHead className={TABLE_HEAD_CLASS}>Items</TableHead>
                  <TableHead className={TABLE_HEAD_CLASS}>Duration</TableHead>
                  <TableHead className={TABLE_HEAD_CLASS}>Trigger</TableHead>
                  <TableHead className={TABLE_HEAD_CLASS}>Ran</TableHead>
                  <TableHead className={cn(TABLE_HEAD_CLASS, "text-right")}>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {runsLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i} className={ROW_HOVER_CLASS}>
                      <TableCell colSpan={7}>
                        <div className={SHIMMER_LINE} />
                      </TableCell>
                    </TableRow>
                  ))
                ) : runsError || !runs || runs.length === 0 ? (
                  <TableRow className={ROW_HOVER_CLASS}>
                    <TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                      {runsError ? "Couldn't load run history." : "No job runs yet."}
                    </TableCell>
                  </TableRow>
                ) : (
                  runs.map((run) => (
                    <TableRow key={run.id} className={ROW_HOVER_CLASS}>
                      <TableCell className="text-sm font-medium text-foreground">{jobLabel(run.name)}</TableCell>
                      <TableCell>
                        <StatusBadge status={run.status} />
                      </TableCell>
                      <TableCell className="font-mono text-sm text-muted-foreground">
                        {formatNumber(run.items)}
                      </TableCell>
                      <TableCell className="font-mono text-sm text-muted-foreground">
                        {formatDuration(run.duration_ms)}
                      </TableCell>
                      <TableCell>
                        <TriggerChip trigger={run.trigger} />
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(run.created_at, "MMM d, HH:mm")}
                      </TableCell>
                      <TableCell className="text-right">
                        {run.status === "failed" ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => handleRetry(run.id)}
                            disabled={retryingId === run.id}
                          >
                            {retryingId === run.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <RotateCcw className="h-3.5 w-3.5" />
                            )}
                            Retry
                          </Button>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </Panel>
      </Reveal>
    </div>
  );
}
