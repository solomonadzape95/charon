"use client";

import { useEffect, useState } from "react";
import { Coins, ArrowRightLeft, ShieldCheck, RotateCcw } from "lucide-react";

const SEEN_KEY = "charon_pay_disclaimer_v1";

interface ReaderTheme {
  bg: string;
  fg: string;
  chrome: string;
  line: string;
  surface: string;
}

const POINTS = [
  {
    icon: ArrowRightLeft,
    title: "You pay when you leave",
    body: "The charge settles when you navigate away — not when you open. Never mid-read.",
  },
  {
    icon: Coins,
    title: "It reflects how you read",
    body: "The amount is informed by how you engaged with the chapter, deducted from your balance.",
  },
  {
    icon: RotateCcw,
    title: "Re-reads are free, forever",
    body: "Once you've paid for a chapter, returning to it never costs a thing.",
  },
  {
    icon: ShieldCheck,
    title: "No surprises",
    body: "The first three chapters of any series are free. You always see a price before you start.",
  },
];

/**
 * One-time "How Charon charges you" notice — shown before a reader's first
 * chapter ever, dismissed permanently after. Themed to match the reader.
 */
export function PaymentDisclaimer({ theme, enabled }: { theme: ReaderTheme; enabled: boolean }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    try {
      if (!localStorage.getItem(SEEN_KEY)) setOpen(true);
    } catch {
      /* ignore */
    }
  }, [enabled]);

  function dismiss() {
    try {
      localStorage.setItem(SEEN_KEY, "1");
    } catch {
      /* ignore */
    }
    setOpen(false);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={dismiss} />
      <div
        className="fade-up relative w-full max-w-lg p-7 shadow-2xl"
        style={{ background: theme.surface, color: theme.fg, border: `1px solid ${theme.line}` }}
      >
        <div className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-full" style={{ background: "var(--color-gold)" }}>
            <Coins size={17} className="text-black" />
          </span>
          <h2 className="font-display text-2xl font-semibold">How Charon charges you</h2>
        </div>
        <p className="mt-2 text-sm" style={{ color: theme.chrome }}>
          One coin per crossing. Here&apos;s exactly how reading is paid for — you&apos;ll only see this once.
        </p>

        <ul className="mt-5 space-y-3.5">
          {POINTS.map((p) => (
            <li key={p.title} className="flex gap-3">
              <span
                className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full"
                style={{ border: `1px solid ${theme.line}`, color: "var(--color-gold)" }}
              >
                <p.icon size={15} strokeWidth={1.75} />
              </span>
              <div>
                <p className="text-sm font-semibold">{p.title}</p>
                <p className="mt-0.5 text-sm leading-relaxed" style={{ color: theme.chrome }}>
                  {p.body}
                </p>
              </div>
            </li>
          ))}
        </ul>

        <button
          onClick={dismiss}
          className="mt-7 inline-flex w-full items-center justify-center gap-2 rounded-full py-3 text-utility font-semibold text-black transition-[filter] hover:brightness-110"
          style={{ background: "linear-gradient(180deg, var(--color-gold-soft), var(--color-gold))" }}
        >
          Got it — start reading
        </button>
      </div>
    </div>
  );
}
