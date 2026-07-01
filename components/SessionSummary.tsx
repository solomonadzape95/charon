"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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
const LOW_BALANCE = 0.3; // below this, nudge a top-up
const APPROX_CHAPTER_PRICE = 0.04;

/**
 * Appears after every reading session — the agent's one-line valuation + the
 * amount settled to the creator on Arc. The moment that makes the product click.
 */
export function SessionSummary({ result, onClose }: { result: SessionResult; onClose: () => void }) {
  const router = useRouter();
  const [balance, setBalance] = useState(result.balance ?? null);
  const [busy, setBusy] = useState(false);

  const low = balance != null && balance < LOW_BALANCE;
  const chaptersLeft = balance != null ? Math.floor(balance / APPROX_CHAPTER_PRICE) : 0;

  async function topUp() {
    const userId = typeof window !== "undefined" ? localStorage.getItem("charon_user_id") : null;
    if (!userId) {
      router.push("/wallet");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/deposit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, amountUsd: 5 }),
      });
      const d = await res.json();
      if (typeof d.balance === "number") setBalance(d.balance);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className="fade-up w-full max-w-md border border-[var(--color-border)] bg-[var(--color-surface)] p-6 text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-3 inline-flex items-center gap-2 border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-1 text-xs text-[var(--color-muted)]">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-accent-2)] pulse-dot" />
          Reading Intelligence agent
        </div>

        {result.settled ? (
          <>
            <p className="font-display text-5xl font-bold text-[var(--color-gold)]">${result.amount.toFixed(2)}</p>
            <p className="mt-1 text-sm text-[var(--color-muted)]">paid to {result.creator ?? "the creator"} on Arc</p>
          </>
        ) : (
          <p className="text-xl font-semibold">Session saved</p>
        )}

        <p className="mt-4 text-[0.95rem] leading-relaxed">{result.reasoning}</p>

        {balance != null && <p className="mt-4 text-xs text-[var(--color-muted)]">Balance: ${balance.toFixed(2)}</p>}
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

        {/* Low-balance nudge (Agent 4) */}
        {low && (
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border border-[var(--color-border)] bg-[var(--color-surface-2)] p-3 text-left">
            <p className="text-sm text-[var(--color-muted)]">
              You have about {chaptersLeft} chapter{chaptersLeft === 1 ? "" : "s"} left at your reading pace.
            </p>
            <button
              disabled={busy}
              onClick={topUp}
              className="shrink-0 rounded-full bg-[var(--color-gold)] px-3 py-1.5 text-sm font-semibold text-black disabled:opacity-50"
            >
              {busy ? "…" : "Top up $5"}
            </button>
          </div>
        )}

        <div className="mt-6 grid grid-cols-2 gap-2">
          <button onClick={onClose} className="rounded-full bg-[var(--color-gold)] px-4 py-2.5 text-sm font-semibold text-black">
            Keep reading
          </button>
          <button
            onClick={() => router.push("/dashboard")}
            className="rounded-full border border-[var(--color-border)] px-4 py-2.5 text-sm font-semibold transition-colors hover:border-[var(--color-gold)]"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
