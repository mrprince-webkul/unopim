import * as React from "react";
import { AnimatedNumber } from "./AnimatedNumber";

export interface StatStripItem {
  value: string;
  label: string;
}

export interface StatStripProps {
  items: StatStripItem[];
}

export function StatStrip({ items }: StatStripProps) {
  return (
    <div className="grid grid-cols-2 divide-x divide-y divide-border rounded-lg border border-border sm:grid-cols-4 sm:divide-y-0">
      {items.map((item) => (
        <div
          key={item.label}
          className="group flex flex-col items-center justify-center gap-1 px-4 py-6 text-center transition-colors hover:bg-card"
        >
          <AnimatedNumber
            value={item.value}
            className="font-display text-3xl tabular-nums text-foreground transition-colors group-hover:text-primary md:text-4xl"
          />
          <span className="font-mono text-xs text-muted-foreground">{item.label}</span>
        </div>
      ))}
    </div>
  );
}
