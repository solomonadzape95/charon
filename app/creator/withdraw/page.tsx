"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Wallet, Building2, Check } from "lucide-react";
import { AccountNav } from "@/components/AccountNav";
import { getCreatorId, resolveCreatorId } from "@/lib/account";

interface Creator {
  id: string;
  name: string | null;
  balance_usd: number;
  wallet_address: string | null;
  payout_preference: "usdc_wallet" | "bank";
}
interface HistoryItem {
  amount: number;
  received: number;
  fee: number;
  destination: string;
  at: string;
}

const BANK_FEE = 0.015;

export default function WithdrawPage() {
  const router = useRouter();
  const [creator, setCreator] = useState<Creator | null>(null);
  const [dest, setDest] = useState<"usdc_wallet" | "bank">("usdc_wallet");
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState<HistoryItem | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  const load = useCallback((id: string) => {
    fetch(`/api/creators?id=${id}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.creator) {
          const c = d.creator as Creator;
          setCreator(c);
          setDest(c.wallet_address ? "usdc_wallet" : "bank");
          setAmount(Number(c.balance_usd).toFixed(2));
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    (async () => {
      const id = getCreatorId() ?? (await resolveCreatorId());
      if (!id) {
        router.replace("/dashboard");
        return;
      }
      load(id);
    })();
  }, [load, router]);

  async function withdraw() {
    if (!creator) return;
    setError("");
    const amt = Number(amount);
    if (Number.isNaN(amt) || amt <= 0) {
      setError("Enter an amount.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/creator/withdraw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ creatorId: creator.id, amountUsd: amt, destination: dest }),
      });
      const d = await res.json();
      if (!res.ok) {
        setError(d.error ?? "Withdrawal failed.");
        return;
      }
      const item: HistoryItem = {
        amount: d.withdrawn,
        received: d.received,
        fee: d.fee,
        destination: dest,
        at: new Date().toISOString(),
      };
      setDone(item);
      setHistory((h) => [item, ...h]);
      setCreator({ ...creator, balance_usd: d.balance });
      setAmount(Number(d.balance).toFixed(2));
    } finally {
      setBusy(false);
    }
  }

  if (!creator) {
    return (
      <>
        <AccountNav />
        <p className="mx-auto max-w-5xl px-6 py-12 text-[var(--color-muted)]">Loading…</p>
      </>
    );
  }

  const available = Number(creator.balance_usd);
  const amt = Number(amount) || 0;
  const fee = dest === "bank" ? Math.round(amt * BANK_FEE * 100) / 100 : 0;
  const receive = Math.max(0, Math.round((amt - fee) * 100) / 100);

  return (
    <>
      <AccountNav />
      <div className="mx-auto max-w-5xl space-y-8 px-6 py-10">
        <div>
          <Link href="/dashboard" className="text-sm text-[var(--color-muted)] hover:text-[var(--color-ink)]">
            ← Dashboard
          </Link>
          <h1 className="font-display display-md mt-2 font-semibold">Withdraw</h1>
        </div>

        {/* Balances */}
        <section className="grid grid-cols-2 gap-px border border-[var(--color-border)] bg-[var(--color-border)]">
          <div className="bg-[var(--color-surface)] p-6">
            <p className="text-utility text-[var(--color-muted)]">Available now</p>
            <p className="font-display text-4xl font-bold text-coin">${available.toFixed(2)}</p>
          </div>
          <div className="bg-[var(--color-surface)] p-6">
            <p className="text-utility text-[var(--color-muted)]">Pending release</p>
            <p className="font-display text-4xl font-bold text-[var(--color-muted)]">$0.00</p>
            <p className="mt-1 text-xs text-[var(--color-muted)]">Earnings settle to you instantly — no escrow hold.</p>
          </div>
        </section>

        {done && (
          <div className="flex items-center gap-3 border border-[var(--color-accent-2)] bg-[color-mix(in_srgb,var(--color-accent-2)_8%,transparent)] p-4">
            <Check size={18} className="shrink-0 text-[var(--color-accent-2)]" />
            <p className="text-sm">
              Withdrew <span className="font-semibold">${done.amount.toFixed(2)}</span> to your{" "}
              {done.destination === "bank" ? "bank account" : "USDC wallet"}.{" "}
              {done.fee > 0 && `You'll receive $${done.received.toFixed(2)} after the conversion fee.`}
            </p>
          </div>
        )}

        {/* Withdraw form */}
        <section className="space-y-4 border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
          <div>
            <p className="text-utility mb-2 text-[var(--color-muted)]">Withdraw to</p>
            <div className="grid grid-cols-2 gap-3">
              <DestTab
                active={dest === "usdc_wallet"}
                onClick={() => setDest("usdc_wallet")}
                icon={Wallet}
                title="USDC wallet"
                sub={creator.wallet_address ? `${creator.wallet_address.slice(0, 6)}…${creator.wallet_address.slice(-4)}` : "No wallet on file"}
              />
              <DestTab active={dest === "bank"} onClick={() => setDest("bank")} icon={Building2} title="Bank account" sub="1.5% conversion fee" />
            </div>
            {dest === "usdc_wallet" && !creator.wallet_address && (
              <p className="mt-2 text-xs text-red-400">
                Add a payout wallet in{" "}
                <Link href="/creator/onboarding" className="underline">
                  setup
                </Link>{" "}
                to withdraw to USDC.
              </p>
            )}
          </div>

          <div>
            <p className="text-utility mb-2 text-[var(--color-muted)]">Amount</p>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-muted)]">$</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  max={available}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="charon-input pl-7"
                />
              </div>
              <button onClick={() => setAmount(available.toFixed(2))} className="btn-outline shrink-0">
                Max
              </button>
            </div>
          </div>

          {/* Fee disclosure */}
          <div className="space-y-1 border-t border-[var(--color-border)] pt-4 text-sm">
            <Row label="Withdrawal amount" value={`$${amt.toFixed(2)}`} />
            <Row
              label={dest === "bank" ? "Conversion fee (1.5%)" : "Network fee"}
              value={dest === "bank" ? `−$${fee.toFixed(2)}` : "$0.00"}
            />
            <Row label="You'll receive" value={`$${receive.toFixed(2)}`} strong />
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <button
            disabled={busy || amt <= 0 || amt > available || (dest === "usdc_wallet" && !creator.wallet_address)}
            onClick={withdraw}
            className="btn-coin w-full disabled:opacity-50"
          >
            {busy ? "Processing…" : `Withdraw $${receive.toFixed(2)}`}
          </button>
        </section>

        {/* History */}
        <section className="space-y-3">
          <h2 className="font-display text-xl font-semibold">Withdrawal history</h2>
          {history.length === 0 ? (
            <p className="text-sm text-[var(--color-muted)]">No withdrawals yet.</p>
          ) : (
            <ul className="divide-y divide-[var(--color-border)] border border-[var(--color-border)]">
              {history.map((h, i) => (
                <li key={i} className="flex items-center justify-between bg-[var(--color-surface)] px-4 py-3 text-sm">
                  <div>
                    <span className="font-medium">{h.destination === "bank" ? "Bank account" : "USDC wallet"}</span>
                    <span className="ml-2 text-utility text-[var(--color-muted)]">{new Date(h.at).toLocaleString()}</span>
                  </div>
                  <span className="tabular font-semibold text-[var(--color-accent-2)]">−${h.amount.toFixed(2)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}

function DestTab({
  active,
  onClick,
  icon: Icon,
  title,
  sub,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof Wallet;
  title: string;
  sub: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-3 border p-4 text-left transition-colors ${
        active ? "border-[var(--color-gold)] bg-[color-mix(in_srgb,var(--color-gold)_8%,transparent)]" : "border-[var(--color-border)] hover:border-[var(--color-muted)]"
      }`}
    >
      <Icon size={20} className={active ? "text-[var(--color-gold)]" : "text-[var(--color-muted)]"} strokeWidth={1.5} />
      <div className="min-w-0">
        <p className="text-sm font-semibold">{title}</p>
        <p className="truncate text-xs text-[var(--color-muted)]">{sub}</p>
      </div>
    </button>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[var(--color-muted)]">{label}</span>
      <span className={`tabular ${strong ? "font-semibold text-[var(--color-ink)]" : "text-[var(--color-muted)]"}`}>{value}</span>
    </div>
  );
}
