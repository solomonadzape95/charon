"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

interface Creator {
  id: string;
  name: string | null;
  email: string | null;
  wallet_address: string | null;
  balance_usd: number;
  total_earned_usdc: number;
}
interface Series {
  id: string;
  title: string;
  genre: string | null;
  status: string;
}

const LS_KEY = "charon_creator_id";

export default function CreatorHub() {
  const [creator, setCreator] = useState<Creator | null>(null);
  const [series, setSeries] = useState<Series[]>([]);
  const [form, setForm] = useState({ email: "", name: "", wallet: "" });
  const [sform, setSform] = useState({ title: "", genre: "", description: "" });
  const [busy, setBusy] = useState(false);

  const load = useCallback(async (id: string) => {
    const [c, s] = await Promise.all([
      fetch(`/api/creators?id=${id}`).then((r) => (r.ok ? r.json() : null)),
      fetch(`/api/series?creatorId=${id}`).then((r) => r.json()),
    ]);
    if (!c?.creator) {
      localStorage.removeItem(LS_KEY);
      setCreator(null);
      return;
    }
    setCreator(c.creator);
    setSeries(s.series ?? []);
  }, []);

  useEffect(() => {
    const id = localStorage.getItem(LS_KEY);
    if (id) load(id);
  }, [load]);

  async function signup(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch("/api/creators", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email, name: form.name, walletAddress: form.wallet || undefined }),
      });
      const data = await res.json();
      if (data.creator) {
        localStorage.setItem(LS_KEY, data.creator.id);
        await load(data.creator.id);
      }
    } finally {
      setBusy(false);
    }
  }

  async function createSeries(e: React.FormEvent) {
    e.preventDefault();
    if (!creator) return;
    setBusy(true);
    try {
      const res = await fetch("/api/series", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ creatorId: creator.id, ...sform }),
      });
      const data = await res.json();
      if (data.series) {
        setSeries([data.series, ...series]);
        setSform({ title: "", genre: "", description: "" });
      }
    } finally {
      setBusy(false);
    }
  }

  if (!creator) {
    return (
      <div className="mx-auto max-w-md space-y-6 pt-10">
        <h1 className="text-2xl font-bold">Earn per chapter, per reader</h1>
        <p className="text-sm text-[var(--color-muted)]">
          Sign up with email — no crypto knowledge required. Upload your series; the
          agent prices each chapter and pays you directly as readers finish them.
        </p>
        <form onSubmit={signup} className="space-y-3">
          <input
            type="email"
            required
            placeholder="you@email.com"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm"
          />
          <input
            placeholder="Pen name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm"
          />
          <input
            placeholder="Payout wallet address (optional — 0x… on Arc)"
            value={form.wallet}
            onChange={(e) => setForm({ ...form, wallet: e.target.value })}
            className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm"
          />
          <button
            disabled={busy}
            className="w-full rounded-lg bg-[var(--color-gold)] px-4 py-2.5 text-sm font-semibold text-black disabled:opacity-50"
          >
            Create creator account
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <section className="flex items-end justify-between rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
        <div>
          <p className="text-sm text-[var(--color-muted)]">Claimable earnings</p>
          <p className="text-4xl font-bold text-[var(--color-gold)]">${Number(creator.balance_usd).toFixed(2)}</p>
          <p className="mt-1 text-xs text-[var(--color-muted)]">
            ${Number(creator.total_earned_usdc).toFixed(2)} earned all-time · {creator.name ?? creator.email}
          </p>
        </div>
        <Link href="/creator/dashboard" className="text-sm text-[var(--color-gold)]">
          Dashboard →
        </Link>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Your series</h2>
          {series.length === 0 ? (
            <p className="text-sm text-[var(--color-muted)]">No series yet — create one to start.</p>
          ) : (
            <ul className="space-y-2">
              {series.map((s) => (
                <li
                  key={s.id}
                  className="flex items-center justify-between rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-medium">{s.title}</p>
                    <p className="text-xs text-[var(--color-muted)]">{s.genre ?? "—"} · {s.status}</p>
                  </div>
                  <div className="flex gap-3 text-sm">
                    <Link href={`/creator/${s.id}/upload`} className="text-[var(--color-gold)]">
                      Upload
                    </Link>
                    <Link href={`/series/${s.id}`} className="text-[var(--color-muted)]">
                      View
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <form onSubmit={createSeries} className="space-y-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
          <h2 className="text-lg font-semibold">New series</h2>
          <input
            required
            placeholder="Title"
            value={sform.title}
            onChange={(e) => setSform({ ...sform, title: e.target.value })}
            className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm"
          />
          <input
            placeholder="Genre (fantasy, litrpg, manhwa…)"
            value={sform.genre}
            onChange={(e) => setSform({ ...sform, genre: e.target.value })}
            className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm"
          />
          <textarea
            placeholder="Description"
            value={sform.description}
            onChange={(e) => setSform({ ...sform, description: e.target.value })}
            className="h-20 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm"
          />
          <button
            disabled={busy}
            className="w-full rounded-lg bg-[var(--color-gold)] px-4 py-2 text-sm font-semibold text-black disabled:opacity-50"
          >
            Create series
          </button>
        </form>
      </section>
    </div>
  );
}
