"use client";

import { useEffect, useState } from "react";

interface Stats {
  chaptersRead: number;
  totalUsdc: number;
  creators: number;
  earningCreators: number;
  readers: number;
  series: number;
  chapters: number;
  topCreators: { name: string | null; slug: string | null; earned: number }[];
  recent: { reasoning: string | null; amount: number; created_at: string }[];
}

function Big({ value, label, accent }: { value: string; label: string; accent?: string }) {
  return (
    <div className="border border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-5">
      <p className={`text-3xl font-bold ${accent ?? ""}`}>{value}</p>
      <p className="mt-1 text-sm text-[var(--color-muted)]">{label}</p>
    </div>
  );
}

export default function StatsPage() {
  const [s, setS] = useState<Stats | null>(null);

  useEffect(() => {
    const tick = () => fetch("/api/stats").then((r) => r.json()).then(setS).catch(() => {});
    tick();
    const t = setInterval(tick, 5000);
    return () => clearInterval(t);
  }, []);

  if (!s) return <p className="text-sm text-[var(--color-muted)]">Loading live stats…</p>;

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-6 py-12">
      <div>
        <h1 className="font-display text-3xl font-semibold">Live on Arc</h1>
        <p className="text-sm text-[var(--color-muted)]">Settled USDC across the platform, updating in real time.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Big value={`$${s.totalUsdc.toFixed(2)}`} label="USDC settled on Arc" accent="text-[var(--color-gold)]" />
        <Big value={`${s.chaptersRead}`} label="Chapters read & paid" />
        <Big value={`${s.earningCreators}`} label="Creators earning" />
        <Big value={`${s.readers}`} label="Readers" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Top earning creators</h2>
          <ul className="space-y-2">
            {s.topCreators.map((c, i) => (
              <li
                key={i}
                className="flex items-center justify-between border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3"
              >
                <span className="text-sm font-medium">{c.name ?? c.slug ?? "Anonymous"}</span>
                <span className="text-sm font-semibold text-[var(--color-gold)]">${c.earned.toFixed(2)}</span>
              </li>
            ))}
            {s.topCreators.length === 0 && (
              <li className="text-sm text-[var(--color-muted)]">No earnings yet.</li>
            )}
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Recent agent settlements</h2>
          <ul className="space-y-2">
            {s.recent.map((r, i) => (
              <li key={i} className="border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-[var(--color-gold)]">${r.amount.toFixed(2)}</span>
                  <span className="text-xs text-[var(--color-muted)]">
                    {new Date(r.created_at).toLocaleTimeString()}
                  </span>
                </div>
                {r.reasoning && <p className="mt-1 text-xs text-[var(--color-muted)]">{r.reasoning}</p>}
              </li>
            ))}
            {s.recent.length === 0 && <li className="text-sm text-[var(--color-muted)]">No sessions yet.</li>}
          </ul>
        </section>
      </div>
    </div>
  );
}
