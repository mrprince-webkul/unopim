"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, Loader2, RefreshCw, Trash2 } from "lucide-react";
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
import { Panel, PanelHeader, ROW_HOVER_CLASS, TABLE_HEAD_CLASS } from "@/components/admin/panel";
import { Reveal } from "@/components/motion";
import { adminApi, ApiError } from "@/lib/api";
import { cn, formatDate } from "@/lib/utils";
import type { NewsArticle } from "@/lib/types";

const SHIMMER_LINE = "h-8 w-full rounded-md bg-gradient-to-r from-secondary via-secondary/50 to-secondary bg-[length:200%_100%] animate-shimmer";

function DeleteNewsButton({ article, onDone }: { article: NewsArticle; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function handleDelete() {
    setBusy(true);
    try {
      await adminApi.deleteNews(article.id);
      toast.success("Article deleted");
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
            <DialogTitle>Delete this article?</DialogTitle>
            <DialogDescription>&ldquo;{article.title}&rdquo; will be permanently removed.</DialogDescription>
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

export default function AdminNewsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [fetching, setFetching] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["admin", "news", page],
    queryFn: () => adminApi.news({ page, size: 20 }),
  });

  function handleChanged() {
    queryClient.invalidateQueries({ queryKey: ["admin", "news"] });
  }

  async function handleFetchNow() {
    setFetching(true);
    try {
      const res = await adminApi.fetchNews();
      toast.success(res.message || `Imported ${res.imported} articles`);
      handleChanged();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.detail : "Fetch failed");
    } finally {
      setFetching(false);
    }
  }

  return (
    <Reveal>
      <div className="space-y-4">
        <Panel>
          <PanelHeader
            eyebrow="Nightly pipeline"
            title="Dev news"
            description={
              <>
                Runs automatically at 00:00 UTC. AI summaries require an{" "}
                <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">ANTHROPIC_API_KEY</code> configured
                under{" "}
                <Link href="/admin/settings" className="font-medium text-primary hover:opacity-80">
                  Settings
                </Link>
                .
              </>
            }
            action={
              <Button type="button" variant="gradient" onClick={handleFetchNow} disabled={fetching}>
                {fetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                {fetching ? "Fetching… this can take a minute" : "Fetch news now"}
              </Button>
            }
          />

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className={TABLE_HEAD_CLASS}>Title</TableHead>
                  <TableHead className={TABLE_HEAD_CLASS}>Source</TableHead>
                  <TableHead className={TABLE_HEAD_CLASS}>Category</TableHead>
                  <TableHead className={TABLE_HEAD_CLASS}>Published</TableHead>
                  <TableHead className={cn(TABLE_HEAD_CLASS, "text-right")}>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <TableRow key={i} className={ROW_HOVER_CLASS}>
                      <TableCell colSpan={5}>
                        <div className={SHIMMER_LINE} />
                      </TableCell>
                    </TableRow>
                  ))
                ) : isError || !data || data.items.length === 0 ? (
                  <TableRow className={ROW_HOVER_CLASS}>
                    <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                      {isError ? "Couldn't load news." : "No articles yet — try fetching now."}
                    </TableCell>
                  </TableRow>
                ) : (
                  data.items.map((article) => (
                    <TableRow key={article.id} className={ROW_HOVER_CLASS}>
                      <TableCell className="max-w-sm">
                        <a
                          href={article.source_url}
                          target="_blank"
                          rel="noreferrer"
                          className="line-clamp-1 inline-flex items-center gap-1.5 text-sm font-medium text-foreground hover:text-primary"
                        >
                          {article.title}
                          <ExternalLink className="h-3 w-3 shrink-0 text-muted-foreground" />
                        </a>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{article.source_name}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {article.category}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{formatDate(article.published_at)}</TableCell>
                      <TableCell className="text-right">
                        <DeleteNewsButton article={article} onDone={handleChanged} />
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
