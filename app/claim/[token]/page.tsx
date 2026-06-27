"use client";

import { use, useCallback, useEffect, useState } from "react";

interface ClaimInfo {
  creator: {
    id: string;
    name: string | null;
    balance_usd: number;
    claimed: boolean;
    circle_wallet_address: string | null;
    has_email: boolean;
  };
  tips: { amount_usd: number; url: string; platform: string | null; status: string; created_at: string }[];
}

export default function ClaimPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [info, setInfo] = useState<ClaimInfo | null>(null);
  const [address, setAddress] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ amount: number; txHash?: string } | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    const r = await fetch(`/api/claim?token=${token}`);
    const j = await r.json();
    if (r.ok) setInfo(j);
    else setErr(j.error);
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  async function claim() {
    setErr(null);
    setBusy(true);
    try {
      const r = await fetch("/api/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, destinationAddress: address, email }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      setDone({ amount: j.amount, txHash: j.txHash });
      await load();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (err && !info) return <p className="pt-10 text-center text-[var(--color-muted)]">{err}</p>;
  if (!info) return <p className="pt-10 text-center text-[var(--color-muted)]">Loading…</p>;

  const { creator, tips } = info;

  return (
    <div className="mx-auto max-w-lg space-y-6 pt-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold">
          You have <span className="text-[var(--color-gold)]">${Number(creator.balance_usd).toFixed(2)}</span> waiting
        </h1>
        <p className="mt-2 text-sm text-[var(--color-muted)]">
          {creator.name ? `${creator.name}, readers ` : "Readers "}
          sent you tips for your work via Charon. Claim them to any wallet — no signup required.
        </p>
      </div>

      {creator.claimed || done ? (
        <div className="rounded-2xl border border-[var(--color-accent-2)] bg-[var(--color-surface)] p-6 text-center">
          <div className="text-2xl">🎉</div>
          <p className="mt-2 font-medium">
            {done ? `Claimed $${done.amount.toFixed(2)}!` : "These tips have been claimed."}
          </p>
          {done?.txHash && (
            <a
              className="mt-2 inline-block text-sm text-[var(--color-accent)]"
              href={`https://testnet.arcscan.app/tx/${done.txHash}`}
              target="_blank"
              rel="noreferrer"
            >
              View settlement on Arc →
            </a>
          )}
        </div>
      ) : (
        <div className="space-y-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
          <div>
            <label className="mb-1 block text-sm text-[var(--color-muted)]">Your wallet address (USDC on Arc)</label>
            <input
              className="charon-input font-mono"
              placeholder="0x…"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
            {creator.circle_wallet_address && (
              <button
                onClick={() => setAddress(creator.circle_wallet_address!)}
                className="mt-1 text-xs text-[var(--color-accent)]"
              >
                Use my Charon-managed wallet ({creator.circle_wallet_address.slice(0, 10)}…)
              </button>
            )}
          </div>
          {creator.has_email && (
            <div>
              <label className="mb-1 block text-sm text-[var(--color-muted)]">
                Confirm the email this link was sent to
              </label>
              <input
                className="charon-input"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          )}
          <button
            onClick={claim}
            disabled={busy || !address}
            className="w-full rounded-lg bg-[var(--color-gold)] px-4 py-2.5 font-medium text-black disabled:opacity-50"
          >
            {busy ? "Settling…" : `Claim $${Number(creator.balance_usd).toFixed(2)}`}
          </button>
          {err && <p className="text-sm text-red-400">{err}</p>}
        </div>
      )}

      <div>
        <h3 className="mb-2 text-sm font-semibold text-[var(--color-muted)]">Tips received</h3>
        <div className="space-y-1 text-sm">
          {tips.map((t, i) => (
            <div key={i} className="flex items-center justify-between rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2">
              <span className="max-w-[280px] truncate text-[var(--color-muted)]">{t.url}</span>
              <span className="font-medium">${Number(t.amount_usd).toFixed(2)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
