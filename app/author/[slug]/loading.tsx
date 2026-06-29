import { AppHeader } from "@/components/AppHeader";
import { SkeletonBlock } from "@/components/Skeletons";

/** Shown while the creator profile fetches server-side. */
export default function AuthorLoading() {
  return (
    <>
      <AppHeader />
      <div className="mx-auto max-w-5xl space-y-12 px-6 py-10">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
          <SkeletonBlock className="h-24 w-24 shrink-0 rounded-full" />
          <div className="flex-1 space-y-3 py-1">
            <SkeletonBlock className="h-3 w-20" />
            <SkeletonBlock className="h-9 w-1/2" />
            <SkeletonBlock className="h-3 w-full max-w-lg" />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-px border border-[var(--color-border)] bg-[var(--color-border)]">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-2 bg-[var(--color-surface)] px-5 py-6 text-center">
              <SkeletonBlock className="mx-auto h-4 w-4 rounded-full" />
              <SkeletonBlock className="mx-auto h-6 w-12" />
              <SkeletonBlock className="mx-auto h-2.5 w-14" />
            </div>
          ))}
        </div>

        <div className="space-y-5">
          <SkeletonBlock className="h-7 w-40" />
          <div className="grid grid-cols-2 gap-x-5 gap-y-7 sm:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <SkeletonBlock className="aspect-[2/3] w-full" />
                <SkeletonBlock className="h-3 w-3/4" />
                <SkeletonBlock className="h-2.5 w-1/2" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
