"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Search as SearchIcon, Users } from "lucide-react";
import { toast } from "sonner";

import { AnnouncementCard } from "@/components/announcements/announcement-card";
import { NewsCard } from "@/components/news/news-card";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserAvatar } from "@/components/user-avatar";
import { useDebouncedValue } from "@/hooks/use-debounce";
import { searchApi, usersApi, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatNumber } from "@/lib/utils";
import type { PublicProfile } from "@/lib/types";

type SearchType = "all" | "announcements" | "news" | "users";

function UserResultCard({ profile }: { profile: PublicProfile }) {
  const { user } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [following, setFollowing] = useState(profile.is_following);
  const [busy, setBusy] = useState(false);
  const isSelf = user?.username === profile.username;

  async function toggleFollow() {
    if (!user) {
      router.push("/login?next=/search");
      return;
    }
    setBusy(true);
    const prev = following;
    setFollowing(!prev);
    try {
      if (prev) await usersApi.unfollow(profile.username);
      else await usersApi.follow(profile.username);
      queryClient.invalidateQueries({ queryKey: ["profile", profile.username] });
    } catch (err) {
      setFollowing(prev);
      toast.error(err instanceof ApiError ? err.detail : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card-hover flex items-center gap-4 rounded-2xl border border-border bg-card p-4">
      <Link href={`/profile/${profile.username}`}>
        <UserAvatar user={profile} className="h-12 w-12" />
      </Link>
      <div className="min-w-0 flex-1">
        <Link
          href={`/profile/${profile.username}`}
          className="block truncate font-medium text-foreground hover:text-primary"
        >
          {profile.full_name || profile.username}
        </Link>
        <p className="truncate text-xs text-muted-foreground">@{profile.username}</p>
        {profile.bio ? <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">{profile.bio}</p> : null}
        <p className="mt-1 text-xs text-muted-foreground">{formatNumber(profile.followers_count)} followers</p>
      </div>
      {!isSelf ? (
        <Button
          type="button"
          size="sm"
          variant={following ? "outline" : "gradient"}
          onClick={toggleFollow}
          disabled={busy}
        >
          {following ? "Following" : "Follow"}
        </Button>
      ) : null}
    </div>
  );
}

function SearchPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQ = searchParams.get("q") ?? "";
  const type = ((searchParams.get("type") as SearchType | null) ?? "all") as SearchType;

  const [query, setQuery] = useState(initialQ);
  const debouncedQuery = useDebouncedValue(query, 400).trim();

  useEffect(() => {
    setQuery(initialQ);
  }, [initialQ]);

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    if (debouncedQuery) params.set("q", debouncedQuery);
    else params.delete("q");
    const qs = params.toString();
    router.replace(`/search${qs ? `?${qs}` : ""}`, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQuery]);

  function setType(next: SearchType) {
    const params = new URLSearchParams(searchParams.toString());
    if (next === "all") params.delete("type");
    else params.set("type", next);
    const qs = params.toString();
    router.push(`/search${qs ? `?${qs}` : ""}`);
  }

  const { data, isLoading, isError } = useQuery({
    queryKey: ["search", debouncedQuery, type],
    queryFn: () => searchApi.search({ q: debouncedQuery, type, size: 20 }),
    enabled: debouncedQuery.length > 0,
  });

  const announcements = data?.announcements.items ?? [];
  const news = data?.news.items ?? [];
  const users = data?.users.items ?? [];

  const announcementsCount = data?.announcements.total ?? 0;
  const newsCount = data?.news.total ?? 0;
  const usersCount = data?.users.total ?? 0;

  return (
    <div className="container py-10">
      <div className="mb-6">
        <p className="mb-2 font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
          Search
        </p>
        <h1 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Find anything on DevAnnounce
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">Search announcements, dev news, and people.</p>
      </div>

      <div className="group relative mb-6 max-w-xl">
        <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" />
        <Input
          type="search"
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search DevAnnounce…"
          className="pl-9 focus-visible:shadow-[0_0_0_3px_hsl(var(--glow)/0.12)]"
        />
      </div>

      {!debouncedQuery ? (
        <EmptyState
          icon={SearchIcon}
          title="Start typing to search"
          description="Search across announcements, dev news, and users."
        />
      ) : (
        <Tabs value={type} onValueChange={(v) => setType(v as SearchType)}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="announcements" className="gap-1.5">
              Announcements
              {data ? (
                <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
                  {announcementsCount}
                </span>
              ) : null}
            </TabsTrigger>
            <TabsTrigger value="news" className="gap-1.5">
              News
              {data ? (
                <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
                  {newsCount}
                </span>
              ) : null}
            </TabsTrigger>
            <TabsTrigger value="users" className="gap-1.5">
              Users
              {data ? (
                <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
                  {usersCount}
                </span>
              ) : null}
            </TabsTrigger>
          </TabsList>

          {isLoading ? (
            <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-48 w-full rounded-2xl" />
              ))}
            </div>
          ) : isError ? (
            <div className="mt-6">
              <EmptyState title="Search failed" description="Something went wrong. Try again." />
            </div>
          ) : (
            <>
              <TabsContent value="all" className="mt-6 space-y-8">
                {announcements.length === 0 && news.length === 0 && users.length === 0 ? (
                  <EmptyState title="No results" description={`Nothing matched "${debouncedQuery}"`} />
                ) : (
                  <>
                    {announcements.length > 0 ? (
                      <section>
                        <h2 className="mb-3 text-sm font-semibold text-foreground">Announcements</h2>
                        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                          {announcements.slice(0, 6).map((a) => (
                            <AnnouncementCard key={a.id} announcement={a} compact />
                          ))}
                        </div>
                      </section>
                    ) : null}
                    {news.length > 0 ? (
                      <section>
                        <h2 className="mb-3 text-sm font-semibold text-foreground">Dev news</h2>
                        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                          {news.slice(0, 6).map((n) => (
                            <NewsCard key={n.id} article={n} />
                          ))}
                        </div>
                      </section>
                    ) : null}
                    {users.length > 0 ? (
                      <section>
                        <h2 className="mb-3 text-sm font-semibold text-foreground">Users</h2>
                        <div className="grid gap-3 sm:grid-cols-2">
                          {users.slice(0, 6).map((u) => (
                            <UserResultCard key={u.id} profile={u} />
                          ))}
                        </div>
                      </section>
                    ) : null}
                  </>
                )}
              </TabsContent>

              <TabsContent value="announcements" className="mt-6">
                {announcements.length === 0 ? (
                  <EmptyState title="No announcements found" description={`Nothing matched "${debouncedQuery}"`} />
                ) : (
                  <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    {announcements.map((a) => (
                      <AnnouncementCard key={a.id} announcement={a} compact />
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="news" className="mt-6">
                {news.length === 0 ? (
                  <EmptyState title="No news found" description={`Nothing matched "${debouncedQuery}"`} />
                ) : (
                  <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    {news.map((n) => (
                      <NewsCard key={n.id} article={n} />
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="users" className="mt-6">
                {users.length === 0 ? (
                  <EmptyState icon={Users} title="No users found" description={`Nothing matched "${debouncedQuery}"`} />
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {users.map((u) => (
                      <UserResultCard key={u.id} profile={u} />
                    ))}
                  </div>
                )}
              </TabsContent>
            </>
          )}
        </Tabs>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={null}>
      <SearchPageContent />
    </Suspense>
  );
}
