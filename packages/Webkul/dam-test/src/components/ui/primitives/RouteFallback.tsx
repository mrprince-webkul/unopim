export function RouteFallback() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="flex items-center gap-3 font-mono text-sm text-muted-foreground">
        <span className="h-2 w-2 animate-pulse rounded-full bg-primary motion-reduce:animate-none" />
        loading…
      </div>
    </div>
  );
}
