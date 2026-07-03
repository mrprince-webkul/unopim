import { cn } from "@/lib/utils";

/** Shimmering placeholder bar — an on-brand alternative to the static pulse Skeleton. */
function ShimmerBar({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-shimmer rounded-md bg-[linear-gradient(110deg,hsl(var(--muted))_8%,hsl(var(--muted-foreground)/0.18)_18%,hsl(var(--muted))_33%)] bg-[length:200%_100%]",
        className,
      )}
    />
  );
}

export default function Loading() {
  return (
    <div className="container space-y-10 py-16">
      <div className="space-y-4">
        <ShimmerBar className="h-3 w-32 rounded-full" />
        <ShimmerBar className="h-8 w-64" />
        <ShimmerBar className="h-4 w-96 max-w-full" />
      </div>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="space-y-3 rounded-2xl border border-border p-5">
            <ShimmerBar className="aspect-video w-full rounded-xl" />
            <ShimmerBar className="h-4 w-3/4" />
            <ShimmerBar className="h-3 w-full" />
            <ShimmerBar className="h-3 w-2/3" />
          </div>
        ))}
      </div>
    </div>
  );
}
