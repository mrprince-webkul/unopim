"use client";

import Link from "next/link";
import { Megaphone } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";

/** Compact sign-up prompt in the right rail — only for anonymous visitors. */
export function JoinCard() {
  const { user, loading } = useAuth();
  if (loading || user) return null;

  return (
    <div className="relative overflow-hidden rounded-xl border border-border bg-card p-4">
      <div className="bg-aurora pointer-events-none absolute inset-0 opacity-70" />
      <div className="relative">
        <div className="mb-2.5 flex h-8 w-8 items-center justify-center rounded-lg border border-primary/25 bg-primary/10 text-primary">
          <Megaphone className="h-4 w-4" />
        </div>
        <p className="font-display text-sm font-semibold text-foreground">New to DevAnnounce?</p>
        <p className="mt-1 text-[12.5px] leading-5 text-muted-foreground">
          Publish launches, follow builders, and get realtime notifications.
        </p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Button asChild size="sm" variant="gradient">
            <Link href="/register">Sign up</Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href="/login">Log in</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
