/**
 * Lightweight content skeletons. Shown while a client page fetches its data so a
 * surface never sits blank — the layout (header) stays put and only the content
 * area pulses into place.
 */

export function SkeletonBlock({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse bg-[var(--color-surface)] ${className}`} />;
}

/** A row of stat tiles, matching the bordered metric grids used across the app. */
export function StatGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-px border border-[var(--color-border)] bg-[var(--color-border)] sm:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-[var(--color-surface)] px-5 py-6">
          <SkeletonBlock className="h-3 w-16" />
          <SkeletonBlock className="mt-3 h-6 w-12" />
        </div>
      ))}
    </div>
  );
}

/** A stack of list rows. */
export function ListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="divide-y divide-[var(--color-border)] border border-[var(--color-border)]">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center justify-between bg-[var(--color-surface)] px-4 py-4">
          <div className="flex-1 space-y-2">
            <SkeletonBlock className="h-3 w-1/3" />
            <SkeletonBlock className="h-2.5 w-1/4" />
          </div>
          <SkeletonBlock className="h-4 w-14" />
        </div>
      ))}
    </div>
  );
}

/** The studio home: balance hero + metrics + activity feed + series cards. */
export function StudioSkeleton() {
  return (
    <div className="space-y-10">
      <SkeletonBlock className="h-px w-full !bg-[var(--color-border)]" />
      <section className="grid gap-px border border-[var(--color-border)] bg-[var(--color-border)] lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-4 bg-[var(--color-surface)] p-6">
          <SkeletonBlock className="h-3 w-32" />
          <SkeletonBlock className="h-12 w-40" />
          <SkeletonBlock className="h-14 w-full max-w-[280px]" />
        </div>
        <div className="grid grid-cols-3 bg-[var(--color-surface)]">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-3 px-5 py-6">
              <SkeletonBlock className="h-3 w-12" />
              <SkeletonBlock className="h-6 w-14" />
            </div>
          ))}
        </div>
      </section>
      <ListSkeleton rows={3} />
      <div className="grid gap-5 sm:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="flex gap-5 border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
            <SkeletonBlock className="h-44 w-32 shrink-0" />
            <div className="flex-1 space-y-3 py-1">
              <SkeletonBlock className="h-3 w-16" />
              <SkeletonBlock className="h-5 w-3/4" />
              <SkeletonBlock className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
