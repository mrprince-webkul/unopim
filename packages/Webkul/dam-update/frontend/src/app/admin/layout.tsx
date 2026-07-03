"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import { AdminSidebar } from "@/components/admin/sidebar";
import { Reveal } from "@/components/motion";
import { useAuth } from "@/lib/auth";

export default function AdminLayout({ children }: { children: ReactNode }) {
  const { isAdmin, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const isLoginRoute = pathname === "/admin/login";

  useEffect(() => {
    // The dedicated admin login page is public; everything else is gated.
    if (!isLoginRoute && !loading && !isAdmin) router.replace("/admin/login");
  }, [loading, isAdmin, router, isLoginRoute]);

  // The login route renders its own full-screen chrome, outside the console.
  if (isLoginRoute) return <>{children}</>;

  if (loading || !isAdmin) {
    return (
      <div className="container flex min-h-[60vh] items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="container py-8">
      <Reveal>
        <div className="mb-6">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-primary">Console</p>
          <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            <span className="gradient-text">Admin</span>
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">Manage users, content, and platform settings.</p>
        </div>
      </Reveal>
      <div className="flex flex-col gap-6 lg:flex-row">
        <AdminSidebar />
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
