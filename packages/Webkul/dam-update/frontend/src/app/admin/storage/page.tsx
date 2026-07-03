"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Database, ExternalLink, Files, HardDrive, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Panel, PanelHeader, ROW_HOVER_CLASS, TABLE_HEAD_CLASS } from "@/components/admin/panel";
import { StatTile } from "@/components/admin/stat-tile";
import { Reveal, RevealStagger } from "@/components/motion";
import { adminApi, ApiError } from "@/lib/api";
import { cn, formatBytes, formatDate, formatNumber } from "@/lib/utils";
import type { StorageFile } from "@/lib/types";

const SHIMMER_LINE =
  "h-8 w-full rounded-md bg-gradient-to-r from-secondary via-secondary/50 to-secondary bg-[length:200%_100%] animate-shimmer";

const TYPE_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

type FileFilter = "all" | "orphan";

function DeleteFileButton({ file, onDone }: { file: StorageFile; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function handleDelete() {
    setBusy(true);
    try {
      await adminApi.deleteFile(file.id);
      toast.success("File deleted");
      setOpen(false);
      onDone();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.detail : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
        onClick={() => setOpen(true)}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete &ldquo;{file.original_name}&rdquo;?</DialogTitle>
            <DialogDescription>
              This permanently removes the file from storage
              {file.announcement_id ? " and detaches it from its announcement" : ""}. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={busy}>
              Cancel
            </Button>
            <Button type="button" variant="destructive" onClick={handleDelete} disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function AdminStoragePage() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<FileFilter>("all");
  const [page, setPage] = useState(1);

  const { data: analytics, isLoading: analyticsLoading } = useQuery({
    queryKey: ["admin", "storage", "analytics"],
    queryFn: adminApi.storageAnalytics,
  });

  const {
    data: filesData,
    isLoading: filesLoading,
    isError: filesError,
  } = useQuery({
    queryKey: ["admin", "storage", "files", filter, page],
    queryFn: () => adminApi.storageFiles({ page, size: 20, orphan: filter === "orphan" ? true : undefined }),
  });

  function handleFilesChanged() {
    queryClient.invalidateQueries({ queryKey: ["admin", "storage"] });
  }

  const maxTypeBytes = Math.max(1, ...(analytics?.by_type.map((t) => t.bytes) ?? [1]));

  return (
    <div className="space-y-6">
      <Reveal>
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-primary">Infrastructure</p>
          <h2 className="mt-1 font-display text-lg font-semibold text-foreground">Storage</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Uploaded attachments across announcements — including orphaned files no longer linked to any post.
          </p>
        </div>
      </Reveal>

      <RevealStagger className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <StatTile
          icon={Files}
          label="Total files"
          value={analytics ? analytics.total_files : 0}
          loading={analyticsLoading}
        />
        <StatTile
          icon={HardDrive}
          label="Total size"
          formatted={analytics ? formatBytes(analytics.total_bytes) : undefined}
          loading={analyticsLoading}
        />
        <StatTile
          icon={AlertTriangle}
          label="Orphaned files"
          value={analytics ? analytics.orphan_files : 0}
          loading={analyticsLoading}
        />
        <StatTile
          icon={Trash2}
          label="Orphaned size"
          formatted={analytics ? formatBytes(analytics.orphan_bytes) : undefined}
          loading={analyticsLoading}
        />
        <StatTile
          icon={Database}
          label="Provider"
          formatted={analytics ? `${analytics.provider}: ${analytics.bucket}` : undefined}
          loading={analyticsLoading}
        />
      </RevealStagger>

      <Reveal>
        <Panel>
          <PanelHeader eyebrow="Breakdown" title="By type" />
          <div className="space-y-4 p-5">
            {analyticsLoading ? (
              Array.from({ length: 4 }).map((_, i) => <div key={i} className={cn(SHIMMER_LINE, "w-full")} />)
            ) : !analytics?.by_type.length ? (
              <p className="text-sm text-muted-foreground">No files yet.</p>
            ) : (
              analytics.by_type
                .slice()
                .sort((a, b) => b.bytes - a.bytes)
                .map((t, i) => {
                  const color = TYPE_COLORS[i % TYPE_COLORS.length];
                  return (
                    <div key={t.type}>
                      <div className="mb-1.5 flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2 capitalize text-foreground">
                          <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: color }} aria-hidden />
                          {t.type || "other"}
                        </span>
                        <span className="font-mono text-xs text-muted-foreground">
                          {formatNumber(t.count)} files · {formatBytes(t.bytes)}
                        </span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${(t.bytes / maxTypeBytes) * 100}%`,
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

      <Reveal>
        <div className="space-y-4">
          <Panel>
            <PanelHeader
              eyebrow={`${filesData?.total ?? 0} total`}
              title="Files"
              action={
                <Tabs
                  value={filter}
                  onValueChange={(v) => {
                    setFilter(v as FileFilter);
                    setPage(1);
                  }}
                >
                  <TabsList>
                    <TabsTrigger value="all">All</TabsTrigger>
                    <TabsTrigger value="orphan">Orphaned only</TabsTrigger>
                  </TabsList>
                </Tabs>
              }
            />

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className={TABLE_HEAD_CLASS}>File</TableHead>
                    <TableHead className={TABLE_HEAD_CLASS}>Type</TableHead>
                    <TableHead className={TABLE_HEAD_CLASS}>Size</TableHead>
                    <TableHead className={TABLE_HEAD_CLASS}>Downloads</TableHead>
                    <TableHead className={TABLE_HEAD_CLASS}>Attached to</TableHead>
                    <TableHead className={TABLE_HEAD_CLASS}>Uploaded</TableHead>
                    <TableHead className={cn(TABLE_HEAD_CLASS, "text-right")}>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filesLoading ? (
                    Array.from({ length: 8 }).map((_, i) => (
                      <TableRow key={i} className={ROW_HOVER_CLASS}>
                        <TableCell colSpan={7}>
                          <div className={SHIMMER_LINE} />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : filesError || !filesData || filesData.items.length === 0 ? (
                    <TableRow className={ROW_HOVER_CLASS}>
                      <TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                        {filesError
                          ? "Couldn't load files."
                          : filter === "orphan"
                            ? "No orphaned files — nice and tidy."
                            : "No files uploaded yet."}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filesData.items.map((f) => (
                      <TableRow key={f.id} className={ROW_HOVER_CLASS}>
                        <TableCell>
                          <a
                            href={f.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex max-w-[220px] items-center gap-1.5 text-sm font-medium text-foreground hover:text-primary"
                          >
                            <span className="truncate">{f.original_name}</span>
                            <ExternalLink className="h-3 w-3 shrink-0 text-muted-foreground" />
                          </a>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{f.content_type}</TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {formatBytes(f.size)}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {formatNumber(f.downloads_count)}
                        </TableCell>
                        <TableCell>
                          {f.is_orphan || !f.announcement_id ? (
                            <Badge
                              variant="outline"
                              className="border-amber-500/40 text-amber-600 dark:text-amber-400"
                            >
                              Orphan
                            </Badge>
                          ) : (
                            <span className="font-mono text-xs text-muted-foreground">#{f.announcement_id}</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{formatDate(f.created_at)}</TableCell>
                        <TableCell className="text-right">
                          <DeleteFileButton file={f} onDone={handleFilesChanged} />
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </Panel>

          {filesData && filesData.pages > 1 ? (
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span className="font-mono text-xs">
                Page {filesData.page} of {filesData.pages}
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= filesData.pages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      </Reveal>
    </div>
  );
}
