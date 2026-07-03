"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Panel, PanelHeader, ROW_HOVER_CLASS, TABLE_HEAD_CLASS } from "@/components/admin/panel";
import { Reveal } from "@/components/motion";
import { adminApi } from "@/lib/api";
import { formatDate } from "@/lib/utils";

const SHIMMER_LINE = "h-8 w-full rounded-md bg-gradient-to-r from-secondary via-secondary/50 to-secondary bg-[length:200%_100%] animate-shimmer";

export default function AdminLogsPage() {
  const [page, setPage] = useState(1);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["admin", "logs", page],
    queryFn: () => adminApi.logs({ page, size: 25 }),
  });

  return (
    <Reveal>
      <div className="space-y-4">
        <Panel>
          <PanelHeader eyebrow="Audit trail" title="Activity logs" />

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className={TABLE_HEAD_CLASS}>User</TableHead>
                  <TableHead className={TABLE_HEAD_CLASS}>Action</TableHead>
                  <TableHead className={TABLE_HEAD_CLASS}>Detail</TableHead>
                  <TableHead className={TABLE_HEAD_CLASS}>Timestamp</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <TableRow key={i} className={ROW_HOVER_CLASS}>
                      <TableCell colSpan={4}>
                        <div className={SHIMMER_LINE} />
                      </TableCell>
                    </TableRow>
                  ))
                ) : isError || !data || data.items.length === 0 ? (
                  <TableRow className={ROW_HOVER_CLASS}>
                    <TableCell colSpan={4} className="py-10 text-center text-sm text-muted-foreground">
                      {isError ? "Couldn't load logs." : "No activity yet."}
                    </TableCell>
                  </TableRow>
                ) : (
                  data.items.map((log) => (
                    <TableRow key={log.id} className={ROW_HOVER_CLASS}>
                      <TableCell className="text-sm font-medium text-foreground">
                        {log.user ? log.user.username : "System"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {log.action.replace(/_/g, " ")}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-sm">
                        <p className="line-clamp-2 text-sm text-muted-foreground">{log.detail}</p>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {formatDate(log.created_at, "MMM d, yyyy HH:mm")}
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
