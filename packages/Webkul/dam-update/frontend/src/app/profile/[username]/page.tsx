"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, Github, Globe, Linkedin } from "lucide-react";
import { toast } from "sonner";

import { UserPostsFeed } from "@/components/feed/user-posts-feed";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserAvatar } from "@/components/user-avatar";
import { usersApi, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatDate, formatNumber } from "@/lib/utils";

export default function ProfilePage() {
  const params = useParams<{ username: string }>();
  const username = params.username;
  const { user } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();

  const {
    data: profile,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["profile", username],
    queryFn: () => usersApi.profile(username),
  });

  const [followingOverride, setFollowingOverride] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);

  const isFollowing = followingOverride ?? profile?.is_following ?? false;
  const isSelf = user?.username === username;

  async function toggleFollow() {
    if (!user) {
      router.push(`/login?next=/profile/${username}`);
      return;
    }
    setBusy(true);
    const prev = isFollowing;
    setFollowingOverride(!prev);
    try {
      if (prev) await usersApi.unfollow(username);
      else await usersApi.follow(username);
      queryClient.invalidateQueries({ queryKey: ["profile", username] });
    } catch (err) {
      setFollowingOverride(prev);
      toast.error(err instanceof ApiError ? err.detail : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  if (isLoading) {
    return (
      <div className="container py-10">
        <div className="overflow-hidden rounded-3xl border border-border bg-card">
          <Skeleton className="h-28 w-full rounded-none sm:h-32" />
          <div className="px-6 pb-6 sm:px-8">
            <div className="-mt-12 flex items-end gap-4 sm:-mt-14">
              <Skeleton className="h-24 w-24 shrink-0 rounded-full ring-4 ring-background" />
              <div className="space-y-2 pb-1">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-32" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isError || !profile) {
    return (
      <div className="container py-10">
        <EmptyState title="User not found" description="This profile doesn't exist or may have been removed." />
      </div>
    );
  }

  return (
    <div className="container py-10">
      <div className="relative mb-8 overflow-hidden rounded-3xl border border-border bg-card">
        <div className="bg-aurora relative h-28 w-full sm:h-32">
          <div className="bg-grid-fine pointer-events-none absolute inset-0 opacity-70" />
        </div>

        <div className="px-6 pb-6 sm:px-8">
          <div className="-mt-12 flex flex-col gap-4 sm:-mt-14 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
              <UserAvatar user={profile} className="h-24 w-24 shrink-0 text-2xl ring-4 ring-background" />
              <div className="pb-1">
                <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
                  {profile.full_name || profile.username}
                </h1>
                <p className="text-sm text-muted-foreground">@{profile.username}</p>
              </div>
            </div>

            <div className="pb-1">
              {isSelf ? (
                <Button asChild variant="outline">
                  <Link href="/dashboard/settings">Edit profile</Link>
                </Button>
              ) : (
                <Button
                  type="button"
                  variant={isFollowing ? "outline" : "gradient"}
                  onClick={toggleFollow}
                  disabled={busy}
                >
                  {isFollowing ? "Following" : "Follow"}
                </Button>
              )}
            </div>
          </div>

          {profile.bio ? <p className="mt-4 max-w-lg text-sm leading-6 text-foreground/90">{profile.bio}</p> : null}

          <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <CalendarDays className="h-3.5 w-3.5" /> Joined {formatDate(profile.created_at)}
            </span>
            {profile.github_url ? (
              <a
                href={profile.github_url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 hover:text-foreground"
              >
                <Github className="h-3.5 w-3.5" /> GitHub
              </a>
            ) : null}
            {profile.linkedin_url ? (
              <a
                href={profile.linkedin_url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 hover:text-foreground"
              >
                <Linkedin className="h-3.5 w-3.5" /> LinkedIn
              </a>
            ) : null}
            {profile.website_url ? (
              <a
                href={profile.website_url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 hover:text-foreground"
              >
                <Globe className="h-3.5 w-3.5" /> Website
              </a>
            ) : null}
          </div>

          <div className="mt-5 flex items-center gap-6 border-t border-border/60 pt-4">
            <span>
              <span className="font-display text-lg font-bold text-foreground">
                {formatNumber(profile.followers_count)}
              </span>{" "}
              <span className="text-sm text-muted-foreground">followers</span>
            </span>
            <span>
              <span className="font-display text-lg font-bold text-foreground">
                {formatNumber(profile.following_count)}
              </span>{" "}
              <span className="text-sm text-muted-foreground">following</span>
            </span>
            <span>
              <span className="font-display text-lg font-bold text-foreground">
                {formatNumber(profile.posts_count)}
              </span>{" "}
              <span className="text-sm text-muted-foreground">posts</span>
            </span>
          </div>
        </div>
      </div>

      <Tabs defaultValue="posts">
        <TabsList>
          <TabsTrigger value="posts">Posts</TabsTrigger>
          {isSelf ? <TabsTrigger value="drafts">Drafts</TabsTrigger> : null}
        </TabsList>

        <TabsContent value="posts" className="mt-6">
          <UserPostsFeed
            username={username}
            status="published"
            gridClassName="sm:grid-cols-2 xl:grid-cols-3"
            emptyTitle="No posts yet"
            emptyDescription={`@${profile.username} hasn't published anything yet.`}
          />
        </TabsContent>

        {isSelf ? (
          <TabsContent value="drafts" className="mt-6">
            <UserPostsFeed
              username={username}
              status="draft"
              gridClassName="sm:grid-cols-2 xl:grid-cols-3"
              emptyTitle="No drafts"
              emptyDescription="Draft announcements you haven't published yet will show up here."
            />
          </TabsContent>
        ) : null}
      </Tabs>
    </div>
  );
}
