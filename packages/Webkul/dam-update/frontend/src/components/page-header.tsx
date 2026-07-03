import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * Contained hero band shared by index pages. Layers an aurora glow + blueprint
 * grid behind a mono eyebrow, gradient-accented title, and optional stat cluster.
 */
export function PageHeader({
  eyebrow,
  icon: Icon,
  title,
  highlight,
  description,
  actions,
  children,
  className,
}: {
  eyebrow: string;
  icon?: LucideIcon;
  title: string;
  highlight?: string;
  description?: string;
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "relative isolate overflow-hidden rounded-2xl border border-border bg-card px-6 py-8 sm:px-8 sm:py-9",
        className,
      )}
    >
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 bg-aurora opacity-80" />
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 bg-grid-fine opacity-50" />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-24 -z-10 h-72 w-72 rounded-full bg-primary/10 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent"
      />

      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0 max-w-2xl">
          <p className="mb-3 inline-flex items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
            {Icon ? <Icon className="h-3.5 w-3.5" /> : null}
            {eyebrow}
          </p>
          <h1 className="font-display text-[26px] font-bold leading-[1.1] tracking-tight text-foreground sm:text-4xl">
            {title}
            {highlight ? (
              <>
                {" "}
                <span className="gradient-text">{highlight}</span>
              </>
            ) : null}
          </h1>
          {description ? (
            <p className="mt-3 max-w-xl text-[15px] leading-7 text-muted-foreground">{description}</p>
          ) : null}
          {children}
        </div>
        {actions ? <div className="shrink-0">{actions}</div> : null}
      </div>
    </header>
  );
}

/** Compact stat tiles rendered in the header's trailing slot. */
export function HeaderStats({ items }: { items: { label: string; value: string }[] }) {
  return (
    <dl className="flex flex-wrap items-stretch gap-2.5">
      {items.map((s) => (
        <div
          key={s.label}
          className="rounded-xl border border-border/70 bg-background/50 px-4 py-2.5 backdrop-blur-sm"
        >
          <dt className="font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
            {s.label}
          </dt>
          <dd className="mt-0.5 font-display text-xl font-bold tracking-tight text-foreground tabular-nums">
            {s.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
