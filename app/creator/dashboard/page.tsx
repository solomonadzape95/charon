"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { supabaseAnon } from "@/lib/supabase";

interface Earnings {
  creator: { id: string; name: string | null; balance_usd: number; total_earned_usdc: number; wallet_address: string | null };
  series: { id: string; title: string; status: string }[];
  payments: { id: string; amount: number; chapter: string | null; tx: string | null; created_at: string }[];
}

const LS_KEY = "charon_creator_id";
const ARC_EXPLORER = "https://testnet.arcscan.app";

export default function CreatorDashboard() {
  const [data, setData] = useState<Earnings | null>(null);
  const [pulse, setPulse] = useState(false);
  const balRef = useRef(0);

  const load = useCallback(async (id: string) => {
    const res = await fetch(`/api/creator/earnings?creatorId=${id}`);
    if (!res.ok) return;
    const d = (await res.json()) as Earnings;
    if (d.creator.balance_usd !== balRef.current) {
      balRef.current = d.creator.balance_usd;
      setPulse(true);
      setTimeout(() => setPulse(false), 1200);
    }
    setData(d);
  }, []);

  useEffect(() => {
    const id = localStorage.getItem(LS_KEY);
    if (!id) return;
    load(id);

    // Live: when a payment lands or the creator balance updates, refetch.
    const ch = supabaseAnon()
      .channel(`creator-${id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "payments", filter: `creator_id=eq.${id}` }, () => load(id))
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "creators", filter: `id=eq.${id}` }, () => load(id))
      .subscribe();
    return () => {
      supabaseAnon().removeChannel(ch);
    };
  }, [load]);

  if (!data) {
    return (
      <p className="mx-auto max-w-6xl px-6 py-12 text-[var(--color-muted)]">
        <Link href="/creator" className="text-[var(--color-gold)]">
          Sign in as a creator
        </Link>{" "}
        to see your dashboard.
      </p>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-6 py-12">
      <section className="border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
        <p className="text-utility text-[var(--color-muted)]">Claimable balance · live</p>
        <p
          className={`text-5xl font-bold transition-colors ${
            pulse ? "text-[var(--color-accent-2)]" : "text-[var(--color-gold)]"
          }`}
        >
          ${data.creator.balance_usd.toFixed(2)}
        </p>
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          ${data.creator.total_earned_usdc.toFixed(2)} earned all-time
          {data.creator.wallet_address ? " · routing directly to your wallet" : " · held in escrow until you add a wallet"}
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Recent settlements</h2>
        {data.payments.length === 0 ? (
          <p className="text-sm text-[var(--color-muted)]">No settlements yet — share your series to start earning.</p>
        ) : (
          <ul className="space-y-2">
            {data.payments.map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3"
              >
                <div>
                  <span className="text-sm font-medium">{p.chapter ?? "Chapter"}</span>
                  <span className="ml-2 text-xs text-[var(--color-muted)]">
                    {new Date(p.created_at).toLocaleTimeString()}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-[var(--color-gold)]">+${p.amount.toFixed(2)}</span>
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
    </div>
  );
}
