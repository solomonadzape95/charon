"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AuthForm } from "@/components/AuthForm";

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
  chapter: string | null;
  series: string | null;
}

interface Budget {
  lowBalance: boolean;
  suggestedTopup: number;
  topupMessage: string;
  modeSwitches: { seriesId: string; seriesTitle: string; reasoning: string }[];
  pattern: { avgChaptersPerWeek: number; daysRemainingAtPace: number };
}

const LS_KEY = "charon_user_id";

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [budget, setBudget] = useState<Budget | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async (id: string) => {
    const res = await fetch(`/api/me/sessions?userId=${id}`);
    if (!res.ok) {
      localStorage.removeItem(LS_KEY);
      setUser(null);
      return;
    }
    const data = await res.json();
    setUser(data.user);
    setSessions(data.sessions ?? []);
    fetch(`/api/me/budget?userId=${id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((b) => b && setBudget(b))
      .catch(() => {});
  }, []);

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
    const id = localStorage.getItem(LS_KEY);
    if (id) load(id);
  }, [load]);

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

  if (!user) {
    return (
      <div className="grid min-h-[calc(100vh-4.5rem)] place-items-center px-6 py-16">
        <div className="fade-up">
          <AuthForm role="reader" onAuthed={(id) => load(id)} />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-6 py-12">
      <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-utility text-[var(--color-muted)]">Balance</p>
            <p className="text-4xl font-bold text-[var(--color-gold)]">
              ${Number(user.balance_usd).toFixed(2)}
            </p>
            <p className="mt-1 text-xs text-[var(--color-muted)]">{user.email}</p>
          </div>
          <div className="flex gap-2">
            {[1, 3, 5].map((a) => (
              <button
                key={a}
                disabled={busy}
                onClick={() => deposit(a)}
                className="rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm font-medium transition-colors hover:bg-[var(--color-surface-2)] disabled:opacity-50"
              >
                + ${a}
              </button>
            ))}
          </div>
        </div>
      </section>

      {budget && (budget.lowBalance || budget.modeSwitches.length > 0) && (
        <section className="space-y-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
          <div className="flex items-center gap-2 text-xs text-[var(--color-muted)]">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-accent-2)] pulse-dot" />
            Budget agent
          </div>
          {budget.lowBalance && (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm">{budget.topupMessage}</p>
              <button
                disabled={busy}
                onClick={() => deposit(budget.suggestedTopup)}
                className="rounded-lg bg-[var(--color-gold)] px-4 py-2 text-sm font-semibold text-black disabled:opacity-50"
              >
                Top up ${budget.suggestedTopup.toFixed(2)}
              </button>
            </div>
          )}
          {budget.modeSwitches.map((m) => (
            <div key={m.seriesId} className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--color-border)] pt-3">
              <p className="text-sm text-[var(--color-muted)]">{m.reasoning}</p>
              <button
                onClick={() => enablePreRelease(m.seriesId)}
                className="rounded-lg border border-[var(--color-gold)] px-3 py-1.5 text-sm font-medium text-[var(--color-gold)]"
              >
                Enable pre-release
              </button>
            </div>
          ))}
        </section>
      )}

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Recent sessions</h2>
          <Link href="/read" className="text-sm text-[var(--color-gold)]">
            Browse stories →
          </Link>
        </div>
        {sessions.length === 0 ? (
          <p className="text-sm text-[var(--color-muted)]">
            No sessions yet. <Link href="/read" className="text-[var(--color-gold)]">Start reading →</Link>
          </p>
        ) : (
          <ul className="space-y-2">
            {sessions.map((s) => (
              <li
                key={s.id}
                className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    {s.series ? `${s.series} · ` : ""}
                    {s.chapter ?? "Chapter"}
                  </span>
                  <span className="text-sm font-semibold text-[var(--color-gold)]">
                    {s.amount != null ? `$${Number(s.amount).toFixed(2)}` : "—"}
                  </span>
                </div>
                {s.reasoning && (
                  <p className="mt-1 text-xs text-[var(--color-muted)]">{s.reasoning}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
