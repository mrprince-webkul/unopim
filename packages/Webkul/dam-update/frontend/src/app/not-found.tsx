import Link from "next/link";
import { Compass } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="relative flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center overflow-hidden py-24">
      <div className="bg-grid-fine pointer-events-none absolute inset-0" />
      <div className="bg-aurora pointer-events-none absolute inset-0" />
      <div className="pointer-events-none absolute left-1/2 top-1/3 h-72 w-72 -translate-x-1/2 animate-float-slow rounded-full bg-primary/15 blur-[110px]" />

      <div className="container relative flex flex-col items-center gap-6 text-center">
        <div className="glow-sm flex h-14 w-14 items-center justify-center rounded-full border border-border bg-card text-primary">
          <Compass className="h-7 w-7" />
        </div>
        <div className="space-y-2">
          <p className="gradient-text font-display text-7xl font-extrabold tracking-tight sm:text-8xl">404</p>
          <h1 className="font-display text-xl font-semibold text-foreground">This page doesn&apos;t exist</h1>
          <p className="mx-auto max-w-sm text-sm text-muted-foreground">
            The page you&apos;re looking for may have been moved, renamed, or never existed.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button asChild variant="gradient">
            <Link href="/">Back to home</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/general">Browse announcements</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
