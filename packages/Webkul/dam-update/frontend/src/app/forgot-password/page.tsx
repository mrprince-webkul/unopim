"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2, MailCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth";
import { authApi } from "@/lib/api";

const forgotSchema = z.object({
  email: z.string().email("Enter a valid email"),
});

type ForgotValues = z.infer<typeof forgotSchema>;

export default function ForgotPasswordPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotValues>({ resolver: zodResolver(forgotSchema) });

  useEffect(() => {
    if (!loading && user) router.replace("/");
  }, [loading, user, router]);

  async function onSubmit(values: ForgotValues) {
    setSubmitting(true);
    try {
      await authApi.forgotPassword(values.email);
      setSent(true);
    } catch {
      // Endpoint always returns 200 — surface a generic error only for network failures.
      toast.error("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

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
            <div>
              <h1 className="font-display text-xl font-semibold tracking-tight text-foreground">
                Reset your password
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Enter your email and we&apos;ll send you a reset link.
              </p>
            </div>
          </div>

          <Card className="relative overflow-hidden rounded-3xl border-border/70 bg-card/80 backdrop-blur-xl">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent" />
            <CardContent className="pt-6">
              {sent ? (
                <div className="flex flex-col items-center gap-3 py-4 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary text-primary">
                    <MailCheck className="h-6 w-6" />
                  </div>
                  <p className="text-sm text-foreground">Check your inbox</p>
                  <p className="text-sm text-muted-foreground">
                    If an account exists for that email, a reset link is on its way (check the backend logs in dev).
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      autoComplete="email"
                      placeholder="you@example.com"
                      className="focus-visible:shadow-[0_0_0_3px_hsl(var(--glow)/0.12)]"
                      {...register("email")}
                    />
                    {errors.email ? <p className="text-xs text-destructive">{errors.email.message}</p> : null}
                  </div>

                  <Button type="submit" variant="gradient" className="w-full" disabled={submitting}>
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    Send reset link
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Remembered your password?{" "}
            <Link href="/login" className="font-medium text-primary hover:opacity-80">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
