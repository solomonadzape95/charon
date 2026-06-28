"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AccountNav } from "@/components/AccountNav";

interface WalletData {
  balance: number;
  deposited: number;
  spent: number;
  ledger: { kind: string; amount: number; created_at: string }[];
}

const KIND_LABEL: Record<string, string> = {
  deposit: "Deposit",
  session_debit: "Session",
  unlock_debit: "Unlock",
  refund: "Refund",
};

export default function WalletPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [w, setW] = useState<WalletData | null>(null);
  const [busy, setBusy] = useState(false);

  const load = (id: string) => fetch(`/api/me/wallet?userId=${id}`).then((r) => r.json()).then(setW).catch(() => {});

  useEffect(() => {
    const id = localStorage.getItem("charon_user_id");
    if (!id) {
      router.replace("/join");
      return;
    }
    setUserId(id);
    load(id);
  }, [router]);

  async function deposit(amount: number) {
    if (!userId) return;
    setBusy(true);
    try {
      await fetch("/api/deposit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, amountUsd: amount }),
      });
      await load(userId);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <AccountNav />
      <div className="mx-auto max-w-5xl space-y-8 px-6 py-10">
        <section className="border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
          <p className="text-utility text-[var(--color-muted)]">Balance</p>
          <p className="font-display text-5xl font-bold text-coin">${(w?.balance ?? 0).toFixed(2)}</p>
          <div className="mt-5 flex flex-wrap items-center gap-2">
            {[3, 5, 10].map((a) => (
              <button key={a} disabled={busy} onClick={() => deposit(a)} className="btn-outline">
                + ${a}
              </button>
            ))}
          </div>
        </section>

        <div className="grid grid-cols-2 gap-px border border-[var(--color-border)] bg-[var(--color-border)]">
          <div className="bg-[var(--color-bg)] p-5">
            <p className="text-utility text-[var(--color-muted)]">Deposited</p>
            <p className="tabular mt-1 text-2xl">${(w?.deposited ?? 0).toFixed(2)}</p>
          </div>
          <div className="bg-[var(--color-bg)] p-5">
            <p className="text-utility text-[var(--color-muted)]">Spent on reading</p>
            <p className="tabular mt-1 text-2xl">${(w?.spent ?? 0).toFixed(2)}</p>
          </div>
        </div>

        <section className="space-y-3">
          <h2 className="font-display text-2xl font-semibold">Transactions</h2>
          {!w?.ledger.length ? (
            <p className="text-[var(--color-muted)]">No transactions yet.</p>
          ) : (
            <ul className="divide-y divide-[var(--color-border)] border border-[var(--color-border)]">
              {w.ledger.map((l, i) => (
                <li key={i} className="flex items-center justify-between bg-[var(--color-surface)] px-4 py-3">
                  <div>
                    <span className="font-medium">{KIND_LABEL[l.kind] ?? l.kind}</span>
                    <span className="ml-2 text-utility text-[var(--color-muted)]">
                      {new Date(l.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <span className={`tabular font-semibold ${l.amount < 0 ? "text-[var(--color-muted)]" : "text-[var(--color-accent-2)]"}`}>
                    {l.amount < 0 ? "−" : "+"}${Math.abs(l.amount).toFixed(2)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
