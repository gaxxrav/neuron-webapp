/**
 * Placeholder shapes shown while a tab's data loads. Without a loading
 * boundary Next keeps the previous page on screen until the server render
 * finishes, which reads as the app having frozen.
 */
export function SkeletonCard({ rows = 3 }: { rows?: number }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-3 shadow-sm">
      <div className="mb-3 h-4 w-32 rounded bg-surface-muted" />
      <div className="flex flex-col gap-2">
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="h-6 rounded bg-surface-muted" />
        ))}
      </div>
    </div>
  );
}

export function SkeletonBoard({ children }: { children: React.ReactNode }) {
  return (
    <div aria-busy="true" aria-live="polite" className="flex animate-pulse flex-col gap-3">
      <span className="sr-only">Loading…</span>
      {children}
    </div>
  );
}
