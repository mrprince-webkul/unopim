"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Archive,
  ArchiveRestore,
  CalendarClock,
  FileText,
  Loader2,
  MoreHorizontal,
  Pin,
  PinOff,
  RotateCcw,
  Search,
  Sparkles,
  Trash2,
} from "lucide-react";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { FOCUS_RING, Panel, PanelHeader, ROW_HOVER_CLASS, TABLE_HEAD_CLASS } from "@/components/admin/panel";
import { EmptyState } from "@/components/empty-state";
import { Reveal } from "@/components/motion";
import { useDebouncedValue } from "@/hooks/use-debounce";
import { adminApi, ApiError } from "@/lib/api";
import { cn, formatDate, formatNumber } from "@/lib/utils";
import type { Announcement, AnnouncementStatus } from "@/lib/types";

type ContentTab = "all" | "published" | "draft" | "scheduled" | "archived" | "trash";

const TABS: { value: ContentTab; label: string }[] = [
  { value: "all", label: "All" },
  { value: "published", label: "Published" },
  { value: "draft", label: "Draft" },
  { value: "scheduled", label: "Scheduled" },
  { value: "archived", label: "Archived" },
  { value: "trash", label: "Trash" },
];

const STATUS_BADGE: Record<AnnouncementStatus, { label: string; className: string }> = {
  draft: { label: "Draft", className: "" },
  published: { label: "Published", className: "border-emerald-500/40 text-emerald-500 dark:text-emerald-400" },
  scheduled: { label: "Scheduled", className: "border-sky-500/40 text-sky-500 dark:text-sky-400" },
  archived: { label: "Archived", className: "border-amber-500/40 text-amber-500 dark:text-amber-400" },
};

const SHIMMER_LINE = "h-8 w-full rounded-md bg-gradient-to-r from-secondary via-secondary/50 to-secondary bg-[length:200%_100%] animate-shimmer";

function ScheduleDialog({
  open,
  onOpenChange,
  announcement,
  onDone,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  announcement: Announcement;
  onDone: () => void;
}) {
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) setValue("");
  }, [open]);

  async function handleConfirm() {
    if (!value) {
      toast.error("Pick a date and time");
      return;
    }
    setBusy(true);
    try {
      await adminApi.scheduleAnnouncement(announcement.id, new Date(value).toISOString());
      toast.success("Announcement scheduled");
      onOpenChange(false);
      onDone();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.detail : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Schedule &ldquo;{announcement.title}&rdquo;</DialogTitle>
          <DialogDescription>Pick a publish date and time — it will go live automatically.</DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label htmlFor="schedule-at">Publish at</Label>
          <Input
            id="schedule-at"
            type="datetime-local"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className={FOCUS_RING}
          />
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          <Button type="button" variant="gradient" onClick={handleConfirm} disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Schedule
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TrashRowActions({ announcement, onDone }: { announcement: Announcement; onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  const [purgeOpen, setPurgeOpen] = useState(false);

  async function handleRestore() {
    setBusy(true);
    try {
      await adminApi.restoreAnnouncement(announcement.id);
      toast.success("Announcement restored");
      onDone();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.detail : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  async function handlePurge() {
    setBusy(true);
    try {
      await adminApi.purgeAnnouncement(announcement.id);
      toast.success("Announcement permanently deleted");
      setPurgeOpen(false);
      onDone();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.detail : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="flex items-center justify-end gap-1.5">
        <Button type="button" size="sm" variant="ghost" disabled={busy} onClick={handleRestore}>
          <RotateCcw className="h-3.5 w-3.5" />
          Restore
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
          disabled={busy}
          onClick={() => setPurgeOpen(true)}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
      <Dialog open={purgeOpen} onOpenChange={setPurgeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Permanently delete &ldquo;{announcement.title}&rdquo;?</DialogTitle>
            <DialogDescription>This cannot be undone — the announcement will be erased for good.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setPurgeOpen(false)} disabled={busy}>
              Cancel
            </Button>
            <Button type="button" variant="destructive" onClick={handlePurge} disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Delete forever
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function AnnouncementRowActions({ announcement, onDone }: { announcement: Announcement; onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);

  async function run(action: () => Promise<unknown>, successMessage: string) {
    setBusy(true);
    try {
      await action();
      toast.success(successMessage);
      onDone();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.detail : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button type="button" size="sm" variant="ghost" disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <MoreHorizontal className="h-4 w-4" />}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onClick={() =>
              run(
                () => (announcement.is_pinned ? adminApi.unpin(announcement.id) : adminApi.pin(announcement.id)),
                announcement.is_pinned ? "Unpinned" : "Pinned to top",
              )
            }
          >
            {announcement.is_pinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
            {announcement.is_pinned ? "Unpin" : "Pin"}
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() =>
              run(
                () =>
                  announcement.is_featured ? adminApi.unfeature(announcement.id) : adminApi.feature(announcement.id),
                announcement.is_featured ? "Unfeatured" : "Featured",
              )
            }
          >
            <Sparkles className="h-3.5 w-3.5" />
            {announcement.is_featured ? "Unfeature" : "Feature"}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setScheduleOpen(true)}>
            <CalendarClock className="h-3.5 w-3.5" />
            Schedule…
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() =>
              run(
                () =>
                  announcement.status === "archived"
                    ? adminApi.unarchiveAnnouncement(announcement.id)
                    : adminApi.archiveAnnouncement(announcement.id),
                announcement.status === "archived" ? "Unarchived" : "Archived",
              )
            }
          >
            {announcement.status === "archived" ? (
              <ArchiveRestore className="h-3.5 w-3.5" />
            ) : (
              <Archive className="h-3.5 w-3.5" />
            )}
            {announcement.status === "archived" ? "Unarchive" : "Archive"}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-destructive focus:bg-destructive/10 focus:text-destructive"
            onClick={() => run(() => adminApi.deleteAnnouncement(announcement.id), "Moved to trash")}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Move to trash
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ScheduleDialog open={scheduleOpen} onOpenChange={setScheduleOpen} announcement={announcement} onDone={onDone} />
    </>
  );
}

function FlagIcons({ announcement }: { announcement: Announcement }) {
  if (!announcement.is_pinned && !announcement.is_featured) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }
  return (
    <div className="flex items-center gap-1.5">
      {announcement.is_pinned ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="flex h-6 w-6 items-center justify-center rounded-md border border-border bg-secondary/60 text-muted-foreground">
              <Pin className="h-3.5 w-3.5" />
            </span>
          </TooltipTrigger>
          <TooltipContent>Pinned</TooltipContent>
        </Tooltip>
      ) : null}
      {announcement.is_featured ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="flex h-6 w-6 items-center justify-center rounded-md border border-cyan-500/30 bg-gradient-to-r from-cyan-500/15 via-sky-500/15 to-emerald-500/15 text-cyan-600 dark:text-cyan-300">
              <Sparkles className="h-3.5 w-3.5" />
            </span>
          </TooltipTrigger>
          <TooltipContent>Featured</TooltipContent>
        </Tooltip>
      ) : null}
    </div>
  );
}

export default function AdminContentPage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<ContentTab>("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebouncedValue(search, 400);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["admin", "content", tab, page, debouncedSearch],
    queryFn: () =>
      adminApi.adminAnnouncements(
        tab === "trash"
          ? { trashed: true, page, size: 20, q: debouncedSearch || undefined }
          : { status_filter: tab === "all" ? undefined : tab, page, size: 20, q: debouncedSearch || undefined },
      ),
  });

  function handleChanged() {
    queryClient.invalidateQueries({ queryKey: ["admin", "content"] });
  }

  function handleTabChange(value: string) {
    setTab(value as ContentTab);
    setPage(1);
  }

  return (
    <Reveal>
      <div className="space-y-4">
        <Panel>
          <PanelHeader
            eyebrow={`${data?.total ?? 0} total`}
            title="Content"
            description="Pin, feature, schedule, archive, or trash announcements."
            action={
              <div className="relative w-full max-w-xs">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Search announcements…"
                  className={cn("pl-9", FOCUS_RING)}
                />
              </div>
            }
          />

          <div className="border-b border-border px-5 py-3">
            <div className="max-w-full overflow-x-auto">
              <Tabs value={tab} onValueChange={handleTabChange}>
                <TabsList>
                  {TABS.map((t) => (
                    <TabsTrigger key={t.value} value={t.value}>
                      {t.label}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className={TABLE_HEAD_CLASS}>Title</TableHead>
                  <TableHead className={TABLE_HEAD_CLASS}>Author</TableHead>
                  <TableHead className={TABLE_HEAD_CLASS}>Category</TableHead>
                  <TableHead className={TABLE_HEAD_CLASS}>Status</TableHead>
                  <TableHead className={TABLE_HEAD_CLASS}>Flags</TableHead>
                  <TableHead className={TABLE_HEAD_CLASS}>Views</TableHead>
                  <TableHead className={TABLE_HEAD_CLASS}>Created</TableHead>
                  <TableHead className={cn(TABLE_HEAD_CLASS, "text-right")}>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <TableRow key={i} className={ROW_HOVER_CLASS}>
                      <TableCell colSpan={8}>
                        <div className={SHIMMER_LINE} />
                      </TableCell>
                    </TableRow>
                  ))
                ) : isError || !data || data.items.length === 0 ? (
                  <TableRow className={cn(ROW_HOVER_CLASS, "hover:bg-transparent")}>
                    <TableCell colSpan={8} className="p-0">
                      <EmptyState
                        icon={tab === "trash" ? Trash2 : FileText}
                        title={
                          isError
                            ? "Couldn't load announcements."
                            : tab === "trash"
                              ? "Trash is empty"
                              : "No announcements found"
                        }
                        description={
                          isError
                            ? undefined
                            : debouncedSearch
                              ? "Try a different search term."
                              : "Nothing here yet."
                        }
                      />
                    </TableCell>
                  </TableRow>
                ) : (
                  data.items.map((a) => (
                    <TableRow key={a.id} className={ROW_HOVER_CLASS}>
                      <TableCell className="max-w-xs">
                        <Link
                          href={`/announcements/${a.slug}`}
                          target="_blank"
                          className="line-clamp-1 text-sm font-medium text-foreground hover:text-primary"
                        >
                          {a.title}
                        </Link>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{a.author.username}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{a.category?.name ?? "—"}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={STATUS_BADGE[a.status].className}>
                          {STATUS_BADGE[a.status].label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <FlagIcons announcement={a} />
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{formatNumber(a.views_count)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{formatDate(a.created_at)}</TableCell>
                      <TableCell className="text-right">
                        {tab === "trash" ? (
                          <TrashRowActions announcement={a} onDone={handleChanged} />
                        ) : (
                          <AnnouncementRowActions announcement={a} onDone={handleChanged} />
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </Panel>

        {data && data.pages > 1 ? (
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span className="font-mono text-xs">
              Page {data.page} of {data.pages}
            </span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= data.pages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </Reveal>
  );
}
