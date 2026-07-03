"use client";

import { Suspense, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth";
import { ApiError } from "@/lib/api";

const loginSchema = z.object({
  email_or_username: z.string().min(1, "Enter your email or username"),
  password: z.string().min(1, "Enter your password"),
});

type LoginValues = z.infer<typeof loginSchema>;

function LoginForm() {
  const { user, loading, login } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/";
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginValues>({ resolver: zodResolver(loginSchema) });

  useEffect(() => {
    if (!loading && user) router.replace(next);
  }, [loading, user, router, next]);

  async function onSubmit(values: LoginValues) {
    setSubmitting(true);
    try {
      await login(values.email_or_username, values.password);
      toast.success("Welcome back!");
      router.replace(next);
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        toast.error("Your account has been banned. Contact support if you think this is a mistake.");
      } else if (err instanceof ApiError) {
        toast.error(err.detail || "Invalid credentials");
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
              <h1 className="font-display text-xl font-semibold tracking-tight text-foreground">Welcome back</h1>
              <p className="mt-1 text-sm text-muted-foreground">Log in to your DevAnnounce account</p>
            </div>
          </div>

          <Card className="relative overflow-hidden rounded-3xl border-border/70 bg-card/80 backdrop-blur-xl">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent" />
            <CardContent className="pt-6">
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email_or_username">Email or username</Label>
                  <Input
                    id="email_or_username"
                    autoComplete="username"
                    placeholder="you@example.com"
                    className="focus-visible:shadow-[0_0_0_3px_hsl(var(--glow)/0.12)]"
                    {...register("email_or_username")}
                  />
                  {errors.email_or_username ? (
                    <p className="text-xs text-destructive">{errors.email_or_username.message}</p>
                  ) : null}
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Password</Label>
                    <Link href="/forgot-password" className="text-xs font-medium text-primary hover:opacity-80">
                      Forgot password?
                    </Link>
                  </div>
                  <Input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    placeholder="••••••••"
                    className="focus-visible:shadow-[0_0_0_3px_hsl(var(--glow)/0.12)]"
                    {...register("password")}
                  />
                  {errors.password ? <p className="text-xs text-destructive">{errors.password.message}</p> : null}
                </div>

                <Button type="submit" variant="gradient" className="w-full" disabled={submitting}>
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Log in
                </Button>
              </form>
            </CardContent>
          </Card>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="font-medium text-primary hover:opacity-80">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
