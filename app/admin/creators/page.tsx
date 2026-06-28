"use client";

import { useCallback, useEffect, useState } from "react";
import { Search, Copy, Check } from "lucide-react";

interface Row {
  id: string;
  name: string | null;
  email: string | null;
  slug: string | null;
  wallet_address: string | null;
  balance_usd: number;
  total_earned_usdc: number;
  claimed: boolean;
  claim_token: string;
  created_at: string;
}

const FILTERS = [
  { id: "", label: "All" },
  { id: "unclaimed", label: "Unclaimed" },
  { id: "claimed", label: "Claimed" },
];

export default function AdminCreators() {
  const [rows, setRows] = useState<Row[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("");
  const [copied, setCopied] = useState<string | null>(null);

  const load = useCallback(() => {
    fetch(`/api/admin/creators?search=${encodeURIComponent(search)}&filter=${filter}`)
      .then((r) => r.json())
      .then((d) => setRows(d.creators ?? []))
      .catch(() => {});
  }, [search, filter]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  async function act(id: string, action: string, extra?: Record<string, unknown>) {
    const res = await fetch("/api/admin/creators", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action, ...extra }),
    });
    const d = await res.json();
    if (!res.ok) {
      alert(d.error ?? "Failed");
      return;
    }
    load();
  }

  function copyClaim(token: string) {
    const link = `${window.location.origin}/creator/claim?token=${token}`;
    navigator.clipboard?.writeText(link);
    setCopied(token);
    setTimeout(() => setCopied(null), 1500);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display display-md font-semibold">Creators</h1>
        <div className="relative w-full sm:w-72">
          <Search size={16} strokeWidth={1.75} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-muted)]" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, email, slug…" className="charon-input rounded-full pl-10" />
        </div>
      </div>

      <div className="flex gap-1.5">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`rounded-full border px-3 py-1 text-utility transition-colors ${
              filter === f.id ? "border-[var(--color-gold)] bg-[var(--color-gold)] text-black" : "border-[var(--color-border)] text-[var(--color-muted)] hover:text-[var(--color-ink)]"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {rows.map((c) => (
          <div key={c.id} className="border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-display text-lg font-semibold">{c.name ?? c.slug ?? "Anonymous"}</p>
                  <span className={`text-utility ${c.claimed ? "text-[var(--color-accent-2)]" : "text-[var(--color-gold)]"}`}>
                    {c.claimed ? "claimed" : "unclaimed"}
                  </span>
                </div>
                <p className="text-sm text-[var(--color-muted)]">{c.email ?? "no email"}</p>
                <p className="text-utility mt-1 text-[var(--color-muted)]">
                  wallet: {c.wallet_address ? `${c.wallet_address.slice(0, 6)}…${c.wallet_address.slice(-4)}` : "none"}
                </p>
              </div>
              <div className="flex gap-6 text-right">
                <div>
                  <p className="tabular text-lg font-semibold text-[var(--color-gold)]">${Number(c.balance_usd).toFixed(2)}</p>
                  <p className="text-utility text-[var(--color-muted)]">escrow</p>
                </div>
                <div>
                  <p className="tabular text-lg font-semibold">${Number(c.total_earned_usdc).toFixed(2)}</p>
                  <p className="text-utility text-[var(--color-muted)]">lifetime</p>
                </div>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-[var(--color-border)] pt-3 text-utility">
              <button onClick={() => act(c.id, c.claimed ? "markUnclaimed" : "markClaimed")} className="text-[var(--color-gold)] hover:underline">
                {c.claimed ? "Mark unclaimed" : "Mark claimed"}
              </button>
              <button
                onClick={() => {
                  const w = prompt("Payout wallet (0x…):", c.wallet_address ?? "");
                  if (w) act(c.id, "setWallet", { walletAddress: w.trim() });
                }}
                className="text-[var(--color-muted)] hover:text-[var(--color-ink)]"
              >
                Set wallet
              </button>
              <button
                onClick={() => {
                  const v = prompt("Adjust escrow by (e.g. 5 or -2):");
                  if (v && Number(v)) act(c.id, "adjustEscrow", { deltaUsd: Number(v) });
                }}
                className="text-[var(--color-muted)] hover:text-[var(--color-ink)]"
              >
                Adjust escrow
              </button>
              {!c.claimed && (
                <button onClick={() => copyClaim(c.claim_token)} className="inline-flex items-center gap-1 text-[var(--color-muted)] hover:text-[var(--color-ink)]">
                  {copied === c.claim_token ? <Check size={13} className="text-[var(--color-accent-2)]" /> : <Copy size={13} />}
                  {copied === c.claim_token ? "Copied" : "Copy claim link"}
                </button>
              )}
            </div>
          </div>
        ))}
        {rows.length === 0 && <p className="text-sm text-[var(--color-muted)]">No creators found.</p>}
      </div>
    </div>
  );
}
