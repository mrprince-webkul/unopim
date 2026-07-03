import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/** Bordered rounded-2xl panel shell used across the dashboard. */
export function Panel({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("rounded-2xl border border-border bg-card", className)}>{children}</div>;
}

export function PanelHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-5 py-4">
      <div className="min-w-0">
        {eyebrow ? (
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary">{eyebrow}</p>
        ) : null}
        <h3 className="mt-0.5 font-display text-[15px] font-semibold text-foreground">{title}</h3>
        {description ? <p className="mt-0.5 max-w-xl text-xs text-muted-foreground">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

/** Small mono legend chip with a color dot, used in chart panel headers. */
export function LegendChip({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} aria-hidden />
      {label}
    </span>
  );
}

/** Cyan glow focus ring for form inputs, replacing the default ring outline. */
export const FOCUS_RING =
  "focus-visible:ring-0 focus:border-primary/50 focus:shadow-[0_0_0_3px_hsl(var(--glow)/0.12)]";
