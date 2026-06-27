"use client";

export interface SessionResult {
  settled: boolean;
  status?: string;
  amount: number;
  reasoning: string;
  engagementScore?: number;
  creator?: string;
  seriesTitle?: string;
  chapterTitle?: string;
  txHash?: string;
  balance?: number;
}

const ARC_EXPLORER = "https://testnet.arcscan.app";

/**
 * Appears after every reading session — the agent's one-line valuation + the
 * amount settled to the creator on Arc. The moment that makes the product click.
 */
export function SessionSummary({ result, onClose }: { result: SessionResult; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="fade-up w-full max-w-md rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-3 inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-1 text-xs text-[var(--color-muted)]">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-accent-2)] pulse-dot" />
          Reading Intelligence agent
        </div>

        {result.settled ? (
          <>
            <p className="text-5xl font-bold text-[var(--color-gold)]">${result.amount.toFixed(2)}</p>
            <p className="mt-1 text-sm text-[var(--color-muted)]">
              settled to {result.creator ?? "the creator"} on Arc
            </p>
          </>
        ) : (
          <p className="text-xl font-semibold">Session saved</p>
        )}

        <p className="mt-4 text-[0.95rem] leading-relaxed">{result.reasoning}</p>

        {result.balance != null && (
          <p className="mt-4 text-xs text-[var(--color-muted)]">Balance: ${result.balance.toFixed(2)}</p>
        )}
        {result.txHash && (
          <a
            href={`${ARC_EXPLORER}/tx/${result.txHash}`}
            target="_blank"
            rel="noreferrer"
            className="mt-1 block text-xs text-[var(--color-gold)] underline"
          >
            View on Arc explorer ↗
          </a>
        )}

        <button
          onClick={onClose}
          className="mt-6 w-full rounded-lg bg-[var(--color-gold)] px-4 py-2.5 text-sm font-semibold text-black"
        >
          Keep reading
        </button>
      </div>
    </div>
  );
}
