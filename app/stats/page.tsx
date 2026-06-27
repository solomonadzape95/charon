"use client";

import { useEffect, useState } from "react";

interface Stats {
  totalTips: number;
  totalUsdc: number;
  creators: number;
  readers: number;
  direct: { count: number; usdc: number };
  escrow: { count: number; usdc: number };
  claimed: { count: number; usdc: number };
  claimRate: number;
  paidCreators: number;
  recent: { amount_usd: number; status: string; platform: string | null; url: string; created_at: string }[];
}

function Big({ value, label, accent }: { value: string; label: string; accent?: string }) {
  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-5">
      <div className="text-3xl font-semibold" style={accent ? { color: accent } : undefined}>
        {value}
      </div>
      <div className="mt-1 text-xs uppercase tracking-wide text-[var(--color-muted)]">{label}</div>
    </div>
  );
}

export default function StatsPage() {
  const [s, setS] = useState<Stats | null>(null);

  useEffect(() => {
    const load = () => fetch("/api/stats").then((r) => r.json()).then(setS).catch(() => {});
    load();
    const t = setInterval(load, 5000); // light polling keeps it live during the demo
    return () => clearInterval(t);
  }, []);

  if (!s) return <p className="pt-10 text-center text-[var(--color-muted)]">Loading…</p>;

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-[var(--color-accent-2)] pulse-dot" />
        <h1 className="text-2xl font-semibold">Live stats</h1>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Big value={`$${s.totalUsdc.toFixed(2)}`} label="USDC settled on Arc" accent="var(--color-gold)" />
        <Big value={String(s.totalTips)} label="Tips sent" />
        <Big value={String(s.paidCreators)} label="Creators paid" accent="var(--color-accent-2)" />
        <Big value={`${Math.round(s.claimRate * 100)}%`} label="Escrow claim rate" accent="var(--color-accent)" />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Big value={`${s.direct.count} · $${s.direct.usdc.toFixed(2)}`} label="Routed directly" />
        <Big value={`${s.escrow.count} · $${s.escrow.usdc.toFixed(2)}`} label="Held in escrow" />
        <Big value={`${s.claimed.count} · $${s.claimed.usdc.toFixed(2)}`} label="Claimed" />
      </div>

      <div>
        <h3 className="mb-3 font-semibold">Recent activity</h3>
        {s.recent.length === 0 ? (
          <p className="text-sm text-[var(--color-muted)]">No tips yet.</p>
        ) : (
          <div className="space-y-1 text-sm">
            {s.recent.map((r, i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2"
              >
                <div className="flex items-center gap-2">
                  <span className="text-[var(--color-muted)]">{r.status === "sent" ? "✅" : r.status === "escrowed" ? "📩" : "🎉"}</span>
                  <span className="max-w-[360px] truncate text-[var(--color-muted)]">{r.url}</span>
                </div>
                <span className="font-medium">${Number(r.amount_usd).toFixed(2)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
