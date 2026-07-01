import Link from "next/link";
import { Lock } from "lucide-react";

/**
 * Locked reading surface for unauthenticated readers on any chapter past the
 * free first one. Shows a short teaser fading into a sign-in wall — the content
 * itself is never sent to the client.
 */
export function GuestGate({
  seriesTitle,
  seriesSlug,
  n,
  title,
  teaser,
  firstChapterId,
}: {
  seriesTitle: string;
  seriesSlug: string;
  n: number;
  title: string;
  teaser: string;
  firstChapterId: string | null;
}) {
  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <Link href={`/series/${seriesSlug}`} className="text-sm text-[var(--color-muted)] transition-colors hover:text-[var(--color-ink)]">
        ← {seriesTitle}
      </Link>
      <h1 className="font-display mt-3 text-3xl font-bold sm:text-4xl">{title}</h1>
      <p className="text-utility mt-1 text-[var(--color-muted)]">Chapter {n}</p>

      {/* Teaser fading out */}
      <div className="relative mt-8 max-h-44 overflow-hidden">
        <p className="whitespace-pre-wrap text-[1.05rem] leading-8 text-[var(--color-muted)]">{teaser}…</p>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[var(--color-bg)] to-transparent" />
      </div>

      {/* Sign-in wall */}
      <div className="border border-[var(--color-border)] bg-[var(--color-surface)] p-8 text-center">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-full border border-[var(--color-border)] text-[var(--color-gold)]">
          <Lock size={20} strokeWidth={1.6} />
        </div>
        <h2 className="font-display mt-4 text-2xl font-semibold">Keep reading on Charon</h2>
        <p className="mx-auto mt-2 max-w-md text-[var(--color-muted)]">
          The first chapter is free. Sign in to continue <span className="text-[var(--color-ink)]">{seriesTitle}</span>. Deposit once and
          pay only for what you read, per chapter.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link href="/join" className="btn-coin">
            Sign in to read
          </Link>
          {firstChapterId && (
            <Link href={`/chapter/${firstChapterId}`} className="btn-outline">
              Read chapter 1 free
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
