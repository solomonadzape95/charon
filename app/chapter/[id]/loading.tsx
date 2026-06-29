import { SkeletonBlock } from "@/components/Skeletons";

/** Shown while a chapter loads server-side — a quiet reading placeholder. */
export default function ChapterLoading() {
  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      {/* Chrome bar */}
      <div className="sticky top-0 border-b border-[var(--color-border)] bg-[var(--color-bg)]">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-3.5">
          <SkeletonBlock className="h-4 w-40" />
          <SkeletonBlock className="h-4 w-16" />
        </div>
      </div>
      {/* Reading column */}
      <div className="mx-auto max-w-3xl space-y-4 px-6 pt-12">
        <SkeletonBlock className="h-9 w-2/3" />
        <div className="space-y-3 pt-6">
          {Array.from({ length: 12 }).map((_, i) => (
            <SkeletonBlock key={i} className={`h-3.5 ${i % 4 === 3 ? "w-2/5" : "w-full"}`} />
          ))}
        </div>
      </div>
    </div>
  );
}
