"use client";

import { useCallback, useEffect, useState } from "react";
import { Search, Copy, Check, Wallet, Coins, CheckCircle2, CircleSlash, Link2, X } from "lucide-react";
import { Pagination } from "@/components/admin/Pagination";
import EmptyState from "@/components/EmptyState";

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
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("");

  const load = useCallback(() => {
    fetch(`/api/admin/creators?search=${encodeURIComponent(search)}&filter=${filter}&page=${page}`)
      .then((r) => r.json())
      .then((d) => {
        setRows(d.creators ?? []);
        setTotal(d.total ?? 0);
        if (d.pageSize) setPageSize(d.pageSize);
      })
      .catch(() => {});
  }, [search, filter, page]);

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
    const d = await res.json().catch(() => ({}));
    if (!res.ok) return d.error ?? "Failed";
    load();
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display display-md font-semibold">Creators</h1>
        <div className="relative w-full sm:w-72">
          <Search size={16} strokeWidth={1.75} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-muted)]" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search name, email, slug…"
            className="charon-input rounded-full pl-10"
          />
        </div>
      </div>

      <div className="flex gap-1.5">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => { setFilter(f.id); setPage(1); }}
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
          <CreatorCard key={c.id} c={c} act={act} />
        ))}
        {rows.length === 0 && <EmptyState variant="inline" title="No creators found" />}
      </div>

      <Pagination page={page} pageSize={pageSize} total={total} onPage={setPage} />
    </div>
  );
}

const actionBtn =
  "inline-flex items-center gap-1.5 rounded-full border border-[var(--color-border)] px-3 py-1.5 text-utility text-[var(--color-muted)] transition-colors hover:border-[var(--color-gold)] hover:text-[var(--color-ink)]";

function CreatorCard({ c, act }: { c: Row; act: (id: string, action: string, extra?: Record<string, unknown>) => Promise<string | null> }) {
  const [editing, setEditing] = useState<null | "wallet" | "escrow">(null);
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  function open(kind: "wallet" | "escrow") {
    setEditing(kind);
    setValue(kind === "wallet" ? c.wallet_address ?? "" : "");
    setError("");
  }

  async function run(action: string, extra?: Record<string, unknown>) {
    setBusy(true);
    const err = await act(c.id, action, extra);
    setBusy(false);
    if (err) { setError(err); return; }
    setEditing(null);
  }

  function save() {
    setError("");
    if (editing === "wallet") {
      const w = value.trim();
      if (!/^0x[a-fA-F0-9]{40}$/.test(w)) { setError("Enter a valid 0x… wallet address."); return; }
      run("setWallet", { walletAddress: w });
    } else if (editing === "escrow") {
      const delta = Number(value);
      if (!delta) { setError("Enter a non-zero amount (e.g. 5 or -2)."); return; }
      run("adjustEscrow", { deltaUsd: delta });
    }
  }

  function copyClaim() {
    navigator.clipboard?.writeText(`${window.location.origin}/creator/claim?token=${c.claim_token}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-display text-lg font-semibold">{c.name ?? c.slug ?? "Anonymous"}</p>
            <span
              className={`rounded-full border px-2 py-0.5 text-utility ${
                c.claimed ? "border-[var(--color-accent-2)] text-[var(--color-accent-2)]" : "border-[var(--color-gold)] text-[var(--color-gold)]"
              }`}
            >
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

      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-[var(--color-border)] pt-3">
        <button
          onClick={() => run(c.claimed ? "markUnclaimed" : "markClaimed")}
          disabled={busy}
          className={`${actionBtn} ${c.claimed ? "" : "text-[var(--color-gold)]"}`}
        >
          {c.claimed ? <CircleSlash size={13} /> : <CheckCircle2 size={13} />}
          {c.claimed ? "Mark unclaimed" : "Mark claimed"}
        </button>
        <button onClick={() => open("wallet")} className={`${actionBtn} ${editing === "wallet" ? "border-[var(--color-gold)] text-[var(--color-ink)]" : ""}`}>
          <Wallet size={13} /> {c.wallet_address ? "Edit wallet" : "Set wallet"}
        </button>
        <button onClick={() => open("escrow")} className={`${actionBtn} ${editing === "escrow" ? "border-[var(--color-gold)] text-[var(--color-ink)]" : ""}`}>
          <Coins size={13} /> Adjust escrow
        </button>
        {!c.claimed && (
          <button onClick={copyClaim} className={actionBtn}>
            {copied ? <Check size={13} className="text-[var(--color-accent-2)]" /> : <Link2 size={13} />}
            {copied ? "Copied" : "Copy claim link"}
          </button>
        )}
      </div>

      {editing && (
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-[var(--color-border)] pt-3">
          <input
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") save(); if (e.key === "Escape") setEditing(null); }}
            placeholder={editing === "wallet" ? "0x… payout wallet" : "Amount, e.g. 5 or -2"}
            className="charon-input flex-1 sm:max-w-xs"
          />
          <button onClick={save} disabled={busy} className="btn-coin px-4 py-1.5 text-utility disabled:opacity-50">
            {busy ? "Saving…" : "Save"}
          </button>
          <button onClick={() => setEditing(null)} className={actionBtn} aria-label="Cancel">
            <X size={13} /> Cancel
          </button>
          {error && <p className="w-full text-utility text-red-400">{error}</p>}
        </div>
      )}
    </div>
  );
}
