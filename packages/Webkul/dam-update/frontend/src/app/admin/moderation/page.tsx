"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, EyeOff, Loader2, Trash2 } from "lucide-react";
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Panel, PanelHeader, ROW_HOVER_CLASS, TABLE_HEAD_CLASS } from "@/components/admin/panel";
import { Reveal } from "@/components/motion";
import { adminApi, ApiError } from "@/lib/api";
import { cn, formatDate } from "@/lib/utils";
import type { Comment } from "@/lib/types";

type Filter = "all" | "hidden";

const SHIMMER_LINE = "h-8 w-full rounded-md bg-gradient-to-r from-secondary via-secondary/50 to-secondary bg-[length:200%_100%] animate-shimmer";

function CommentActions({ comment, onDone }: { comment: Comment; onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  async function toggleHidden() {
    setBusy(true);
    try {
      if (comment.is_hidden) await adminApi.showComment(comment.id);
      else await adminApi.hideComment(comment.id);
      onDone();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.detail : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    setBusy(true);
    try {
      await adminApi.deleteComment(comment.id);
      toast.success("Comment deleted");
      setDeleteOpen(false);
      onDone();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.detail : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center justify-end gap-1.5">
      <Button type="button" size="sm" variant="ghost" onClick={toggleHidden} disabled={busy}>
        {comment.is_hidden ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
        {comment.is_hidden ? "Show" : "Hide"}
      </Button>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
        onClick={() => setDeleteOpen(true)}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this comment?</DialogTitle>
            <DialogDescription>This action cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDeleteOpen(false)} disabled={busy}>
              Cancel
            </Button>
            <Button type="button" variant="destructive" onClick={handleDelete} disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function ModerationPage() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<Filter>("all");
  const [page, setPage] = useState(1);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["admin", "comments", filter, page],
    queryFn: () => adminApi.comments({ page, size: 20, hidden: filter === "hidden" ? true : undefined }),
  });

  function handleChanged() {
    queryClient.invalidateQueries({ queryKey: ["admin", "comments"] });
  }

  return (
    <Reveal>
      <div className="space-y-4">
        <Panel>
          <PanelHeader
            eyebrow="Comments"
            title="Moderation"
            action={
              <Tabs
                value={filter}
                onValueChange={(v) => {
                  setFilter(v as Filter);
                  setPage(1);
                }}
              >
                <TabsList>
                  <TabsTrigger value="all">All</TabsTrigger>
                  <TabsTrigger value="hidden">Hidden</TabsTrigger>
                </TabsList>
              </Tabs>
            }
          />

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className={TABLE_HEAD_CLASS}>Author</TableHead>
                  <TableHead className={TABLE_HEAD_CLASS}>Comment</TableHead>
                  <TableHead className={TABLE_HEAD_CLASS}>Announcement</TableHead>
                  <TableHead className={TABLE_HEAD_CLASS}>Date</TableHead>
                  <TableHead className={TABLE_HEAD_CLASS}>Status</TableHead>
                  <TableHead className={cn(TABLE_HEAD_CLASS, "text-right")}>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <TableRow key={i} className={ROW_HOVER_CLASS}>
                      <TableCell colSpan={6}>
                        <div className={SHIMMER_LINE} />
                      </TableCell>
                    </TableRow>
                  ))
                ) : isError || !data || data.items.length === 0 ? (
                  <TableRow className={ROW_HOVER_CLASS}>
                    <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                      {isError ? "Couldn't load comments." : "No comments found."}
                    </TableCell>
                  </TableRow>
                ) : (
                  data.items.map((c) => (
                    <TableRow key={c.id} className={ROW_HOVER_CLASS}>
                      <TableCell className="text-sm font-medium text-foreground">{c.author.username}</TableCell>
                      <TableCell className="max-w-xs">
                        <p className="line-clamp-2 text-sm text-muted-foreground">{c.content}</p>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">#{c.announcement_id}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{formatDate(c.created_at)}</TableCell>
                      <TableCell>
                        {c.is_hidden ? (
                          <Badge variant="destructive">Hidden</Badge>
                        ) : (
                          <Badge variant="outline" className="border-emerald-500/40 text-emerald-500 dark:text-emerald-400">
                            Visible
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <CommentActions comment={c} onDone={handleChanged} />
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
              <Button variant="outline" size="sm" disabled={page >= data.pages} onClick={() => setPage((p) => p + 1)}>
                Next
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </Reveal>
  );
}
