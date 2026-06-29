import { AppHeader } from "@/components/AppHeader";
import { SkeletonBlock, ListSkeleton } from "@/components/Skeletons";

/** Shown while the series page fetches server-side — mirrors its layout. */
export default function SeriesLoading() {
  return (
    <>
      <AppHeader />
      <div className="mx-auto max-w-5xl space-y-12 px-6 py-10">
        <SkeletonBlock className="h-3 w-40" />

        <div className="flex flex-col gap-8 sm:flex-row">
          <SkeletonBlock className="h-96 w-64 shrink-0" />
          <div className="flex-1 space-y-4 py-1">
            <SkeletonBlock className="h-3 w-32" />
            <SkeletonBlock className="h-10 w-2/3" />
            <SkeletonBlock className="h-3 w-24" />
            <div className="space-y-2 pt-2">
              <SkeletonBlock className="h-3 w-full max-w-xl" />
              <SkeletonBlock className="h-3 w-full max-w-md" />
            </div>
            <div className="grid grid-cols-4 gap-px border border-[var(--color-border)] bg-[var(--color-border)]">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="space-y-2 bg-[var(--color-surface)] px-3 py-3 text-center">
                  <SkeletonBlock className="mx-auto h-5 w-10" />
                  <SkeletonBlock className="mx-auto h-2.5 w-12" />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <SkeletonBlock className="h-7 w-48" />
          <div className="grid gap-3 sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <SkeletonBlock key={i} className="h-28 w-full" />
            ))}
          </div>
        </div>

        <ListSkeleton rows={6} />
      </div>
    </>
  );
}
