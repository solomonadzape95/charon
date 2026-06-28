"use client";

import { useEffect, useState } from "react";
import { Users, PenLine, BookOpen, Coins, AlertTriangle, Wallet } from "lucide-react";

interface Overview {
  counts: { users: number; creators: number; claimedCreators: number; unclaimedCreators: number; series: number; chapters: number };
  money: {
    totalSettled: number;
    settledToday: number;
    settledWeek: number;
    platformFee: number;
    escrowHeld: number;
    lifetimeEarned: number;
    totalDeposits: number;
    paymentsSettled: number;
    paymentsFailed: number;
    paymentsPending: number;
  };
  recentPayments: { id: string; amount: number; status: string; created_at: string }[];
  recentSessions: { amount: number; reasoning: string | null; created_at: string }[];
}

export default function AdminOverview() {
  const [d, setD] = useState<Overview | null>(null);

  useEffect(() => {
    fetch("/api/admin/overview").then((r) => r.json()).then(setD).catch(() => {});
  }, []);

  if (!d) return <p className="text-[var(--color-muted)]">Loading…</p>;

  return (
    <div className="space-y-10">
      <h1 className="font-display display-md font-semibold">Overview</h1>

      {/* Money */}
      <section className="grid grid-cols-2 gap-px border border-[var(--color-border)] bg-[var(--color-border)] sm:grid-cols-4">
        <Money icon={Coins} label="Settled all-time" value={d.money.totalSettled} accent />
        <Money icon={Coins} label="Settled today" value={d.money.settledToday} />
        <Money icon={Coins} label="Settled this week" value={d.money.settledWeek} />
        <Money icon={Wallet} label="Platform fee (≈5%)" value={d.money.platformFee} />
        <Money icon={Wallet} label="Escrow held (unclaimed)" value={d.money.escrowHeld} />
        <Money icon={Coins} label="Lifetime creator earnings" value={d.money.lifetimeEarned} />
        <Money icon={Wallet} label="Total deposits" value={d.money.totalDeposits} />
        <Money icon={AlertTriangle} label="Failed payments" value={d.money.paymentsFailed} count warn={d.money.paymentsFailed > 0} />
      </section>

      {/* Counts */}
      <section className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <Count icon={Users} label="Readers" value={d.counts.users} />
        <Count icon={PenLine} label="Creators" value={d.counts.creators} />
        <Count icon={PenLine} label="Unclaimed" value={d.counts.unclaimedCreators} />
        <Count icon={PenLine} label="Claimed" value={d.counts.claimedCreators} />
        <Count icon={BookOpen} label="Series" value={d.counts.series} />
        <Count icon={BookOpen} label="Chapters" value={d.counts.chapters} />
      </section>

      {/* Activity */}
      <div className="grid gap-8 lg:grid-cols-2">
        <section className="space-y-3">
          <h2 className="font-display text-xl font-semibold">Recent settlements</h2>
          <ul className="divide-y divide-[var(--color-border)] border border-[var(--color-border)]">
            {d.recentPayments.map((p) => (
              <li key={p.id} className="flex items-center justify-between bg-[var(--color-surface)] px-4 py-2.5 text-sm">
                <StatusDot status={p.status} />
                <span className="ml-auto mr-3 text-utility text-[var(--color-muted)]">{new Date(p.created_at).toLocaleTimeString()}</span>
                <span className="tabular font-semibold text-[var(--color-gold)]">${p.amount.toFixed(2)}</span>
              </li>
            ))}
            {!d.recentPayments.length && <li className="px-4 py-3 text-sm text-[var(--color-muted)]">No payments yet.</li>}
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-xl font-semibold">Recent agent sessions</h2>
          <ul className="divide-y divide-[var(--color-border)] border border-[var(--color-border)]">
            {d.recentSessions.map((s, i) => (
              <li key={i} className="bg-[var(--color-surface)] px-4 py-2.5">
                <div className="flex items-center justify-between">
                  <span className="tabular text-sm font-semibold text-[var(--color-gold)]">${s.amount.toFixed(2)}</span>
                  <span className="text-utility text-[var(--color-muted)]">{new Date(s.created_at).toLocaleTimeString()}</span>
                </div>
                {s.reasoning && <p className="mt-1 line-clamp-1 text-xs text-[var(--color-muted)]">{s.reasoning}</p>}
              </li>
            ))}
            {!d.recentSessions.length && <li className="px-4 py-3 text-sm text-[var(--color-muted)]">No sessions yet.</li>}
          </ul>
        </section>
      </div>
    </div>
  );
}

function Money({ icon: Icon, label, value, accent, count, warn }: { icon: typeof Coins; label: string; value: number; accent?: boolean; count?: boolean; warn?: boolean }) {
  return (
    <div className="bg-[var(--color-surface)] p-5">
      <Icon size={16} className={warn ? "text-red-400" : "text-[var(--color-muted)]"} strokeWidth={1.6} />
      <p className={`tabular mt-2 text-2xl font-semibold ${warn ? "text-red-400" : accent ? "text-[var(--color-gold)]" : "text-[var(--color-ink)]"}`}>
        {count ? value : `$${value.toFixed(2)}`}
      </p>
      <p className="text-utility mt-0.5 text-[var(--color-muted)]">{label}</p>
    </div>
  );
}

function Count({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: number }) {
  return (
    <div className="flex items-center gap-3 border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
      <Icon size={18} className="text-[var(--color-gold)]" strokeWidth={1.6} />
      <div>
        <p className="tabular text-xl font-semibold">{value.toLocaleString()}</p>
        <p className="text-utility text-[var(--color-muted)]">{label}</p>
      </div>
    </div>
  );
}

function StatusDot({ status }: { status: string }) {
  const color = status === "settled" ? "var(--color-accent-2)" : status === "failed" ? "#f87171" : "var(--color-muted)";
  return (
    <span className="inline-flex items-center gap-2">
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
      <span className="capitalize text-[var(--color-muted)]">{status}</span>
    </span>
  );
}
