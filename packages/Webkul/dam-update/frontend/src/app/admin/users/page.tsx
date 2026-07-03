"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Ban,
  CheckCircle2,
  Clock,
  Copy,
  Eye,
  KeyRound,
  Loader2,
  Megaphone,
  MessageSquare,
  MoreVertical,
  Search,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  UserCog,
  UserMinus,
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FOCUS_RING, Panel, PanelHeader, ROW_HOVER_CLASS, TABLE_HEAD_CLASS } from "@/components/admin/panel";
import { Reveal } from "@/components/motion";
import { UserAvatar } from "@/components/user-avatar";
import { useDebouncedValue } from "@/hooks/use-debounce";
import { adminApi, ApiError } from "@/lib/api";
import { cn, formatDate, timeAgo } from "@/lib/utils";
import type { User } from "@/lib/types";

const SHIMMER_LINE =
  "h-8 w-full rounded-md bg-gradient-to-r from-secondary via-secondary/50 to-secondary bg-[length:200%_100%] animate-shimmer";

type SimpleAction = "ban" | "unban" | "suspend" | "unsuspend" | "delete";
type UserActionType = SimpleAction | "promote-moderator" | "promote-admin" | "demote-user";

const ACTION_SUCCESS: Record<UserActionType, string> = {
  ban: "User banned",
  unban: "User unbanned",
  suspend: "User suspended",
  unsuspend: "User unsuspended",
  delete: "User deleted",
  "promote-moderator": "Promoted to moderator",
  "promote-admin": "Promoted to admin",
  "demote-user": "Demoted to user",
};

function runUserAction(id: number, type: UserActionType) {
  switch (type) {
    case "ban":
      return adminApi.banUser(id);
    case "unban":
      return adminApi.unbanUser(id);
    case "suspend":
      return adminApi.suspendUser(id);
    case "unsuspend":
      return adminApi.unsuspendUser(id);
    case "delete":
      return adminApi.deleteUser(id);
    case "promote-moderator":
      return adminApi.promoteUser(id, "moderator");
    case "promote-admin":
      return adminApi.promoteUser(id, "admin");
    case "demote-user":
      return adminApi.promoteUser(id, "user");
  }
}

function confirmCopy(action: SimpleAction, user: User) {
  switch (action) {
    case "ban":
      return {
        title: `Ban @${user.username}?`,
        description: "They will be immediately signed out and unable to log back in.",
        confirmLabel: "Ban",
        variant: "destructive" as const,
      };
    case "unban":
      return {
        title: `Unban @${user.username}?`,
        description: "They will regain access to their account.",
        confirmLabel: "Unban",
        variant: "default" as const,
      };
    case "suspend":
      return {
        title: `Suspend @${user.username}?`,
        description: "Their account will be temporarily restricted until unsuspended.",
        confirmLabel: "Suspend",
        variant: "destructive" as const,
      };
    case "unsuspend":
      return {
        title: `Unsuspend @${user.username}?`,
        description: "Their account restrictions will be lifted.",
        confirmLabel: "Unsuspend",
        variant: "default" as const,
      };
    case "delete":
      return {
        title: `Delete @${user.username}?`,
        description: "This permanently removes the account. This cannot be undone.",
        confirmLabel: "Delete",
        variant: "destructive" as const,
      };
  }
}

function RoleBadge({ role }: { role: User["role"] }) {
  if (role === "admin") {
    return (
      <Badge variant="gradient" className="capitalize">
        Admin
      </Badge>
    );
  }
  if (role === "moderator") {
    return (
      <Badge variant="outline" className="border-sky-500/40 capitalize text-sky-600 dark:text-sky-400">
        Moderator
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="capitalize">
      User
    </Badge>
  );
}

function StatusBadge({ user }: { user: User }) {
  if (user.is_banned) return <Badge variant="destructive">Banned</Badge>;
  if (user.is_suspended) {
    return (
      <Badge variant="outline" className="border-amber-500/40 text-amber-600 dark:text-amber-400">
        Suspended
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="border-emerald-500/40 text-emerald-500 dark:text-emerald-400">
      Active
    </Badge>
  );
}

/** Lazy-loaded login history + activity timeline for a single user. */
function UserDetailsDialog({
  user,
  open,
  onOpenChange,
}: {
  user: User;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data: history, isLoading: historyLoading } = useQuery({
    queryKey: ["admin", "users", user.id, "login-history"],
    queryFn: () => adminApi.userLoginHistory(user.id),
    enabled: open,
  });
  const { data: activity, isLoading: activityLoading } = useQuery({
    queryKey: ["admin", "users", user.id, "activity"],
    queryFn: () => adminApi.userActivity(user.id),
    enabled: open,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <UserAvatar user={user} className="h-10 w-10" />
            <div className="min-w-0 text-left">
              <DialogTitle className="truncate">{user.full_name || user.username}</DialogTitle>
              <DialogDescription>@{user.username}</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Tabs defaultValue="logins">
          <TabsList>
            <TabsTrigger value="logins">Login history</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
          </TabsList>

          <TabsContent value="logins">
            {historyLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className={SHIMMER_LINE} />
                ))}
              </div>
            ) : !history || history.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No login history recorded.</p>
            ) : (
              <ul className="max-h-72 space-y-3 overflow-y-auto pr-1">
                {history.map((entry) => (
                  <li key={entry.id} className="flex items-start gap-3 border-l-2 border-border pl-3">
                    <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                    <div className="min-w-0">
                      <p className="font-mono text-xs text-foreground">{entry.ip}</p>
                      <p className="truncate text-xs text-muted-foreground">{entry.user_agent}</p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">{timeAgo(entry.created_at)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </TabsContent>

          <TabsContent value="activity">
            {activityLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className={SHIMMER_LINE} />
                ))}
              </div>
            ) : !activity || (activity.announcements.length === 0 && activity.comments.length === 0) ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No activity yet.</p>
            ) : (
              <div className="max-h-72 space-y-4 overflow-y-auto pr-1">
                {activity.announcements.length > 0 ? (
                  <div>
                    <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                      Announcements
                    </p>
                    <ul className="space-y-2.5">
                      {activity.announcements.map((a) => (
                        <li key={a.id} className="flex items-start gap-3 border-l-2 border-border pl-3">
                          <Megaphone className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                          <div className="min-w-0">
                            <p className="truncate text-xs font-medium text-foreground">{a.title}</p>
                            <p className="mt-0.5 text-[11px] text-muted-foreground">
                              <span className="capitalize">{a.status}</span> · {timeAgo(a.created_at)}
                            </p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {activity.comments.length > 0 ? (
                  <div>
                    <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                      Comments
                    </p>
                    <ul className="space-y-2.5">
                      {activity.comments.map((c) => (
                        <li key={c.id} className="flex items-start gap-3 border-l-2 border-border pl-3">
                          <MessageSquare className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                          <div className="min-w-0">
                            <p className="line-clamp-2 text-xs text-foreground">{c.content}</p>
                            <p className="mt-0.5 text-[11px] text-muted-foreground">{timeAgo(c.created_at)}</p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function RowActionsMenu({ user }: { user: User }) {
  const queryClient = useQueryClient();
  const [confirmAction, setConfirmAction] = useState<SimpleAction | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [resetResult, setResetResult] = useState<{ username: string; temporary_password: string } | null>(null);

  const isAdmin = user.role === "admin";

  const actionMutation = useMutation<User | void, unknown, UserActionType>({
    mutationFn: (type: UserActionType) => runUserAction(user.id, type),
    onSuccess: (_data, type) => {
      toast.success(ACTION_SUCCESS[type]);
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      setConfirmAction(null);
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.detail : "Something went wrong");
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: () => adminApi.resetUserPassword(user.id),
    onSuccess: (data) => {
      setResetResult(data);
      toast.success("Temporary password generated");
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.detail : "Something went wrong");
    },
  });

  const copy = confirmAction ? confirmCopy(confirmAction, user) : null;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button type="button" variant="ghost" size="icon" className="h-8 w-8">
            <MoreVertical className="h-4 w-4" />
            <span className="sr-only">Actions</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuItem onSelect={() => setDetailsOpen(true)}>
            <Eye className="h-3.5 w-3.5" />
            View details
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() => resetPasswordMutation.mutate()}
            disabled={resetPasswordMutation.isPending}
          >
            <KeyRound className="h-3.5 w-3.5" />
            Reset password
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          {user.role === "user" ? (
            <DropdownMenuItem onSelect={() => actionMutation.mutate("promote-moderator")}>
              <UserCog className="h-3.5 w-3.5" />
              Promote to moderator
            </DropdownMenuItem>
          ) : null}
          {user.role !== "admin" ? (
            <DropdownMenuItem onSelect={() => actionMutation.mutate("promote-admin")}>
              <UserCog className="h-3.5 w-3.5" />
              Make admin
            </DropdownMenuItem>
          ) : null}
          {user.role !== "user" ? (
            <DropdownMenuItem onSelect={() => actionMutation.mutate("demote-user")}>
              <UserMinus className="h-3.5 w-3.5" />
              Demote to user
            </DropdownMenuItem>
          ) : null}

          {!isAdmin ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => setConfirmAction(user.is_banned ? "unban" : "ban")}>
                {user.is_banned ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Ban className="h-3.5 w-3.5" />}
                {user.is_banned ? "Unban" : "Ban"}
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setConfirmAction(user.is_suspended ? "unsuspend" : "suspend")}>
                {user.is_suspended ? (
                  <ShieldCheck className="h-3.5 w-3.5" />
                ) : (
                  <ShieldAlert className="h-3.5 w-3.5" />
                )}
                {user.is_suspended ? "Unsuspend" : "Suspend"}
              </DropdownMenuItem>

              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onSelect={() => setConfirmAction("delete")}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete user
              </DropdownMenuItem>
            </>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>

      <UserDetailsDialog user={user} open={detailsOpen} onOpenChange={setDetailsOpen} />

      <Dialog open={Boolean(resetResult)} onOpenChange={(o) => !o && setResetResult(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Temporary password</DialogTitle>
            <DialogDescription>
              Shown once for @{resetResult?.username} — copy it now, it won&apos;t be shown again.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-2">
            <Input
              readOnly
              value={resetResult?.temporary_password ?? ""}
              className={cn("font-mono text-sm", FOCUS_RING)}
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => {
                if (!resetResult) return;
                navigator.clipboard.writeText(resetResult.temporary_password);
                toast.success("Copied to clipboard");
              }}
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setResetResult(null)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmAction !== null} onOpenChange={(o) => !o && setConfirmAction(null)}>
        <DialogContent>
          {copy ? (
            <>
              <DialogHeader>
                <DialogTitle>{copy.title}</DialogTitle>
                <DialogDescription>{copy.description}</DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setConfirmAction(null)}
                  disabled={actionMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant={copy.variant}
                  onClick={() => confirmAction && actionMutation.mutate(confirmAction)}
                  disabled={actionMutation.isPending}
                >
                  {actionMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {copy.confirmLabel}
                </Button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function AdminUsersPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebouncedValue(search, 400);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["admin", "users", page, debouncedSearch],
    queryFn: () => adminApi.users({ page, size: 20, q: debouncedSearch || undefined }),
  });

  return (
    <Reveal>
      <div className="space-y-4">
        <Panel>
          <PanelHeader
            eyebrow={`${data?.total ?? 0} total`}
            title="Users"
            action={
              <div className="relative w-full max-w-xs">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Search users…"
                  className={cn("pl-9", FOCUS_RING)}
                />
              </div>
            }
          />

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className={TABLE_HEAD_CLASS}>User</TableHead>
                  <TableHead className={TABLE_HEAD_CLASS}>Role</TableHead>
                  <TableHead className={TABLE_HEAD_CLASS}>Status</TableHead>
                  <TableHead className={TABLE_HEAD_CLASS}>Last login</TableHead>
                  <TableHead className={TABLE_HEAD_CLASS}>Joined</TableHead>
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
                      {isError ? "Couldn't load users." : "No users found."}
                    </TableCell>
                  </TableRow>
                ) : (
                  data.items.map((u) => (
                    <TableRow key={u.id} className={ROW_HOVER_CLASS}>
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <UserAvatar user={u} className="h-8 w-8" />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-foreground">{u.username}</p>
                            <p className="truncate text-xs text-muted-foreground">{u.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <RoleBadge role={u.role} />
                      </TableCell>
                      <TableCell>
                        <StatusBadge user={u} />
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {u.last_login_at ? timeAgo(u.last_login_at) : "Never"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{formatDate(u.created_at)}</TableCell>
                      <TableCell className="text-right">
                        <RowActionsMenu user={u} />
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
