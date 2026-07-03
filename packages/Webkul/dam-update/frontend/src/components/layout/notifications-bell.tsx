"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { notificationsApi, notificationsWsUrl } from "@/lib/api";
import { cn, timeAgo } from "@/lib/utils";
import type { Notification } from "@/lib/types";

const QUERY_KEY = ["notifications", "bell"];

export function NotificationsBell() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const wsRef = useRef<WebSocket | null>(null);
  const retryRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => notificationsApi.list({ size: 8 }),
    refetchInterval: 60_000,
  });

  useEffect(() => {
    let cancelled = false;

    function connect() {
      const url = notificationsWsUrl();
      if (!url || cancelled) return;

      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        retryRef.current = 0;
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data) as { type: string; data: Notification };
          if (msg.type === "notification") {
            queryClient.invalidateQueries({ queryKey: QUERY_KEY });
            toast(msg.data.title, { description: msg.data.body });
          }
        } catch {
          // ignore malformed frames
        }
      };

      ws.onclose = () => {
        if (cancelled) return;
        const delay = Math.min(30_000, 1000 * 2 ** retryRef.current);
        retryRef.current += 1;
        timerRef.current = setTimeout(connect, delay);
      };

      ws.onerror = () => {
        ws.close();
      };
    }

    connect();

    return () => {
      cancelled = true;
      if (timerRef.current) clearTimeout(timerRef.current);
      wsRef.current?.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const notifications = data?.items ?? [];
  const unreadCount = data?.unread_count ?? 0;

  async function handleOpen(n: Notification) {
    if (!n.is_read) {
      try {
        await notificationsApi.markRead(n.id);
        queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      } catch {
        // best-effort
      }
    }
    if (n.link) router.push(n.link);
  }

  async function handleMarkAllRead() {
    try {
      await notificationsApi.markAllRead();
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    } catch {
      toast.error("Could not mark notifications as read");
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="ghost" size="icon" aria-label="Notifications" className="relative">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 ? (
            <span className="absolute right-1 top-1 flex h-2 w-2 rounded-full bg-primary ring-2 ring-background" />
          ) : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between px-2 py-1.5">
          <DropdownMenuLabel className="p-0 text-sm">Notifications</DropdownMenuLabel>
          {unreadCount > 0 ? (
            <button
              type="button"
              onClick={handleMarkAllRead}
              className="text-xs font-medium text-primary hover:opacity-80"
            >
              Mark all read
            </button>
          ) : null}
        </div>
        <DropdownMenuSeparator />
        {notifications.length === 0 ? (
          <p className="px-2 py-6 text-center text-sm text-muted-foreground">No notifications yet</p>
        ) : (
          <div className="max-h-80 overflow-y-auto">
            {notifications.map((n) => (
              <DropdownMenuItem
                key={n.id}
                onSelect={() => handleOpen(n)}
                className={cn("flex-col items-start gap-0.5 whitespace-normal py-2", !n.is_read && "bg-accent/50")}
              >
                <div className="flex w-full items-start gap-2">
                  {!n.is_read ? (
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  ) : (
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{n.title}</p>
                    <p className="line-clamp-2 text-xs text-muted-foreground">{n.body}</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground/70">{timeAgo(n.created_at)}</p>
                  </div>
                </div>
              </DropdownMenuItem>
            ))}
          </div>
        )}
        <DropdownMenuSeparator />
        <Link
          href="/notifications"
          className="block px-2 py-1.5 text-center text-sm font-medium text-primary hover:opacity-80"
        >
          View all
        </Link>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
