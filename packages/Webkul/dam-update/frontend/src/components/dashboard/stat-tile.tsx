import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { AnimatedCounter, RevealItem } from "@/components/motion";

const SHIMMER = "h-7 w-14 rounded-md bg-gradient-to-r from-secondary via-secondary/50 to-secondary bg-[length:200%_100%] animate-shimmer";

/** Premium stat tile: icon chip, spotlight hover, animated counter. */
export function StatTile({
  icon: Icon,
  label,
  value,
  formatted,
  loading,
  extra,
}: {
  icon: LucideIcon;
  label: string;
  value?: number;
  formatted?: string;
  loading?: boolean;
  extra?: ReactNode;
}) {
  return (
    <RevealItem>
      <div className="group relative overflow-hidden rounded-2xl border border-border bg-card p-4 transition-colors duration-300 hover:border-primary/35">
        <div className="pointer-events-none absolute -right-6 -top-10 h-28 w-28 rounded-full bg-primary/10 opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100" />
        <div className="relative flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary/25 bg-primary/[0.08] text-primary">
            <Icon className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            {loading ? (
              <div className={SHIMMER} />
            ) : (
              <p className="truncate font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                {formatted ?? <AnimatedCounter value={value ?? 0} />}
              </p>
            )}
            <p className="mt-0.5 truncate font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
              {label}
            </p>
          </div>
        </div>
        {extra ? <div className="relative mt-3">{extra}</div> : null}
      </div>
    </RevealItem>
  );
}
