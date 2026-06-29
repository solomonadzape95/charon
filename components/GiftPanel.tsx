"use client";

import { useEffect, useRef, useState } from "react";
import { Gift, Search, Check, Loader2, X } from "lucide-react";

interface Match {
  id: string;
  email: string | null;
  username: string;
}

const AMOUNTS = [1, 3, 5, 10];

/** Gift a deposit into another reader's balance — search them by email/username. */
export function GiftPanel({ userId }: { userId: string }) {
  const [q, setQ] = useState("");
  const [matches, setMatches] = useState<Match[]>([]);
  const [searching, setSearching] = useState(false);
  const [picked, setPicked] = useState<Match | null>(null);
  const [amount, setAmount] = useState("3");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ amount: number; who: string } | null>(null);
  const [error, setError] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (picked) return;
    const term = q.trim();
    if (term.length < 2) {
      setMatches([]);
      return;
    }
    setSearching(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      fetch(`/api/users?q=${encodeURIComponent(term)}`)
        .then((r) => r.json())
        .then((d) => setMatches((d.users ?? []).filter((u: Match) => u.id !== userId)))
        .catch(() => {})
        .finally(() => setSearching(false));
    }, 300);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [q, picked, userId]);

  async function send() {
    if (!picked) return;
    const amt = Number(amount);
    if (!(amt > 0)) {
      setError("Enter an amount.");
      return;
    }
    setError("");
    setBusy(true);
    try {
      const res = await fetch("/api/deposit/gift", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fromUserId: userId, toUserId: picked.id, amountUsd: amt }),
      });
      const d = await res.json();
      if (!res.ok) {
        setError(d.error ?? "Gift failed.");
        return;
      }
      setDone({ amount: d.amount, who: d.recipient.username });
      setPicked(null);
      setQ("");
      setMatches([]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="space-y-4 border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
      <div className="flex items-center gap-2">
        <Gift size={18} className="text-[var(--color-gold)]" />
        <h2 className="font-display text-xl font-semibold">Gift a deposit</h2>
      </div>
      <p className="text-sm text-[var(--color-muted)]">Top up another reader&apos;s balance. Find them by username or email.</p>

      {done && (
        <div className="flex items-center gap-2 border border-[var(--color-accent-2)] bg-[color-mix(in_srgb,var(--color-accent-2)_8%,transparent)] px-4 py-3 text-sm">
          <Check size={16} className="text-[var(--color-accent-2)]" />
          Sent <span className="font-semibold">${done.amount.toFixed(2)}</span> to {done.who}. Their balance is topped up.
        </div>
      )}

      {!picked ? (
        <div className="relative">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-muted)]" strokeWidth={1.75} />
          <input
            value={q}
            onChange={(e) => { setQ(e.target.value); setDone(null); }}
            placeholder="Search by username or email…"
            className="charon-input pl-10"
          />
          {searching && <Loader2 size={15} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-[var(--color-muted)]" />}
          {matches.length > 0 && (
            <ul className="mt-2 max-h-56 divide-y divide-[var(--color-border)] overflow-y-auto border border-[var(--color-border)]">
              {matches.map((m) => (
                <li key={m.id}>
                  <button
                    onClick={() => { setPicked(m); setMatches([]); }}
                    className="flex w-full items-center gap-3 bg-[var(--color-bg)] px-4 py-3 text-left transition-colors hover:bg-[var(--color-surface-2)]"
                  >
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[var(--color-gold)] text-sm font-semibold text-black">
                      {m.username[0]?.toUpperCase() ?? "R"}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">{m.username}</span>
                      <span className="block truncate text-xs text-[var(--color-muted)]">{m.email}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {q.trim().length >= 2 && !searching && matches.length === 0 && (
            <p className="mt-2 text-xs text-[var(--color-muted)]">No readers match that.</p>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-3 border border-[var(--color-gold)] bg-[color-mix(in_srgb,var(--color-gold)_8%,transparent)] px-4 py-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[var(--color-gold)] text-sm font-semibold text-black">
              {picked.username[0]?.toUpperCase() ?? "R"}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{picked.username}</p>
              <p className="truncate text-xs text-[var(--color-muted)]">{picked.email}</p>
            </div>
            <button onClick={() => setPicked(null)} aria-label="Change recipient" className="text-[var(--color-muted)] hover:text-[var(--color-ink)]">
              <X size={16} />
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {AMOUNTS.map((a) => (
              <button
                key={a}
                onClick={() => setAmount(String(a))}
                className={`text-utility rounded-full border px-3 py-1.5 transition-colors ${
                  amount === String(a)
                    ? "border-[var(--color-gold)] bg-[color-mix(in_srgb,var(--color-gold)_12%,transparent)] text-[var(--color-gold)]"
                    : "border-[var(--color-border)] text-[var(--color-muted)] hover:text-[var(--color-ink)]"
                }`}
              >
                ${a}
              </button>
            ))}
            <div className="relative w-28">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-muted)]">$</span>
              <input
                type="number"
                min="0.5"
                step="0.5"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="charon-input pl-7 text-sm"
              />
            </div>
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <button disabled={busy} onClick={send} className="btn-coin">
            {busy ? "Sending…" : `Gift $${(Number(amount) || 0).toFixed(2)}`}
            <Gift size={15} />
          </button>
        </div>
      )}
    </section>
  );
}
