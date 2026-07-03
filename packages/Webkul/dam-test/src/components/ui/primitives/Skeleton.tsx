import * as React from "react";

import { cn } from "@/lib/utils";

export type SkeletonVariant = "row" | "card" | "text";

export interface SkeletonProps {
  variant: SkeletonVariant;
  count?: number;
  className?: string;
}

const variantClassName: Record<SkeletonVariant, string> = {
  row: "h-16 w-full rounded-lg",
  card: "h-40 w-full rounded-xl",
  text: "h-4 w-full rounded",
};

export function Skeleton({ variant, count = 1, className }: SkeletonProps) {
  return (
    <div className="flex flex-col gap-3" aria-hidden="true">
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className={cn(
            "animate-pulse bg-muted motion-reduce:animate-none",
            variantClassName[variant],
            className,
          )}
        />
      ))}
    </div>
  );
}
