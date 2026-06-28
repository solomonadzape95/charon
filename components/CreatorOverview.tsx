"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Upload, ArrowUpRight, Plus } from "lucide-react";
import { supabaseAnon } from "@/lib/supabase";
import { coverFor } from "@/lib/covers";

interface Earnings {
  creator: { id: string; name: string | null; balance_usd: number; total_earned_usdc: number; wallet_address: string | null };
  series: { id: string; title: string; status: string }[];
  payments: { id: string; amount: number; chapter: string | null; tx: string | null; created_at: string }[];
}
interface Analytics {
  series: { id: string; title: string; followers: number; chapters: { reads: number; completion: number; earned: number }[] }[];
}

const ARC_EXPLORER = "https://testnet.arcscan.app";
const DAY = 86_400_000;

function sumSince(payments: Earnings["payments"], sinceMs: number): number {
  const cut = Date.now() - sinceMs;
  return payments.filter((p) => +new Date(p.created_at) >= cut).reduce((s, p) => s + p.amount, 0);
}

/** The creator's studio — earnings, live settlements and series — shown inside
 *  the unified dashboard when the account is also a creator. */
export function CreatorOverview({ creatorId }: { creatorId: string }) {
  const router = useRouter();
  const [data, setData] = useState<Earnings | null>(null);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [pulse, setPulse] = useState(false);
  const [creating, setCreating] = useState(false);
  const [sform, setSform] = useState({ title: "", genre: "", description: "" });
  const [busy, setBusy] = useState(false);
  const balRef = useRef(0);

  const load = useCallback(async (id: string) => {
    const [eRes, aRes] = await Promise.all([
      fetch(`/api/creator/earnings?creatorId=${id}`),
      fetch(`/api/creator/analytics?creatorId=${id}`),
    ]);
    if (!eRes.ok) return;
    const d = (await eRes.json()) as Earnings;
    if (d.creator.balance_usd !== balRef.current) {
      balRef.current = d.creator.balance_usd;
      setPulse(true);
      setTimeout(() => setPulse(false), 1200);
    }
    setData(d);
    if (aRes.ok) setAnalytics(await aRes.json());
  }, []);

  useEffect(() => {
    load(creatorId);
    const ch = supabaseAnon()
      .channel(`creator-${creatorId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "payments", filter: `creator_id=eq.${creatorId}` }, () => load(creatorId))
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "creators", filter: `id=eq.${creatorId}` }, () => load(creatorId))
      .subscribe();
    return () => {
      supabaseAnon().removeChannel(ch);
    };
  }, [load, creatorId]);

  async function createSeries(e: React.FormEvent) {
    e.preventDefault();
    if (!data) return;
    setBusy(true);
    try {
      const res = await fetch("/api/series", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ creatorId, ...sform }),
      });
      const d = await res.json();
      if (d.series) {
        setSform({ title: "", genre: "", description: "" });
        setCreating(false);
        router.push(`/creator/${d.series.id}`);
      }
    } finally {
      setBusy(false);
    }
  }

  if (!data) return null;

  const today = sumSince(data.payments, DAY);
  const week = sumSince(data.payments, 7 * DAY);
  const month = sumSince(data.payments, 30 * DAY);
  const statsBySeries = new Map(analytics?.series.map((s) => [s.id, s]) ?? []);

  return (
    <div className="space-y-10">
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-[var(--color-border)]" />
        <span className="text-utility text-[var(--color-gold)]">Creator studio</span>
        <div className="h-px flex-1 bg-[var(--color-border)]" />
      </div>

      {/* Earnings overview + withdraw */}
      <section className="grid gap-px border border-[var(--color-border)] bg-[var(--color-border)] lg:grid-cols-[1.4fr_1fr]">
        <div className="bg-[var(--color-surface)] p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-utility text-[var(--color-muted)]">Claimable balance · live</p>
              <p className={`font-display text-5xl font-bold transition-colors ${pulse ? "text-[var(--color-accent-2)]" : "text-coin"}`}>
                ${data.creator.balance_usd.toFixed(2)}
              </p>
              <p className="mt-1 text-sm text-[var(--color-muted)]">${data.creator.total_earned_usdc.toFixed(2)} earned all-time</p>
            </div>
            <Link href="/creator/withdraw" className="btn-coin shrink-0">
              Withdraw
            </Link>
          </div>
          <Sparkline payments={data.payments} />
        </div>

        <div className="grid grid-cols-3 bg-[var(--color-surface)]">
          <Metric label="Today" value={today} />
          <Metric label="This week" value={week} bordered />
          <Metric label="This month" value={month} />
        </div>
      </section>

      {/* Live activity feed */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-accent-2)] pulse-dot" />
          <h2 className="font-display text-2xl font-semibold">Live activity</h2>
        </div>
        {data.payments.length === 0 ? (
          <p className="text-sm text-[var(--color-muted)]">No settlements yet — share your series to start earning.</p>
        ) : (
          <ul className="divide-y divide-[var(--color-border)] border border-[var(--color-border)]">
            {data.payments.slice(0, 5).map((p) => (
              <li key={p.id} className="flex items-center justify-between bg-[var(--color-surface)] px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm">
                    A reader just finished <span className="font-medium">{p.chapter ?? "a chapter"}</span>.
                  </p>
                  <p className="text-utility text-[var(--color-muted)]">{new Date(p.created_at).toLocaleTimeString()}</p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="tabular text-sm font-semibold text-[var(--color-gold)]">+${p.amount.toFixed(2)}</span>
                  {p.tx && (
                    <a href={`${ARC_EXPLORER}/tx/${p.tx}`} target="_blank" rel="noreferrer" className="text-xs text-[var(--color-muted)] underline">
                      tx ↗
                    </a>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Series cards */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-2xl font-semibold">Your series</h2>
          <button onClick={() => setCreating((c) => !c)} className="btn-outline">
            <Plus size={15} /> New series
          </button>
        </div>

        {creating && (
          <form onSubmit={createSeries} className="grid gap-3 border border-[var(--color-border)] bg-[var(--color-surface)] p-5 sm:grid-cols-2">
            <input required placeholder="Title" value={sform.title} onChange={(e) => setSform({ ...sform, title: e.target.value })} className="charon-input" />
            <input placeholder="Genre (fantasy, litrpg, manhwa…)" value={sform.genre} onChange={(e) => setSform({ ...sform, genre: e.target.value })} className="charon-input" />
            <textarea placeholder="Description" value={sform.description} onChange={(e) => setSform({ ...sform, description: e.target.value })} className="charon-input h-20 resize-none sm:col-span-2" />
            <div className="sm:col-span-2">
              <button disabled={busy} className="btn-coin">
                {busy ? "Creating…" : "Create series"}
              </button>
            </div>
          </form>
        )}

        {data.series.length === 0 ? (
          <p className="text-sm text-[var(--color-muted)]">No series yet — create one to start.</p>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2">
            {data.series.map((s) => {
              const a = statsBySeries.get(s.id);
              const chapters = a?.chapters.length ?? 0;
              const earned = a?.chapters.reduce((sum, c) => sum + c.earned, 0) ?? 0;
              const avgCompletion = a && a.chapters.length ? a.chapters.reduce((sum, c) => sum + c.completion, 0) / a.chapters.length : 0;
              return (
                <div key={s.id} className="flex gap-5 border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={coverFor(s.id)} alt="" className="h-44 w-32 shrink-0 object-cover grayscale-[0.15]" />
                  <div className="flex min-w-0 flex-1 flex-col">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-utility text-[var(--color-muted)]">{s.status}</span>
                      <span className="tabular text-sm font-semibold text-[var(--color-gold)]">${earned.toFixed(2)}</span>
                    </div>
                    <Link href={`/creator/${s.id}`} className="font-display mt-1 text-xl font-semibold leading-tight hover:text-[var(--color-gold)]">
                      {s.title}
                    </Link>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--color-muted)]">
                      <span>{a?.followers ?? 0} readers</span>
                      <span>{chapters} chapters</span>
                      {avgCompletion > 0 && <span>{Math.round(avgCompletion * 100)}% completion</span>}
                    </div>
                    <div className="mt-auto flex gap-3 pt-3 text-utility">
                      <Link href={`/creator/${s.id}/upload`} className="inline-flex items-center gap-1 text-[var(--color-gold)]">
                        <Upload size={13} /> Upload
                      </Link>
                      <Link href={`/creator/${s.id}`} className="inline-flex items-center gap-1 text-[var(--color-muted)] hover:text-[var(--color-ink)]">
                        Manage <ArrowUpRight size={13} />
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

function Metric({ label, value, bordered }: { label: string; value: number; bordered?: boolean }) {
  return (
    <div className={`px-5 py-6 ${bordered ? "border-x border-[var(--color-border)]" : ""}`}>
      <p className="text-utility text-[var(--color-muted)]">{label}</p>
      <p className="tabular mt-2 text-2xl font-semibold">${value.toFixed(2)}</p>
    </div>
  );
}

function Sparkline({ payments }: { payments: Earnings["payments"] }) {
  const buckets = new Array(7).fill(0);
  const start = Date.now() - 6 * DAY;
  for (const p of payments) {
    const idx = Math.floor((+new Date(p.created_at) - start) / DAY);
    if (idx >= 0 && idx < 7) buckets[idx] += p.amount;
  }
  const max = Math.max(...buckets, 0.01);
  const W = 280;
  const H = 56;
  const step = W / 6;
  const pts = buckets.map((v, i) => `${i * step},${H - (v / max) * (H - 6) - 3}`).join(" ");
  return (
    <div className="mt-6">
      <p className="mb-2 text-utility text-[var(--color-muted)]">Last 7 days</p>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-14 w-full max-w-[280px]" preserveAspectRatio="none">
        <polyline points={pts} fill="none" stroke="var(--color-gold)" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
        {buckets.map((v, i) => (
          <circle key={i} cx={i * step} cy={H - (v / max) * (H - 6) - 3} r="2" fill="var(--color-gold)" />
        ))}
      </svg>
    </div>
  );
}
