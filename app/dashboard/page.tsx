"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PenLine, PenTool, ArrowRight, Plus, ExternalLink, Check, Clock, RotateCcw, XCircle, BookOpen } from "lucide-react";
import { AccountNav } from "@/components/AccountNav";
import { resolveCreatorId, getCreatorId } from "@/lib/account";
import { setMode } from "@/lib/mode";

interface User {
  id: string;
  email: string | null;
  balance_usd: number;
  session_cap_usd: number;
}

interface SessionRow {
  id: string;
  created_at: string;
  amount: number | null;
  reasoning: string | null;
  value_score: number | null;
  chapterId: string | null;
  chapter: string | null;
  series: string | null;
  status: "paid" | "free" | "processing" | "failed";
  tx: string | null;
  ref: string | null;
  creatorWallet: string | null;
}

const ARC_EXPLORER = "https://testnet.arcscan.app";

interface Budget {
  lowBalance: boolean;
  suggestedTopup: number;
  topupMessage: string;
  modeSwitches: { seriesId: string; seriesTitle: string; reasoning: string }[];
  pattern: { avgChaptersPerWeek: number; daysRemainingAtPace: number };
}

const LS_KEY = "charon_user_id";

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [budget, setBudget] = useState<Budget | null>(null);
  const [busy, setBusy] = useState(false);
  const [creatorId, setCreatorId] = useState<string | null>(null);

  const load = useCallback(
    async (id: string) => {
      const res = await fetch(`/api/me/sessions?userId=${id}`);
      if (!res.ok) {
        localStorage.removeItem(LS_KEY);
        router.replace("/join");
        return;
      }
      const data = await res.json();
      setUser(data.user);
      setSessions(data.sessions ?? []);
      fetch(`/api/me/budget?userId=${id}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((b) => b && setBudget(b))
        .catch(() => {});
    },
    [router],
  );

  async function enablePreRelease(seriesId: string) {
    if (!user) return;
    await fetch("/api/follow", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user.id, seriesId, mode: "pre_release" }),
    });
    setBudget((b) => (b ? { ...b, modeSwitches: b.modeSwitches.filter((m) => m.seriesId !== seriesId) } : b));
  }

  useEffect(() => {
    // The dashboard is the reader surface — make that the active mode.
    setMode("read");
    const id = localStorage.getItem(LS_KEY);
    if (id) {
      load(id);
      setCreatorId(getCreatorId());
      resolveCreatorId().then(setCreatorId);
    } else router.replace("/join");
  }, [load, router]);

  async function deposit(amount: number) {
    if (!user) return;
    setBusy(true);
    try {
      const res = await fetch("/api/deposit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, amountUsd: amount }),
      });
      const data = await res.json();
      if (typeof data.balance === "number") setUser({ ...user, balance_usd: data.balance });
    } finally {
      setBusy(false);
    }
  }

  if (!user)
    return (
      <>
        <AccountNav />
        <div className="mx-auto max-w-5xl space-y-4 px-6 py-10">
          <div className="h-28 animate-pulse bg-[var(--color-surface)]" />
          <div className="h-20 animate-pulse bg-[var(--color-surface)]" />
          <div className="h-40 animate-pulse bg-[var(--color-surface)]" />
        </div>
      </>
    );

  // Unique chapters, not raw sessions — re-reads must not inflate the count.
  const chaptersRead = new Set(sessions.map((s) => s.chapterId).filter(Boolean)).size;
  const seriesRead = new Set(sessions.map((s) => s.series).filter(Boolean)).size;
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const settledThisMonth = sessions
    .filter((s) => s.amount != null && new Date(s.created_at) >= monthStart)
    .reduce((sum, s) => sum + Number(s.amount), 0);
  const streak = readingStreak(sessions.map((s) => s.created_at));

  return (
    <>
      <AccountNav />
      <div className="mx-auto max-w-5xl space-y-8 px-6 py-10">
      <section className="border border-[var(--color-border)] bg-[var(--color-surface)] p-7 sm:p-8">
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="text-utility text-[var(--color-muted)]">Reading balance</p>
            <p className="font-display mt-1 text-6xl font-bold text-coin sm:text-7xl">
              ${Number(user.balance_usd).toFixed(2)}
            </p>
            <p className="mt-2 text-xs text-[var(--color-muted)]">{user.email}</p>
          </div>
          <Link href="/wallet" className="btn-coin">
            <Plus size={15} /> Add funds
          </Link>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-px border border-[var(--color-border)] bg-[var(--color-border)] sm:grid-cols-4">
        <DashStat label="Chapters read" value={`${chaptersRead}`} />
        <DashStat label="Series read" value={`${seriesRead}`} />
        <DashStat label="Settled this month" value={`$${settledThisMonth.toFixed(2)}`} accent />
        <DashStat label="Day streak" value={`${streak}`} />
      </section>

      {budget && (budget.lowBalance || budget.modeSwitches.length > 0) && (
        <section className="space-y-3 border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
          <div className="flex items-center gap-2 text-xs text-[var(--color-muted)]">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-accent-2)] pulse-dot" />
            Budget agent
          </div>
          {budget.lowBalance && (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm">{budget.topupMessage}</p>
              <button disabled={busy} onClick={() => deposit(budget.suggestedTopup)} className="btn-coin disabled:opacity-50">
                Top up ${budget.suggestedTopup.toFixed(2)}
              </button>
            </div>
          )}
          {budget.modeSwitches.map((m) => (
            <div key={m.seriesId} className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--color-border)] pt-3">
              <p className="text-sm text-[var(--color-muted)]">{m.reasoning}</p>
              <button onClick={() => enablePreRelease(m.seriesId)} className="btn-outline">
                Enable pre-release
              </button>
            </div>
          ))}
        </section>
      )}

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-2xl font-semibold">Recent sessions</h2>
          <Link href="/read" className="btn-outline !py-2 !text-[0.72rem]">
            <BookOpen size={13} /> Browse stories
          </Link>
        </div>
        {sessions.length === 0 ? (
          <div className="border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] p-8 text-center">
            <p className="text-sm text-[var(--color-muted)]">No sessions yet — your reading history shows up here.</p>
            <Link href="/read" className="btn-coin mt-4">Start reading</Link>
          </div>
        ) : (
          <ul className="space-y-2">
            {sessions.map((s) => (
              <SessionItem key={s.id} s={s} />
            ))}
          </ul>
        )}
      </section>

      {creatorId ? (
        <section className="flex flex-col items-start gap-4 border border-[color-mix(in_srgb,var(--color-gold)_30%,var(--color-border))] bg-[var(--color-surface)] p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[color-mix(in_srgb,var(--color-gold)_14%,transparent)] text-[var(--color-gold)]">
              <PenTool size={19} strokeWidth={1.6} />
            </span>
            <div>
              <h2 className="font-display text-xl font-semibold">Your creator studio</h2>
              <p className="mt-1 max-w-xl text-sm text-[var(--color-muted)]">
                Earnings, audience and series live in a separate space — switch over to manage your work without ever
                touching your reading balance.
              </p>
            </div>
          </div>
          <Link href="/creator/studio" className="btn-coin shrink-0">
            Open studio <ArrowRight size={15} />
          </Link>
        </section>
      ) : (
        <section className="flex flex-col items-start gap-3 border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
          <div className="flex items-center gap-2 text-[var(--color-gold)]">
            <PenLine size={18} strokeWidth={1.6} />
            <h2 className="font-display text-xl font-semibold text-[var(--color-ink)]">Write on Charon</h2>
          </div>
          <p className="max-w-xl text-sm text-[var(--color-muted)]">
            Publish your series and get paid per chapter, per reader — in real time. Keep 95%, withdraw anytime. Your
            reading account stays exactly as it is.
          </p>
          <Link href="/creator/onboarding" className="btn-coin">
            Become a creator
          </Link>
        </section>
      )}
      </div>
    </>
  );
}

/** One reading session — payment status, amount, and a link to verify on Arc. */
function SessionItem({ s }: { s: SessionRow }) {
  const free = s.status === "free";
  const paid = s.status === "paid";
  const processing = s.status === "processing";
  const failed = s.status === "failed";

  return (
    <li className="border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
      <div className="flex items-center justify-between gap-3">
        <span className="min-w-0 truncate text-sm font-medium">
          {s.series ? `${s.series} · ` : ""}
          {s.chapter ?? "Chapter"}
        </span>
        <div className="flex shrink-0 items-center gap-2">
          {paid && <span className="tabular text-sm font-semibold text-[var(--color-gold)]">${Number(s.amount ?? 0).toFixed(2)}</span>}
          {free && (
            <span className="text-utility inline-flex items-center gap-1 text-[var(--color-accent-2)]">
              <RotateCcw size={12} /> Free
            </span>
          )}
          {processing && (
            <span className="text-utility inline-flex items-center gap-1 text-[var(--color-gold)]">
              <Clock size={12} className="pulse-dot" /> Processing
            </span>
          )}
          {failed && (
            <span className="text-utility inline-flex items-center gap-1 text-red-400">
              <XCircle size={12} /> Failed
            </span>
          )}
        </div>
      </div>
      {s.reasoning && <p className="mt-1 text-xs text-[var(--color-muted)]">{s.reasoning}</p>}

      {/* Verification — link to the on-chain tx when present, otherwise to the
          creator's wallet on Arc (where the batched Gateway settlement lands). */}
      {paid && (() => {
        const href = s.tx ? `${ARC_EXPLORER}/tx/${s.tx}` : s.creatorWallet ? `${ARC_EXPLORER}/address/${s.creatorWallet}` : null;
        return (
          <div className="mt-2 flex items-center gap-2 border-t border-[var(--color-border)] pt-2">
            <Check size={12} className="text-[var(--color-accent-2)]" />
            {href ? (
              <a
                href={href}
                target="_blank"
                rel="noreferrer"
                title={s.tx ? "On-chain transaction on Arc" : "Settled off-chain via Circle Gateway, batched to the creator's wallet on Arc"}
                className="text-utility inline-flex items-center gap-1 text-[var(--color-muted)] transition-colors hover:text-[var(--color-gold)]"
              >
                {s.tx ? "Verify on Arc" : "Gateway settlement"} · {(s.tx ?? s.ref ?? "").slice(0, 8)} <ExternalLink size={11} />
              </a>
            ) : (
              <span className="text-utility text-[var(--color-muted)]">Settled · ref {s.ref ? s.ref.slice(0, 8) : "—"}</span>
            )}
          </div>
        );
      })()}
    </li>
  );
}

function DashStat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="bg-[var(--color-surface)] px-5 py-5">
      <p className="text-utility text-[var(--color-muted)]">{label}</p>
      <p className={`tabular mt-1 text-2xl font-semibold ${accent ? "text-[var(--color-gold)]" : ""}`}>{value}</p>
    </div>
  );
}

/** Consecutive days (ending today or yesterday) with at least one session. */
function readingStreak(dates: string[]): number {
  if (!dates.length) return 0;
  const days = new Set(dates.map((d) => new Date(d).toDateString()));
  let streak = 0;
  const cursor = new Date();
  // Allow the streak to count from today or yesterday.
  if (!days.has(cursor.toDateString())) cursor.setDate(cursor.getDate() - 1);
  while (days.has(cursor.toDateString())) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}
