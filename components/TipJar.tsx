"use client";

import { useState } from "react";
import { Coins, Check, Heart } from "lucide-react";

const AMOUNTS = [0.1, 0.25, 0.5, 1];

/**
 * Tip the author — 100% goes to the creator, no platform cut. Themeable so it
 * sits cleanly inside the reader as well as on light surfaces.
 */
export function TipJar({
  chapterId,
  variant = "surface",
  theme,
}: {
  chapterId: string;
  variant?: "surface" | "reader";
  theme?: { fg: string; chrome: string; line: string };
}) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("0.25");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<number | null>(null);
  const [error, setError] = useState("");

  const reader = variant === "reader" && theme;
  const style = reader ? { color: theme!.fg, border: `1px solid ${theme!.line}` } : undefined;

  async function send() {
    const userId = typeof window !== "undefined" ? localStorage.getItem("charon_user_id") : null;
    if (!userId) {
      window.location.href = "/join";
      return;
    }
    const amt = Number(amount);
    if (!(amt > 0)) {
      setError("Pick an amount.");
      return;
    }
    setError("");
    setBusy(true);
    try {
      const res = await fetch("/api/tip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, chapterId, amountUsd: amt }),
      });
      const d = await res.json();
      if (!res.ok) {
        setError(d.error ?? "Tip failed.");
        return;
      }
      setDone(d.amount);
      setOpen(false);
    } finally {
      setBusy(false);
    }
  }

  if (done != null) {
    return (
      <span
        className={`inline-flex items-center gap-1.5 text-sm ${reader ? "" : "text-[var(--color-accent-2)]"}`}
        style={reader ? { color: theme!.chrome } : undefined}
      >
        <Check size={15} className={reader ? "" : "text-[var(--color-accent-2)]"} /> Tipped ${done.toFixed(2)} — thank you
      </span>
    );
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className={reader ? "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm transition-opacity hover:opacity-70" : "btn-outline"}
        style={style}
      >
        <Heart size={15} /> Tip the author
      </button>
    );
  }

  return (
    <div
      className={reader ? "flex flex-col gap-3 p-4" : "flex flex-col gap-3 border border-[var(--color-border)] bg-[var(--color-surface)] p-4"}
      style={reader ? { border: `1px solid ${theme!.line}` } : undefined}
    >
      <div className="flex items-center gap-2 text-sm font-medium" style={reader ? { color: theme!.fg } : undefined}>
        <Coins size={16} className={reader ? "" : "text-[var(--color-gold)]"} /> Tip the author — 100% goes to them
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {AMOUNTS.map((a) => (
          <button
            key={a}
            onClick={() => setAmount(String(a))}
            className={`text-utility rounded-full border px-3 py-1.5 transition-colors ${
              amount === String(a)
                ? reader
                  ? ""
                  : "border-[var(--color-gold)] bg-[color-mix(in_srgb,var(--color-gold)_12%,transparent)] text-[var(--color-gold)]"
                : reader
                  ? "opacity-70"
                  : "border-[var(--color-border)] text-[var(--color-muted)] hover:text-[var(--color-ink)]"
            }`}
            style={reader ? { border: `1px solid ${amount === String(a) ? "var(--color-gold)" : theme!.line}`, color: amount === String(a) ? "var(--color-gold)" : theme!.chrome } : undefined}
          >
            ${a.toFixed(2)}
          </button>
        ))}
        <div className="relative w-24">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-muted)]" style={reader ? { color: theme!.chrome } : undefined}>$</span>
          <input
            type="number"
            min="0.05"
            step="0.05"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="charon-input pl-7 text-sm"
          />
        </div>
      </div>
      {error && <p className="text-sm text-red-400">{error}</p>}
      <div className="flex items-center gap-2">
        <button disabled={busy} onClick={send} className="btn-coin !py-2 !text-[0.72rem]">
          {busy ? "Sending…" : `Tip $${(Number(amount) || 0).toFixed(2)}`}
        </button>
        <button onClick={() => setOpen(false)} className="text-utility px-2 text-[var(--color-muted)] hover:text-[var(--color-ink)]" style={reader ? { color: theme!.chrome } : undefined}>
          Cancel
        </button>
      </div>
    </div>
  );
}
