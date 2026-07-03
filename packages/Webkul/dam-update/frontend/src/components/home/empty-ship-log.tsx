"use client";

import Link from "next/link";
import { motion } from "framer-motion";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";

/** Bespoke "empty timeline" illustration — a ship log waiting for its first commit. */
function EmptyTimelineArt() {
  return (
    <svg
      viewBox="0 0 200 150"
      fill="none"
      role="img"
      aria-label="An empty ship log timeline"
      className="h-36 w-48"
    >
      <defs>
        <linearGradient id="spine-fade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="hsl(var(--border))" stopOpacity="0.2" />
          <stop offset="0.5" stopColor="hsl(var(--border))" stopOpacity="0.9" />
          <stop offset="1" stopColor="hsl(var(--primary))" stopOpacity="0.5" />
        </linearGradient>
        <radialGradient id="node-glow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="hsl(var(--primary))" stopOpacity="0.55" />
          <stop offset="1" stopColor="hsl(var(--primary))" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* spine */}
      <line x1="40" y1="18" x2="40" y2="132" stroke="url(#spine-fade)" strokeWidth="1.5" />

      {/* faded past nodes with ghost rows */}
      {[28, 60].map((cy, i) => (
        <g key={cy} opacity={i === 0 ? 0.35 : 0.6}>
          <circle cx="40" cy={cy} r="4" fill="hsl(var(--card))" stroke="hsl(var(--border))" strokeWidth="1.5" />
          <rect x="58" y={cy - 5} width={i === 0 ? 70 : 96} height="4" rx="2" fill="hsl(var(--muted-foreground))" opacity="0.25" />
          <rect x="58" y={cy + 2} width={i === 0 ? 44 : 60} height="4" rx="2" fill="hsl(var(--muted-foreground))" opacity="0.15" />
        </g>
      ))}

      {/* the empty "next" node — glowing, dashed, a plus */}
      <circle cx="40" cy="104" r="16" fill="url(#node-glow)" />
      <circle
        cx="40"
        cy="104"
        r="9"
        fill="hsl(var(--background))"
        stroke="hsl(var(--primary))"
        strokeWidth="1.5"
        strokeDasharray="3 3"
      />
      <path d="M40 100.5v7M36.5 104h7" stroke="hsl(var(--primary))" strokeWidth="1.5" strokeLinecap="round" />
      <rect x="58" y="99" width="86" height="4" rx="2" fill="hsl(var(--primary))" opacity="0.35" />
      <rect x="58" y="106" width="52" height="4" rx="2" fill="hsl(var(--primary))" opacity="0.2" />
    </svg>
  );
}

export function EmptyShipLog() {
  const { user } = useAuth();

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.21, 0.47, 0.32, 0.98] }}
      className="flex flex-col items-center justify-center gap-5 rounded-2xl border border-dashed border-border px-6 py-14 text-center"
    >
      <EmptyTimelineArt />
      <div className="space-y-1.5">
        <h3 className="font-display text-lg font-semibold tracking-tight text-foreground">
          The ship log is empty
        </h3>
        <p className="mx-auto max-w-sm text-sm leading-6 text-muted-foreground">
          No announcements yet. Be the first commit on the timeline — tell the community what you just built.
        </p>
      </div>
      <Button asChild variant="gradient" size="sm">
        <Link href={user ? "/announcements/new" : "/register"}>
          {user ? "Write the first announcement" : "Join & announce"}
        </Link>
      </Button>
    </motion.div>
  );
}
