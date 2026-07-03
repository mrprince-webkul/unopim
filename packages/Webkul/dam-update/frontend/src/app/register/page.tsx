"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
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

const registerSchema = z
  .object({
    full_name: z.string().max(80).optional().or(z.literal("")),
    username: z
      .string()
      .min(3, "At least 3 characters")
      .max(30, "At most 30 characters")
      .regex(/^[a-zA-Z0-9_]+$/, "Letters, numbers, and underscores only"),
    email: z.string().email("Enter a valid email"),
    password: z.string().min(8, "At least 8 characters"),
    confirm_password: z.string().min(8, "At least 8 characters"),
  })
  .refine((data) => data.password === data.confirm_password, {
    message: "Passwords don't match",
    path: ["confirm_password"],
  });

type RegisterValues = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const { user, loading, register: registerUser } = useAuth();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterValues>({ resolver: zodResolver(registerSchema) });

  useEffect(() => {
    if (!loading && user) router.replace("/");
  }, [loading, user, router]);

  async function onSubmit(values: RegisterValues) {
    setSubmitting(true);
    try {
      await registerUser({
        email: values.email,
        username: values.username,
        password: values.password,
        full_name: values.full_name || undefined,
      });
      toast.success("Account created!", {
        description: "We sent a verification link — check the backend logs for it in dev.",
      });
      router.replace("/");
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error(err.detail || "Could not create your account");
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
                Create your account
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">Join DevAnnounce and start shipping</p>
            </div>
          </div>

          <Card className="relative overflow-hidden rounded-3xl border-border/70 bg-card/80 backdrop-blur-xl">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent" />
            <CardContent className="pt-6">
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="full_name">Full name</Label>
                  <Input
                    id="full_name"
                    placeholder="Ada Lovelace"
                    className="focus-visible:shadow-[0_0_0_3px_hsl(var(--glow)/0.12)]"
                    {...register("full_name")}
                  />
                  {errors.full_name ? <p className="text-xs text-destructive">{errors.full_name.message}</p> : null}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    autoComplete="username"
                    placeholder="ada"
                    className="focus-visible:shadow-[0_0_0_3px_hsl(var(--glow)/0.12)]"
                    {...register("username")}
                  />
                  {errors.username ? <p className="text-xs text-destructive">{errors.username.message}</p> : null}
                </div>

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

                <div className="space-y-1.5">
                  <Label htmlFor="password">Password</Label>
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
                  Create account
                </Button>
              </form>
            </CardContent>
          </Card>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-primary hover:opacity-80">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
