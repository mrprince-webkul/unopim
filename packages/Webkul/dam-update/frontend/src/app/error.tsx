"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="relative flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center overflow-hidden py-24">
      <div className="bg-grid-fine pointer-events-none absolute inset-0" />
      <div className="bg-aurora pointer-events-none absolute inset-0" />
      <div className="pointer-events-none absolute left-1/2 top-1/3 h-72 w-72 -translate-x-1/2 animate-float-slow rounded-full bg-destructive/10 blur-[110px]" />

      <div className="container relative flex flex-col items-center gap-6 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full border border-destructive/20 bg-destructive/10 text-destructive">
          <AlertTriangle className="h-7 w-7" />
        </div>
        <div className="space-y-2">
          <h1 className="font-display text-xl font-semibold text-foreground">Something went wrong</h1>
          <p className="mx-auto max-w-sm text-sm text-muted-foreground">
            An unexpected error occurred while rendering this page. You can try again or head back home.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="gradient" onClick={() => reset()}>
            Try again
          </Button>
          <Button asChild variant="outline">
            <Link href="/">Back to home</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
