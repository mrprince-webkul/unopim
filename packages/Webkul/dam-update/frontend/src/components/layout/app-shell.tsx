"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bookmark,
  Home,
  Layers,
  LayoutDashboard,
  LogOut,
  Menu,
  Newspaper,
  Palette,
  PlusCircle,
  Rss,
  Search,
  Settings,
  ShieldCheck,
  User as UserIcon,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NotificationsBell } from "@/components/layout/notifications-bell";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { UserAvatar } from "@/components/user-avatar";
import { useAuth } from "@/lib/auth";
import { useBranding } from "@/components/branding-context";
import { cn } from "@/lib/utils";

/** Brand wordmark — dynamic app name with the signature gradient split. */
function Wordmark({ name }: { name: string }) {
  if (name === "DevAnnounce") {
    return (
      <span className="font-display text-[15px] font-bold tracking-tight">
        Dev<span className="gradient-text">Announce</span>
      </span>
    );
  }
  return (
    <span className="font-display text-[15px] font-bold tracking-tight gradient-text">{name}</span>
  );
}

/** Routes that render without the app chrome (full-screen auth flows). */
const BARE_ROUTES = ["/login", "/register", "/forgot-password", "/reset-password", "/verify-email"];

const MAIN_NAV = [
  { href: "/", label: "Home", icon: Home, exact: true },
  { href: "/general", label: "Feed", icon: Rss },
  { href: "/news", label: "Dev News", icon: Newspaper },
  { href: "/categories", label: "Categories", icon: Layers },
];

const PERSONAL_NAV = [
  { href: "/bookmarks", label: "Bookmarks", icon: Bookmark },
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
];

function NavItem({
  href,
  label,
  icon: Icon,
  exact = false,
  onNavigate,
}: {
  href: string;
  label: string;
  icon: typeof Home;
  exact?: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const active = exact ? pathname === href : pathname === href || pathname?.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={cn(
        "group relative flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13.5px] font-medium transition-colors",
        active
          ? "bg-primary/10 text-primary shadow-[inset_0_0_0_1px_hsl(var(--primary)/0.14)]"
          : "text-muted-foreground hover:bg-accent hover:text-foreground",
      )}
    >
      {active ? <span className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-primary" /> : null}
      <Icon className="h-4 w-4 shrink-0" />
      {label}
    </Link>
  );
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { user, isAdmin } = useAuth();
  const { appName, logoUrl } = useBranding();

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-14 items-center border-b border-border px-4">
        <Link href="/" onClick={onNavigate} className="flex items-center gap-2.5">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt={appName} width={26} height={26} className="h-[26px] w-[26px] object-contain" />
          ) : (
            <Image src="/logo.svg" alt={appName} width={26} height={26} priority />
          )}
          <Wordmark name={appName} />
          <span className="ml-0.5 rounded border border-border bg-secondary/40 px-1 py-px font-mono text-[9px] font-medium leading-none text-muted-foreground">
            v2
          </span>
        </Link>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto p-3">
        <div className="space-y-0.5">
          {MAIN_NAV.map((item) => (
            <NavItem key={item.href} {...item} onNavigate={onNavigate} />
          ))}
        </div>

        {user ? (
          <div>
            <p className="mb-1.5 px-3 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/70">
              Personal
            </p>
            <div className="space-y-0.5">
              {PERSONAL_NAV.map((item) => (
                <NavItem key={item.href} {...item} onNavigate={onNavigate} />
              ))}
            </div>
          </div>
        ) : null}

        {isAdmin ? (
          <div>
            <p className="mb-1.5 px-3 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/70">
              Manage
            </p>
            <NavItem href="/admin" label="Admin console" icon={ShieldCheck} onNavigate={onNavigate} />
          </div>
        ) : null}
      </nav>

      <div className="space-y-3 border-t border-border p-3">
        {user ? (
          <Button asChild variant="gradient" size="sm" className="w-full" onClick={onNavigate}>
            <Link href="/announcements/new">
              <PlusCircle className="h-4 w-4" />
              New announcement
            </Link>
          </Button>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <Button asChild variant="outline" size="sm" onClick={onNavigate}>
              <Link href="/login">Log in</Link>
            </Button>
            <Button asChild variant="gradient" size="sm" onClick={onNavigate}>
              <Link href="/register">Sign up</Link>
            </Button>
          </div>
        )}

        <div className="flex items-center gap-2 px-1 pt-1">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/60" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
          </span>
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground/70">
            All systems operational
          </span>
        </div>
      </div>
    </div>
  );
}

function UserMenu() {
  const router = useRouter();
  const { user, logout } = useAuth();

  if (!user) return null;

  async function handleLogout() {
    await logout();
    router.push("/");
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="rounded-full ring-offset-background transition-shadow hover:ring-2 hover:ring-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <UserAvatar user={user} className="h-7 w-7" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="glass w-56">
        <DropdownMenuLabel className="font-normal">
          <p className="truncate text-sm font-medium text-foreground">{user.full_name || user.username}</p>
          <p className="truncate text-xs text-muted-foreground">@{user.username}</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href={`/profile/${user.username}`}>
            <UserIcon className="h-4 w-4" />
            Profile
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/appearance">
            <Palette className="h-4 w-4" />
            Appearance
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/dashboard/settings">
            <Settings className="h-4 w-4" />
            Settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={handleLogout} className="text-destructive focus:text-destructive">
          <LogOut className="h-4 w-4" />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function MaintenanceScreen({ message }: { message: string }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background p-6 text-center">
      <div className="bg-grid-fine pointer-events-none absolute inset-0 opacity-60" />
      <div className="bg-aurora pointer-events-none absolute inset-0" />
      <div className="relative max-w-md">
        <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-primary">Maintenance</p>
        <h1 className="mt-3 font-display text-3xl font-bold tracking-tight text-foreground">
          We&apos;ll be right back
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">{message}</p>
        <div className="mt-6 flex items-center justify-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400/60" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-amber-400" />
          </span>
          Deploying an upgrade
        </div>
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAdmin } = useAuth();
  const { maintenance, maintenanceMessage } = useBranding();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [query, setQuery] = useState("");

  // ⌘K / Ctrl+K jumps to search
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        router.push("/search");
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router]);

  // close the mobile drawer on navigation
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const bare = BARE_ROUTES.some((route) => pathname?.startsWith(route));
  if (bare) return <>{children}</>;

  // Maintenance mode: admins and the admin console stay reachable; everyone
  // else sees the maintenance screen.
  if (maintenance && !isAdmin && !pathname?.startsWith("/admin")) {
    return (
      <MaintenanceScreen
        message={maintenanceMessage || "We'll be back shortly — DevAnnounce is getting an upgrade."}
      />
    );
  }

  function handleSearch(e: FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    router.push(`/search?q=${encodeURIComponent(q)}`);
    setQuery("");
  }

  return (
    <div className="flex min-h-screen">
      {/* desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 border-r border-border bg-card/40 lg:block">
        <SidebarContent />
      </aside>

      {/* mobile drawer */}
      <AnimatePresence>
        {mobileOpen ? (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm lg:hidden"
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              initial={{ x: -260 }}
              animate={{ x: 0 }}
              exit={{ x: -260 }}
              transition={{ type: "spring", stiffness: 380, damping: 36 }}
              className="fixed inset-y-0 left-0 z-50 w-60 border-r border-border bg-background lg:hidden"
            >
              <button
                type="button"
                aria-label="Close menu"
                onClick={() => setMobileOpen(false)}
                className="absolute right-3 top-3.5 rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
              <SidebarContent onNavigate={() => setMobileOpen(false)} />
            </motion.aside>
          </>
        ) : null}
      </AnimatePresence>

      {/* main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="glass sticky top-0 z-40 flex h-14 shrink-0 items-center gap-3 border-b border-border px-4 sm:px-6">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Open menu"
            className="lg:hidden"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>

          <form onSubmit={handleSearch} className="max-w-md flex-1">
            <div className="group relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search announcements, news, people…"
                className="h-9 w-full rounded-lg border border-border bg-secondary/40 pl-9 pr-12 text-[13px] outline-none transition-all placeholder:text-muted-foreground/70 focus:border-primary/50 focus:bg-background focus:shadow-[0_0_0_3px_hsl(var(--glow)/0.12)]"
              />
              <kbd className="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 rounded border border-border bg-background px-1.5 font-mono text-[10px] text-muted-foreground md:inline-flex">
                ⌘K
              </kbd>
            </div>
          </form>

          <div className="ml-auto flex items-center gap-1.5">
            <Button asChild variant="ghost" size="icon" aria-label="Appearance" className="hidden sm:inline-flex">
              <Link href="/appearance">
                <Palette className="h-4 w-4" />
              </Link>
            </Button>
            <ThemeToggle />
            {user ? (
              <>
                <NotificationsBell />
                <Button asChild size="sm" variant="gradient" className="hidden md:inline-flex">
                  <Link href="/announcements/new">
                    <PlusCircle className="h-4 w-4" />
                    New
                  </Link>
                </Button>
                <UserMenu />
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Button asChild variant="ghost" size="sm">
                  <Link href="/login">Log in</Link>
                </Button>
                <Button asChild variant="gradient" size="sm">
                  <Link href="/register">Sign up</Link>
                </Button>
              </div>
            )}
          </div>
        </header>

        <main className="min-h-[calc(100vh-3.5rem)] flex-1">{children}</main>
      </div>
    </div>
  );
}
