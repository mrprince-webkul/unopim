"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Bot,
  FileClock,
  FileText,
  Gauge,
  HardDrive,
  ListChecks,
  Newspaper,
  Palette,
  Settings,
  Shield,
  Tags,
  Users,
} from "lucide-react";

import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

const NAV: { href: string; label: string; icon: LucideIcon; exact?: boolean; group?: string }[] = [
  { href: "/admin", label: "Overview", icon: BarChart3, exact: true, group: "Insights" },
  { href: "/admin/content", label: "Content", icon: FileText, group: "Manage" },
  { href: "/admin/users", label: "Users", icon: Users, group: "Manage" },
  { href: "/admin/moderation", label: "Moderation", icon: Shield, group: "Manage" },
  { href: "/admin/categories", label: "Categories", icon: Tags, group: "Manage" },
  { href: "/admin/news", label: "News", icon: Newspaper, group: "Engine" },
  { href: "/admin/ai", label: "AI Providers", icon: Bot, group: "Engine" },
  { href: "/admin/jobs", label: "Jobs", icon: ListChecks, group: "Engine" },
  { href: "/admin/cache", label: "Cache", icon: Gauge, group: "Engine" },
  { href: "/admin/storage", label: "Storage", icon: HardDrive, group: "System" },
  { href: "/admin/branding", label: "Branding", icon: Palette, group: "System" },
  { href: "/admin/settings", label: "Settings", icon: Settings, group: "System" },
  { href: "/admin/logs", label: "Logs", icon: FileClock, group: "System" },
];

export function AdminSidebar() {
  const pathname = usePathname();
  let lastGroup = "";

  return (
    <nav className="mask-fade-x flex gap-1 overflow-x-auto pb-2 lg:w-56 lg:shrink-0 lg:flex-col lg:overflow-visible lg:border-r lg:border-border lg:pb-0 lg:pr-4 lg:[mask-image:none]">
      {NAV.map((item) => {
        const active = item.exact
          ? pathname === item.href
          : pathname === item.href || pathname?.startsWith(`${item.href}/`);
        const showGroup = item.group && item.group !== lastGroup;
        lastGroup = item.group ?? lastGroup;
        return (
          <div key={item.href} className="contents">
            {showGroup ? (
              <p className="mt-3 hidden px-3 pb-1 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground first:mt-0 lg:block">
                {item.group}
              </p>
            ) : null}
            <Link
              href={item.href}
              className={cn(
                "relative flex shrink-0 items-center gap-2.5 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
                active && "bg-primary/10 text-primary hover:bg-primary/10 hover:text-primary",
              )}
            >
              {active ? (
                <span className="absolute inset-y-1 left-0 w-0.5 rounded-full bg-primary" aria-hidden />
              ) : null}
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          </div>
        );
      })}
    </nav>
  );
}
