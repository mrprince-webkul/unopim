"use client";

import { Suspense, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { authApi, ApiError } from "@/lib/api";

type Status = "loading" | "success" | "error";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<Status>("loading");
  const [message, setMessage] = useState<string>("Verifying your email…");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("This verification link is missing a token.");
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const res = await authApi.verifyEmail(token);
        if (cancelled) return;
        setStatus("success");
        setMessage(res.message || "Your email has been verified.");
      } catch (err) {
        if (cancelled) return;
        setStatus("error");
        setMessage(err instanceof ApiError ? err.detail : "This verification link is invalid or expired.");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <div className="relative flex min-h-[calc(100vh-4rem)] items-center justify-center overflow-hidden py-16">
      <div className="bg-grid-fine pointer-events-none absolute inset-0" />
      <div className="bg-aurora pointer-events-none absolute inset-0" />
      <div className="container relative flex justify-center">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex flex-col items-center gap-3 text-center">
            <Link href="/" className="group flex items-center gap-2">
              <span className="relative">
                <Image src="/logo.svg" alt="DevAnnounce" width={36} height={36} />
                <span className="absolute inset-0 -z-10 rounded-lg bg-primary/40 opacity-0 blur-lg transition-opacity duration-300 group-hover:opacity-100" />
              </span>
            </Link>
            <h1 className="font-display text-xl font-semibold tracking-tight text-foreground">Email verification</h1>
          </div>

          <Card className="relative overflow-hidden rounded-3xl border-border/70 bg-card/80 backdrop-blur-xl">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent" />
            <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
              {status === "loading" ? (
                <>
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">{message}</p>
                </>
              ) : status === "success" ? (
                <>
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <CheckCircle2 className="h-6 w-6" />
                  </div>
                  <p className="text-sm text-foreground">{message}</p>
                  <Button asChild variant="gradient">
                    <Link href="/login">Continue to log in</Link>
                  </Button>
                </>
              ) : (
                <>
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                    <XCircle className="h-6 w-6" />
                  </div>
                  <p className="text-sm text-foreground">{message}</p>
                  <Button asChild variant="outline">
                    <Link href="/">Back to home</Link>
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={null}>
      <VerifyEmailContent />
    </Suspense>
  );
}
