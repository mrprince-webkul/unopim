"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2, ShieldCheck, Terminal } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth";
import { ApiError } from "@/lib/api";

const schema = z.object({
  email_or_username: z.string().min(1, "Enter your admin email or username"),
  password: z.string().min(1, "Enter your password"),
});
type Values = z.infer<typeof schema>;

export default function AdminLoginPage() {
  const { user, isAdmin, loading, login, logout } = useAuth();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Values>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (!loading && user && isAdmin) router.replace("/admin");
  }, [loading, user, isAdmin, router]);

  // A non-admin who lands here is signed out of the admin surface.
  const nonAdmin = !loading && user && !isAdmin;

  async function onSubmit(values: Values) {
    setSubmitting(true);
    try {
      const u = await login(values.email_or_username, values.password);
      if (u.role !== "admin") {
        toast.error("This account does not have administrator access.");
        await logout();
        return;
      }
      toast.success("Welcome to the console.");
      router.replace("/admin");
    } catch (err) {
      if (err instanceof ApiError) toast.error(err.detail || "Invalid credentials");
      else toast.error("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background p-6">
      {/* Console backdrop: blueprint grid + aurora, distinct from the user login */}
      <div className="bg-grid-fine pointer-events-none absolute inset-0 opacity-70" />
      <div className="bg-aurora pointer-events-none absolute inset-0" />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(90deg, hsl(var(--foreground)) 0 1px, transparent 1px 3px)",
        }}
      />

      <div className="relative grid w-full max-w-4xl overflow-hidden rounded-3xl border border-border bg-card/80 backdrop-blur-xl lg:grid-cols-[1.05fr_1fr]">
        {/* Left rail — identity / reassurance */}
        <div className="relative hidden flex-col justify-between border-r border-border bg-gradient-to-b from-primary/[0.08] to-transparent p-8 lg:flex">
          <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.25em] text-primary">
            <Terminal className="h-4 w-4" />
            DevAnnounce · Console
          </div>
          <div>
            <h2 className="font-display text-3xl font-bold leading-tight tracking-tight text-foreground">
              Admin
              <br />
              <span className="gradient-text">control plane</span>
            </h2>
            <p className="mt-3 max-w-xs text-sm text-muted-foreground">
              Providers, content, cache, jobs, branding — every operational lever, one secure surface.
            </p>
          </div>
          <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5 text-primary" />
            Role-restricted · audited
          </div>
        </div>

        {/* Right — the form */}
        <div className="p-8 sm:p-10">
          <div className="mb-7">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-primary/25 bg-primary/[0.08] text-primary">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <h1 className="mt-4 font-display text-xl font-semibold tracking-tight text-foreground">
              Sign in to the console
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">Administrator credentials required.</p>
          </div>

          {nonAdmin ? (
            <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-foreground">
              You&apos;re signed in as{" "}
              <span className="font-mono text-destructive">{user?.username}</span>, which isn&apos;t an
              admin account.{" "}
              <button className="font-medium text-primary hover:opacity-80" onClick={() => logout()}>
                Sign out
              </button>{" "}
              to switch accounts.
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email_or_username">Email or username</Label>
                <Input
                  id="email_or_username"
                  autoComplete="username"
                  placeholder="admin@devannounce.com"
                  className="focus-visible:shadow-[0_0_0_3px_hsl(var(--glow)/0.12)]"
                  {...register("email_or_username")}
                />
                {errors.email_or_username ? (
                  <p className="text-xs text-destructive">{errors.email_or_username.message}</p>
                ) : null}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="focus-visible:shadow-[0_0_0_3px_hsl(var(--glow)/0.12)]"
                  {...register("password")}
                />
                {errors.password ? (
                  <p className="text-xs text-destructive">{errors.password.message}</p>
                ) : null}
              </div>
              <Button type="submit" variant="gradient" className="w-full" disabled={submitting}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Enter console
              </Button>
            </form>
          )}

          <p className="mt-6 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Unauthorized access is prohibited
          </p>
        </div>
      </div>
    </div>
  );
}
