"use client";

import { Suspense, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";
import { AlertTriangle, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authApi, ApiError } from "@/lib/api";

const resetSchema = z
  .object({
    password: z.string().min(8, "At least 8 characters"),
    confirm_password: z.string().min(8, "At least 8 characters"),
  })
  .refine((data) => data.password === data.confirm_password, {
    message: "Passwords don't match",
    path: ["confirm_password"],
  });

type ResetValues = z.infer<typeof resetSchema>;

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetValues>({ resolver: zodResolver(resetSchema) });

  async function onSubmit(values: ResetValues) {
    if (!token) return;
    setSubmitting(true);
    try {
      await authApi.resetPassword(token, values.password);
      toast.success("Password updated. You can log in now.");
      router.replace("/login");
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error(err.detail || "This reset link is invalid or expired.");
      } else {
        toast.error("Something went wrong. Please try again.");
      }
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
                Set a new password
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">Choose a strong password for your account.</p>
            </div>
          </div>

          <Card className="relative overflow-hidden rounded-3xl border-border/70 bg-card/80 backdrop-blur-xl">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent" />
            <CardContent className="pt-6">
              {!token ? (
                <div className="flex flex-col items-center gap-3 py-4 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                    <AlertTriangle className="h-6 w-6" />
                  </div>
                  <p className="text-sm text-foreground">Missing or invalid link</p>
                  <p className="text-sm text-muted-foreground">
                    Request a new password reset link and try again.
                  </p>
                  <Button asChild variant="outline" className="mt-2">
                    <Link href="/forgot-password">Request new link</Link>
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="password">New password</Label>
                    <Input
                      id="password"
                      type="password"
                      autoComplete="new-password"
                      placeholder="••••••••"
                      className="focus-visible:shadow-[0_0_0_3px_hsl(var(--glow)/0.12)]"
                      {...register("password")}
                    />
                    {errors.password ? <p className="text-xs text-destructive">{errors.password.message}</p> : null}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="confirm_password">Confirm password</Label>
                    <Input
                      id="confirm_password"
                      type="password"
                      autoComplete="new-password"
                      placeholder="••••••••"
                      className="focus-visible:shadow-[0_0_0_3px_hsl(var(--glow)/0.12)]"
                      {...register("confirm_password")}
                    />
                    {errors.confirm_password ? (
                      <p className="text-xs text-destructive">{errors.confirm_password.message}</p>
                    ) : null}
                  </div>

                  <Button type="submit" variant="gradient" className="w-full" disabled={submitting}>
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    Update password
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  );
}
