"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, GitBranch } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";

const EASE = [0.21, 0.47, 0.32, 0.98] as const;

// A stylized preview of the ship log — communicates the product at a glance.
const PREVIEW = [
  { color: "hsl(160 84% 46%)", time: "now", title: "Open-sourced our Redis client", live: true },
  { color: "hsl(214 95% 62%)", time: "2h", title: "v2.1.0 — async by default", live: false },
  { color: "hsl(187 94% 53%)", time: "5h", title: "Launched the mobile beta", live: false },
];

const TICKER = [
  "launches",
  "dev news",
  "open source",
  "AI & ML",
  "databases",
  "devops",
  "security",
  "tooling",
  "web",
  "kubernetes",
];

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } },
};
const rise = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } },
};

export function HomeHero() {
  const { user, loading } = useAuth();
  // Only a first-impression surface — logged-in users go straight to the feed.
  if (loading || user) return null;

  return (
    <section className="relative isolate overflow-hidden rounded-3xl border border-border">
      {/* layered, handcrafted backdrop */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 bg-aurora" />
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 bg-grid-fine opacity-60" />
      <div
        aria-hidden
        className="pointer-events-none absolute -left-20 -top-24 -z-10 h-72 w-72 rounded-full bg-primary/15 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-28 right-0 -z-10 h-72 w-80 rounded-full bg-emerald-400/10 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent"
      />

      <motion.div
        variants={stagger}
        initial="hidden"
        animate="show"
        className="grid items-center gap-8 px-6 py-9 sm:px-9 sm:py-11 lg:grid-cols-[1.05fr_0.95fr]"
      >
        <div>
          <motion.p
            variants={rise}
            className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/[0.07] px-3 py-1 font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-primary"
          >
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/60" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
            </span>
            Live · developer announcement feed
          </motion.p>

          <motion.h1
            variants={rise}
            className="mt-4 text-balance font-display text-[34px] font-bold leading-[1.05] tracking-tight text-foreground sm:text-5xl"
          >
            Ship it. <span className="gradient-text">Announce it.</span>
          </motion.h1>

          <motion.p variants={rise} className="mt-4 max-w-md text-[15px] leading-7 text-muted-foreground">
            DevAnnounce is where developers post launches, share dev news, and get discovered — a real-time
            changelog for everything the community builds.
          </motion.p>

          <motion.div variants={rise} className="mt-6 flex flex-wrap items-center gap-3">
            <Button asChild variant="gradient" size="lg">
              <Link href="/register">
                Start shipping
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/general">Explore the feed</Link>
            </Button>
          </motion.div>

          <motion.p
            variants={rise}
            className="mt-5 font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground/60"
          >
            Open source · Real-time · Free forever
          </motion.p>
        </div>

        {/* Signature motif: a live mini ship-log */}
        <motion.div
          variants={rise}
          className="relative hidden rounded-2xl border border-border bg-card/70 p-4 backdrop-blur-sm md:block"
        >
          <div className="mb-3 flex items-center gap-2 border-b border-border/70 pb-2.5">
            <GitBranch className="h-3.5 w-3.5 text-primary" />
            <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              ship.log
            </span>
            <span className="ml-auto font-mono text-[10px] text-muted-foreground/50">main</span>
          </div>

          <div className="relative pl-6">
            <span aria-hidden className="absolute left-[5px] top-1 h-[calc(100%-1.25rem)] w-px bg-border" />
            {PREVIEW.map((row, i) => (
              <div key={row.title} className={i === PREVIEW.length - 1 ? "relative" : "relative pb-4"}>
                <span
                  aria-hidden
                  className="absolute -left-[19px] top-[3px] flex h-[11px] w-[11px] items-center justify-center"
                >
                  {row.live ? (
                    <span
                      className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-50"
                      style={{ backgroundColor: row.color }}
                    />
                  ) : null}
                  <span
                    className="relative h-[9px] w-[9px] rounded-full ring-2 ring-card"
                    style={{ backgroundColor: row.color }}
                  />
                </span>
                <p className="font-mono text-[10px] tabular-nums text-muted-foreground/60">{row.time}</p>
                <p className="mt-0.5 text-[13px] font-medium leading-snug text-foreground/90">{row.title}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </motion.div>

      {/* Living activity ticker along the base */}
      <div className="mask-fade-x relative overflow-hidden border-t border-border/70 bg-background/40 py-2.5">
        <div className="flex w-max animate-marquee items-center gap-2">
          {[...TICKER, ...TICKER].map((label, i) => (
            <span
              key={`${label}-${i}`}
              className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-secondary/30 px-2.5 py-0.5 font-mono text-[10.5px] text-muted-foreground/70"
            >
              <span className="h-1 w-1 rounded-full bg-primary/60" />
              {label}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
