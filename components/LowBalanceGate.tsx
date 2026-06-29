import Link from "next/link";
import { Wallet } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";

/** Shown when a reader with an empty balance tries to open a paid chapter. */
export function LowBalanceGate({ seriesTitle, seriesSlug, chapterTitle }: { seriesTitle: string; seriesSlug: string; chapterTitle: string }) {
  return (
    <>
      <AppHeader />
      <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-4 px-6 py-16 text-center">
        <span className="grid h-14 w-14 place-items-center rounded-full border border-[var(--color-border)] text-[var(--color-gold)]">
          <Wallet size={24} strokeWidth={1.5} />
        </span>
        <h1 className="font-display text-2xl font-semibold">Your balance is empty</h1>
        <p className="text-sm text-[var(--color-muted)]">
          “{chapterTitle}” from <span className="text-[var(--color-ink)]">{seriesTitle}</span> is a paid chapter. Top up
          your reading balance to keep going — you only pay for what you read, and re-reads stay free.
        </p>
        <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
          <Link href="/wallet" className="btn-coin">
            <Wallet size={15} /> Add funds
          </Link>
          <Link href={`/series/${seriesSlug}`} className="btn-outline">
            Back to series
          </Link>
        </div>
      </div>
    </>
  );
}
