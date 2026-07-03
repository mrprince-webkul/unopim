import * as React from "react";

export interface SectionHeaderProps {
  index: string;
  title: string;
  action?: React.ReactNode;
}

export function SectionHeader({ index, title, action }: SectionHeaderProps) {
  return (
    <div className="flex items-center gap-4">
      <span className="shrink-0 font-mono text-sm text-primary">§ {index}</span>
      <h2 className="shrink-0 font-display text-2xl text-foreground md:text-3xl">{title}</h2>
      <span aria-hidden="true" className="h-px flex-1 bg-border" />
      {action ? <span className="shrink-0 font-mono text-xs text-muted-foreground">{action}</span> : null}
    </div>
  );
}
