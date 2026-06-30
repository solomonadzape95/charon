"use client";

import { useEffect, useState } from "react";
import { Users, PenLine, BookOpen, Coins, AlertTriangle, Wallet, ShieldCheck, ShieldAlert, TrendingUp, Activity, Clock, Gauge, Bot, Trophy } from "lucide-react";

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
  reconciliation: {
    totalDeposits: number;
    readerFloat: number;
    creatorUnpaid: number;
    platformRevenue: number;
    totalWithdrawn: number;
    residual: number;
    balanced: boolean;
  };
  trend: { date: string; settledVolume: number; settledCount: number; deposits: number; newReaders: number }[];
  engagement: {
    totalSessions: number;
    paidReads: number;
    readingHours: number;
    avgCompletion: number;
    activeReaders7d: number;
    avgReaderBalance: number;
    agentsTotal: number;
    agentsActive: number;
    agentWalletFunds: number;
  };
  callerSplit: { humanVolume: number; agentVolume: number; humanCount: number; agentCount: number };
  topCreators: { name: string; slug: string | null; earned: number; escrow: number; withdrawn: number; claimed: boolean }[];
  topSeries: { title: string; followers: number; reads: number }[];
  recentPayments: { id: string; amount: number; status: string; created_at: string }[];
  recentSessions: { amount: number; reasoning: string | null; created_at: string }[];
  recentDeposits: { id: string; amount: number; method: string; tx: string | null; created_at: string }[];
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
        <Money icon={Wallet} label="Platform fee (5%)" value={d.money.platformFee} accent />
        <Money icon={Wallet} label="Escrow held (unclaimed)" value={d.money.escrowHeld} />
        <Money icon={Coins} label="Lifetime creator earnings" value={d.money.lifetimeEarned} />
        <Money icon={Wallet} label="Total deposits" value={d.money.totalDeposits} />
        <Money icon={AlertTriangle} label="Failed payments" value={d.money.paymentsFailed} count warn={d.money.paymentsFailed > 0} />
      </section>

      {/* Treasury reconciliation */}
      <Reconciliation r={d.reconciliation} />

      {/* 14-day trend */}
      <TrendChart data={d.trend} />

      {/* Engagement + human/agent split */}
      <Engagement e={d.engagement} split={d.callerSplit} />

      {/* Leaderboards */}
      <div className="grid gap-8 lg:grid-cols-2">
        <CreatorBoard rows={d.topCreators} />
        <SeriesBoard rows={d.topSeries} />
      </div>

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

      {/* Deposits */}
      <section className="space-y-3">
        <h2 className="font-display text-xl font-semibold">Recent deposits</h2>
        <ul className="divide-y divide-[var(--color-border)] border border-[var(--color-border)]">
          {d.recentDeposits.map((dep) => (
            <li key={dep.id} className="flex items-center justify-between gap-3 bg-[var(--color-surface)] px-4 py-2.5 text-sm">
              <span className="inline-flex items-center gap-2">
                <span className="rounded-full border border-[var(--color-border)] px-2 py-0.5 text-utility capitalize text-[var(--color-muted)]">{dep.method}</span>
                {dep.tx && <span className="tabular text-utility text-[var(--color-muted)]">{dep.tx.slice(0, 8)}…{dep.tx.slice(-6)}</span>}
              </span>
              <span className="ml-auto mr-3 text-utility text-[var(--color-muted)]">{new Date(dep.created_at).toLocaleString()}</span>
              <span className="tabular font-semibold text-[var(--color-accent-2)]">+${dep.amount.toFixed(2)}</span>
            </li>
          ))}
          {!d.recentDeposits.length && <li className="px-4 py-3 text-sm text-[var(--color-muted)]">No deposits yet.</li>}
        </ul>
      </section>
    </div>
  );
}

function Reconciliation({ r }: { r: Overview["reconciliation"] }) {
  const Icon = r.balanced ? ShieldCheck : ShieldAlert;
  const tone = r.balanced ? "var(--color-accent-2)" : "#f87171";
  return (
    <section className="border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
      <div className="flex items-center gap-2">
        <Icon size={18} style={{ color: tone }} strokeWidth={1.6} />
        <h2 className="font-display text-lg font-semibold">Treasury reconciliation</h2>
        <span className="tabular ml-auto text-sm font-semibold" style={{ color: tone }}>
          {r.balanced ? "Balanced" : `Drift $${Math.abs(r.residual).toFixed(6)}`}
        </span>
      </div>
      <p className="mt-1 text-xs text-[var(--color-muted)]">
        deposits = reader float + creator escrow + platform revenue + withdrawn
      </p>
      <div className="mt-4 grid grid-cols-2 gap-px border border-[var(--color-border)] bg-[var(--color-border)] sm:grid-cols-5">
        <ReconCell label="Deposits in" value={r.totalDeposits} />
        <ReconCell label="Reader float" value={r.readerFloat} />
        <ReconCell label="Creator escrow" value={r.creatorUnpaid} />
        <ReconCell label="Platform revenue" value={r.platformRevenue} />
        <ReconCell label="Withdrawn" value={r.totalWithdrawn} />
      </div>
    </section>
  );
}

function ReconCell({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-[var(--color-surface)] p-4">
      <p className="tabular text-lg font-semibold">${value.toFixed(2)}</p>
      <p className="text-utility mt-0.5 text-[var(--color-muted)]">{label}</p>
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

function TrendChart({ data }: { data: Overview["trend"] }) {
  const max = Math.max(0.01, ...data.map((d) => d.settledVolume));
  const totalVol = data.reduce((s, d) => s + d.settledVolume, 0);
  const totalReaders = data.reduce((s, d) => s + d.newReaders, 0);
  return (
    <section className="border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
      <div className="flex items-center gap-2">
        <TrendingUp size={18} className="text-[var(--color-gold)]" strokeWidth={1.6} />
        <h2 className="font-display text-lg font-semibold">Last 14 days</h2>
        <span className="tabular ml-auto text-sm text-[var(--color-muted)]">
          ${totalVol.toFixed(2)} settled · {totalReaders} new readers
        </span>
      </div>
      <div className="mt-5 flex h-32 items-end gap-1.5">
        {data.map((d) => (
          <div key={d.date} className="group relative flex flex-1 flex-col items-center justify-end">
            <span className="pointer-events-none absolute -top-10 z-10 hidden whitespace-nowrap border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1 text-utility text-[var(--color-muted)] group-hover:block">
              {d.date.slice(5)} · ${d.settledVolume.toFixed(2)} · {d.settledCount} pays · +{d.newReaders}
            </span>
            <div
              className="w-full"
              style={{ height: `${Math.max(2, (d.settledVolume / max) * 100)}%`, background: "var(--color-gold)" }}
            />
          </div>
        ))}
      </div>
      <div className="mt-2 flex justify-between text-utility text-[var(--color-muted)]">
        <span>{data[0]?.date.slice(5)}</span>
        <span>{data[data.length - 1]?.date.slice(5)}</span>
      </div>
    </section>
  );
}

function Engagement({ e, split }: { e: Overview["engagement"]; split: Overview["callerSplit"] }) {
  const total = split.humanVolume + split.agentVolume;
  const agentPct = total > 0 ? Math.round((split.agentVolume / total) * 100) : 0;
  return (
    <section className="space-y-5">
      <h2 className="font-display text-xl font-semibold">Engagement</h2>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <Stat icon={BookOpen} label="Paid reads" value={e.paidReads.toLocaleString()} />
        <Stat icon={Activity} label="Sessions" value={e.totalSessions.toLocaleString()} />
        <Stat icon={Clock} label="Reading hours" value={e.readingHours.toLocaleString()} />
        <Stat icon={Gauge} label="Avg completion" value={`${e.avgCompletion}%`} />
        <Stat icon={Users} label="Active (7d)" value={e.activeReaders7d.toLocaleString()} />
        <Stat icon={Wallet} label="Avg balance" value={`$${e.avgReaderBalance.toFixed(2)}`} />
        <Stat icon={Bot} label="Agents active" value={`${e.agentsActive}/${e.agentsTotal}`} />
        <Stat icon={Wallet} label="Agent wallet funds" value={`$${e.agentWalletFunds.toFixed(2)}`} />
      </div>
      <div className="border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
        <div className="flex items-center justify-between text-sm">
          <span className="font-semibold">Settled by humans vs agents</span>
          <span className="tabular text-[var(--color-muted)]">{agentPct}% agent-driven</span>
        </div>
        <div className="mt-3 flex h-3 overflow-hidden border border-[var(--color-border)]">
          <div style={{ width: `${100 - agentPct}%`, background: "var(--color-accent-2)" }} />
          <div style={{ width: `${agentPct}%`, background: "var(--color-gold)" }} />
        </div>
        <div className="mt-2 flex justify-between text-utility text-[var(--color-muted)]">
          <span>Humans ${split.humanVolume.toFixed(2)} · {split.humanCount} pays</span>
          <span>Agents ${split.agentVolume.toFixed(2)} · {split.agentCount} pays</span>
        </div>
      </div>
    </section>
  );
}

function Stat({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: string }) {
  return (
    <div className="border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
      <Icon size={16} className="text-[var(--color-gold)]" strokeWidth={1.6} />
      <p className="tabular mt-2 text-xl font-semibold">{value}</p>
      <p className="text-utility mt-0.5 text-[var(--color-muted)]">{label}</p>
    </div>
  );
}

function CreatorBoard({ rows }: { rows: Overview["topCreators"] }) {
  return (
    <section className="space-y-3">
      <h2 className="font-display flex items-center gap-2 text-xl font-semibold">
        <Trophy size={18} className="text-[var(--color-gold)]" strokeWidth={1.6} /> Top creators
      </h2>
      <ul className="divide-y divide-[var(--color-border)] border border-[var(--color-border)]">
        {rows.map((c, i) => (
          <li key={i} className="flex items-center gap-3 bg-[var(--color-surface)] px-4 py-2.5 text-sm">
            <span className="tabular w-5 text-[var(--color-muted)]">{i + 1}</span>
            <span className="truncate">
              {c.name}
              {!c.claimed && <span className="ml-2 text-utility text-[var(--color-muted)]">unclaimed</span>}
            </span>
            <span className="tabular ml-auto font-semibold text-[var(--color-gold)]">${c.earned.toFixed(2)}</span>
          </li>
        ))}
        {!rows.length && <li className="px-4 py-3 text-sm text-[var(--color-muted)]">No earnings yet.</li>}
      </ul>
    </section>
  );
}

function SeriesBoard({ rows }: { rows: Overview["topSeries"] }) {
  return (
    <section className="space-y-3">
      <h2 className="font-display flex items-center gap-2 text-xl font-semibold">
        <BookOpen size={18} className="text-[var(--color-gold)]" strokeWidth={1.6} /> Top series
      </h2>
      <ul className="divide-y divide-[var(--color-border)] border border-[var(--color-border)]">
        {rows.map((s, i) => (
          <li key={i} className="flex items-center gap-3 bg-[var(--color-surface)] px-4 py-2.5 text-sm">
            <span className="tabular w-5 text-[var(--color-muted)]">{i + 1}</span>
            <span className="truncate">{s.title}</span>
            <span className="tabular ml-auto text-utility text-[var(--color-muted)]">{s.followers} followers</span>
            <span className="tabular w-20 text-right font-semibold text-[var(--color-gold)]">{s.reads.toLocaleString()} reads</span>
          </li>
        ))}
        {!rows.length && <li className="px-4 py-3 text-sm text-[var(--color-muted)]">No reads yet.</li>}
      </ul>
    </section>
  );
}
