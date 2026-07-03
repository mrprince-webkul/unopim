import * as React from "react";

export interface EmptyStateProps {
  title: string;
  hint?: string;
}

export function EmptyState({ title, hint }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
      <p className="font-display text-xl text-foreground md:text-2xl">{title}</p>
      {hint ? <p className="font-mono text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
