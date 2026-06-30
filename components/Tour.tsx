"use client";

import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import { Compass, X, ChevronLeft, ChevronRight } from "lucide-react";

/**
 * A lightweight, dependency-free product tour.
 *
 * A floating button (bottom-right, on every page) opens a guided walkthrough that
 * spotlights real elements and explains the parts of Charon people don't guess on
 * their own — that it's testnet, that you read first and pay once per chapter, that
 * an agent can read and pay for you, how creators get paid, and so on.
 *
 * Design notes:
 *  - **Anchored vs. concept steps.** A step with a `sel` (CSS selector) spotlights
 *    that element; a step without one is a centered "concept" card for ideas that
 *    have no single element (e.g. "read first, pay after").
 *  - **Page-scoped, not cross-route.** On open we keep only the steps whose anchor
 *    is actually in the DOM right now (plus the concept cards). So the tour never
 *    navigates you into an empty/redirecting page — each surface explains itself,
 *    and the global button means every surface is covered. Anchors live wherever
 *    they're relevant via `data-tour="…"` attributes; missing ones are skipped.
 *  - **Spotlight** = one element sized to the target with a huge box-shadow that
 *    dims everything else, plus a gold ring. A transparent full-screen layer
 *    blocks interaction while the tour is open.
 */

type Step = {
  /** CSS selector for the element to spotlight. Omit for a centered concept card. */
  sel?: string;
  title: string;
  body: string;
};

// Ordered head-to-toe. The tour runs whichever of these are present on the page,
// in this order, so it always reads coherently regardless of where it's launched.
const STEPS: Step[] = [
  {
    title: "Welcome to Charon",
    body: "Read webnovels and manga with no paywalls — then pay a tiny, fair amount per chapter. Here's the 60-second tour of the parts that aren't obvious.",
  },
  {
    sel: '[data-tour="beta"]',
    title: "This is a testnet beta",
    body: "Everything settles on Arc testnet with test USDC — no real money moves yet. Deposit, read, and withdraw freely to try it.",
  },
  {
    title: "Read first, pay after",
    body: "There's no \"unlock\" wall. You open a chapter and read it; the charge happens when you finish, sized to the chapter's current price minus any discounts you've earned.",
  },
  {
    sel: '[data-tour="price"]',
    title: "Pay once per chapter — forever",
    body: "Each chapter is a few cents, and you only pay once. Re-reads are always free, and your own work (if you're a creator) is never charged.",
  },
  {
    sel: '[data-tour="search"]',
    title: "Find anything fast",
    body: "Press ⌘K (Ctrl-K) anywhere to search series, chapters, and jump to actions.",
  },
  {
    sel: '[data-tour="mode-switch"]',
    title: "One account, two modes",
    body: "Flip between Reading and Studio. Studio is where you publish chapters, set prices, and track earnings — same login.",
  },
  {
    sel: '[data-tour="nav-agent"]',
    title: "An agent that reads for you",
    body: "Give it a taste profile and a weekly budget, and it discovers, judges, and pays for chapters on your behalf — within budget, on its own.",
  },
  {
    sel: '[data-tour="agent-budget"]',
    title: "You set the weekly cap",
    body: "The agent never spends past this. At the end of each week it stops, and anything unspent comes back to you.",
  },
  {
    sel: '[data-tour="agent-wallet"]',
    title: "The agent has its own on-chain wallet",
    body: "Each week it's funded with real test USDC on Arc — you can scan the address on arcscan and watch it spend. Unspent funds are returned automatically.",
  },
  {
    sel: '[data-tour="agent-run"]',
    title: "Run it on demand",
    body: "Hit Run now to watch a reading run happen live in the activity feed — or let the scheduled fleet run handle it.",
  },
  {
    sel: '[data-tour="wallet-deposit"]',
    title: "Deposit once, read for ages",
    body: "Top up your balance with test USDC. Deposits are verified on-chain (on Arc) before they credit — the amount is read from the chain, never trusted from the page.",
  },
  {
    sel: '[data-tour="wallet-balance"]',
    title: "Your balance is the fuel",
    body: "Reading draws from this. When it runs low you'll be nudged to top up; you're never charged below your set per-session cap.",
  },
  {
    sel: '[data-tour="reader-tabs"]',
    title: "Your reading surfaces",
    body: "Discover new series, manage your Library, run your Agent, and handle your Wallet — all from here.",
  },
  {
    title: "Creators earn every chapter",
    body: "Reads settle to the author as escrow that clears after a week, then they withdraw real USDC (or off-ramp to a bank). A creator with no account yet still earns — they just claim it later.",
  },
  {
    title: "That's the tour",
    body: "Poke around — read a chapter, deposit some test USDC, or set up your agent. You can reopen this anytime from the compass button.",
  },
];

export function Tour() {
  const [open, setOpen] = useState(false);
  const [steps, setSteps] = useState<Step[]>([]);
  const [i, setI] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);

  const start = useCallback(() => {
    // Keep concept cards (no sel) + anchored steps whose target is on this page.
    const present = STEPS.filter((s) => !s.sel || document.querySelector(s.sel));
    setSteps(present);
    setI(0);
    setOpen(true);
  }, []);

  const close = useCallback(() => setOpen(false), []);

  const step = steps[i];

  // Position the spotlight over the current step's target (if any). Recomputed on
  // step change, scroll, and resize so it tracks the element.
  useLayoutEffect(() => {
    if (!open || !step) return;
    if (!step.sel) {
      setRect(null);
      return;
    }
    const el = document.querySelector(step.sel);
    if (!el) {
      setRect(null);
      return;
    }
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    const measure = () => setRect(el.getBoundingClientRect());
    measure();
    window.addEventListener("scroll", measure, true);
    window.addEventListener("resize", measure);
    return () => {
      window.removeEventListener("scroll", measure, true);
      window.removeEventListener("resize", measure);
    };
  }, [open, step]);

  // Keyboard: Esc closes, arrows navigate.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      else if (e.key === "ArrowRight") setI((n) => Math.min(n + 1, steps.length - 1));
      else if (e.key === "ArrowLeft") setI((n) => Math.max(n - 1, 0));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, steps.length, close]);

  // ── Floating launcher (always visible when the tour is closed) ──
  if (!open) {
    return (
      <button
        onClick={start}
        aria-label="Take a tour"
        className="fixed bottom-5 right-5 z-50 inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-bg)_85%,transparent)] px-4 py-2.5 text-utility font-medium text-[var(--color-muted)] shadow-lg backdrop-blur transition-colors hover:border-[var(--color-gold)] hover:text-[var(--color-ink)]"
      >
        <Compass size={16} strokeWidth={1.8} className="text-[var(--color-gold)]" />
        Tour
      </button>
    );
  }

  if (!step) return null;
  const last = i === steps.length - 1;

  // Card placement: under the target if there's room, otherwise above; centered
  // when the step has no anchor.
  const card = cardPosition(rect);

  return (
    <div className="fixed inset-0 z-[100]">
      {/* Interaction blocker. Clicking the dim area does nothing (explicit buttons only). */}
      <div className="absolute inset-0" onClick={(e) => e.stopPropagation()} />

      {/* Spotlight or full dim */}
      {rect ? (
        <div
          className="pointer-events-none fixed rounded-lg"
          style={{
            top: rect.top - 6,
            left: rect.left - 6,
            width: rect.width + 12,
            height: rect.height + 12,
            boxShadow: "0 0 0 9999px rgba(0,0,0,0.66)",
            outline: "2px solid var(--color-gold)",
            outlineOffset: 2,
          }}
        />
      ) : (
        <div className="absolute inset-0 bg-black/70" />
      )}

      {/* Tooltip / concept card */}
      <div
        className="fixed w-[min(22rem,calc(100vw-2rem))] border border-[var(--color-gold)] bg-[var(--color-bg)] p-5 shadow-2xl"
        style={card}
      >
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-display text-lg font-semibold text-[var(--color-ink)]">{step.title}</h3>
          <button onClick={close} aria-label="Close tour" className="text-[var(--color-muted)] transition-colors hover:text-[var(--color-ink)]">
            <X size={16} />
          </button>
        </div>
        <p className="mt-2 text-sm leading-relaxed text-[var(--color-muted)]">{step.body}</p>

        <div className="mt-5 flex items-center justify-between">
          <span className="tabular text-utility text-[var(--color-muted)]">
            {i + 1} / {steps.length}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setI((n) => Math.max(n - 1, 0))}
              disabled={i === 0}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[var(--color-border)] text-[var(--color-muted)] transition-colors hover:border-[var(--color-gold)] hover:text-[var(--color-ink)] disabled:opacity-40"
              aria-label="Previous"
            >
              <ChevronLeft size={15} />
            </button>
            {last ? (
              <button onClick={close} className="btn-coin px-4 py-1.5 text-utility">
                Done
              </button>
            ) : (
              <button
                onClick={() => setI((n) => Math.min(n + 1, steps.length - 1))}
                className="inline-flex items-center gap-1 rounded-full bg-[var(--color-gold)] px-3 py-1.5 text-utility font-semibold text-black"
                aria-label="Next"
              >
                Next <ChevronRight size={15} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Choose where to float the card: below the target, above it, or centered. */
function cardPosition(rect: DOMRect | null): React.CSSProperties {
  if (!rect) {
    return { top: "50%", left: "50%", transform: "translate(-50%, -50%)" };
  }
  const margin = 14;
  const cardW = Math.min(352, window.innerWidth - 32);
  const below = rect.bottom + margin;
  const roomBelow = window.innerHeight - rect.bottom > 240;
  const left = Math.min(Math.max(rect.left, 16), window.innerWidth - cardW - 16);
  return roomBelow
    ? { top: below, left }
    : { top: Math.max(16, rect.top - margin), left, transform: "translateY(-100%)" };
}
