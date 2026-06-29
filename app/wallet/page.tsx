"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Receipt, Sparkles, ArrowRight } from "lucide-react";
import { AccountNav } from "@/components/AccountNav";
import { DepositPanel } from "@/components/DepositPanel";
import { GiftPanel } from "@/components/GiftPanel";
import { ListSkeleton, SkeletonBlock } from "@/components/Skeletons";

interface WalletData {
  balance: number;
  deposited: number;
  spent: number;
  agentWallet: { balance: number; funded: number } | null;
  ledger: { kind: string; amount: number; created_at: string }[];
}

const KIND_LABEL: Record<string, string> = {
  deposit: "Deposit",
  welcome: "Welcome credit",
  gift: "Gift",
  tip: "Tip",
  agent_fund: "Agent funding",
  agent_return: "Agent return",
  session_debit: "Session",
  unlock_debit: "Series unlock",
  refund: "Refund",
};

// Filter tabs map to ledger kinds.
const FILTERS: { id: string; label: string; kinds: string[] | null }[] = [
  { id: "all", label: "All", kinds: null },
  { id: "deposits", label: "Deposits", kinds: ["deposit", "welcome"] },
  { id: "reading", label: "Reading", kinds: ["session_debit", "unlock_debit"] },
  { id: "tips", label: "Tips", kinds: ["tip"] },
  { id: "gifts", label: "Gifts", kinds: ["gift"] },
  { id: "agent", label: "Agent", kinds: ["agent_fund", "agent_return"] },
];
const TX_PAGE = 10;

export default function WalletPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [w, setW] = useState<WalletData | null>(null);
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(1);

  const load = (id: string) => fetch(`/api/me/wallet?userId=${id}`).then((r) => r.json()).then(setW).catch(() => {});

  const filtered = useMemo(() => {
    const kinds = FILTERS.find((f) => f.id === filter)?.kinds;
    const all = w?.ledger ?? [];
    return kinds ? all.filter((l) => kinds.includes(l.kind)) : all;
  }, [w, filter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / TX_PAGE));
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice((safePage - 1) * TX_PAGE, safePage * TX_PAGE);

  useEffect(() => {
    const id = localStorage.getItem("charon_user_id");
    if (!id) {
      router.replace("/join");
      return;
    }
    setUserId(id);
    load(id);
  }, [router]);

  return (
    <>
      <AccountNav />
      <div className="mx-auto max-w-5xl space-y-8 px-6 py-10">
        <section className="border border-[var(--color-border)] bg-[var(--color-surface)] p-7 sm:p-8">
          <p className="text-utility text-[var(--color-muted)]">Reading balance</p>
          {w === null ? (
            <SkeletonBlock className="mt-1 h-16 w-52" />
          ) : (
            <p className="font-display mt-1 text-6xl font-bold text-coin sm:text-7xl">${w.balance.toFixed(2)}</p>
          )}
        </section>

        {userId && <DepositPanel userId={userId} onCredited={() => load(userId)} />}

        {userId && <GiftPanel userId={userId} />}

        <div className="grid grid-cols-2 gap-px border border-[var(--color-border)] bg-[var(--color-border)]">
          <div className="bg-[var(--color-bg)] p-5">
            <p className="text-utility text-[var(--color-muted)]">Deposited</p>
            {w === null ? <SkeletonBlock className="mt-2 h-6 w-16" /> : <p className="tabular mt-1 text-2xl">${w.deposited.toFixed(2)}</p>}
          </div>
          <div className="bg-[var(--color-bg)] p-5">
            <p className="text-utility text-[var(--color-muted)]">Spent on reading</p>
            {w === null ? <SkeletonBlock className="mt-2 h-6 w-16" /> : <p className="tabular mt-1 text-2xl">${w.spent.toFixed(2)}</p>}
          </div>
        </div>

        {/* Reading agent wallet — where money you funded the agent with now sits */}
        {w?.agentWallet && (w.agentWallet.balance > 0 || w.agentWallet.funded > 0) && (
          <Link
            href="/agent"
            className="flex items-center justify-between gap-4 border border-[color-mix(in_srgb,var(--color-gold)_30%,var(--color-border))] bg-[var(--color-surface)] p-5 transition-colors hover:border-[var(--color-gold)]"
          >
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[color-mix(in_srgb,var(--color-gold)_14%,transparent)] text-[var(--color-gold)]">
                <Sparkles size={18} />
              </span>
              <div>
                <p className="font-medium">Reading agent wallet</p>
                <p className="text-xs text-[var(--color-muted)]">
                  ${w.agentWallet.funded.toFixed(2)} funded this week — the agent spends this on your behalf.
                </p>
              </div>
            </div>
            <span className="tabular shrink-0 text-xl font-bold text-[var(--color-gold)]">
              ${w.agentWallet.balance.toFixed(2)} <ArrowRight size={14} className="inline" />
            </span>
          </Link>
        )}

        <section className="space-y-3">
          <h2 className="font-display text-2xl font-semibold">Transactions</h2>

          {w === null ? (
            <ListSkeleton rows={4} />
          ) : !w.ledger.length ? (
            <div className="flex flex-col items-center gap-2 border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-12 text-center">
              <Receipt size={26} className="text-[var(--color-muted)]" strokeWidth={1.5} />
              <p className="font-display text-lg font-semibold">No transactions yet</p>
              <p className="max-w-sm text-sm text-[var(--color-muted)]">Add funds above, then every deposit, chapter, tip and gift shows up here.</p>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap gap-1.5">
                {FILTERS.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => {
                      setFilter(f.id);
                      setPage(1);
                    }}
                    className={`text-utility rounded-full border px-3 py-1 transition-colors ${
                      filter === f.id
                        ? "border-[var(--color-gold)] bg-[var(--color-gold)] text-black"
                        : "border-[var(--color-border)] text-[var(--color-muted)] hover:border-[var(--color-muted)] hover:text-[var(--color-ink)]"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {filtered.length === 0 ? (
                <div className="border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-10 text-center">
                  <p className="text-sm text-[var(--color-muted)]">
                    {filter === "agent"
                      ? "No agent activity yet — start your reading agent and fund a weekly budget."
                      : filter === "tips"
                        ? "No tips yet — tip an author from any chapter."
                        : filter === "gifts"
                          ? "No gifts yet — gift a deposit to another reader from above."
                          : `No ${FILTERS.find((f) => f.id === filter)?.label.toLowerCase() ?? ""} transactions yet.`}
                  </p>
                </div>
              ) : (
                <>
                  <ul className="divide-y divide-[var(--color-border)] border border-[var(--color-border)]">
                    {pageRows.map((l, i) => (
                      <li key={i} className="flex items-center justify-between bg-[var(--color-surface)] px-4 py-3">
                        <div>
                          <span className="font-medium">{KIND_LABEL[l.kind] ?? l.kind}</span>
                          <span className="ml-2 text-utility text-[var(--color-muted)]">
                            {new Date(l.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                          </span>
                        </div>
                        <span className={`tabular font-semibold ${l.amount < 0 ? "text-[var(--color-muted)]" : "text-[var(--color-accent-2)]"}`}>
                          {l.amount < 0 ? "−" : "+"}${Math.abs(l.amount).toFixed(2)}
                        </span>
                      </li>
                    ))}
                  </ul>
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-utility text-[var(--color-muted)]">{filtered.length} transactions</span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setPage((p) => Math.max(1, p - 1))}
                          disabled={safePage <= 1}
                          className="grid h-8 w-8 place-items-center rounded-full border border-[var(--color-border)] text-[var(--color-muted)] transition-colors hover:border-[var(--color-gold)] hover:text-[var(--color-ink)] disabled:opacity-35"
                        >
                          <ChevronLeft size={15} />
                        </button>
                        <span className="text-utility tabular text-[var(--color-muted)]">{safePage} / {totalPages}</span>
                        <button
                          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                          disabled={safePage >= totalPages}
                          className="grid h-8 w-8 place-items-center rounded-full border border-[var(--color-border)] text-[var(--color-muted)] transition-colors hover:border-[var(--color-gold)] hover:text-[var(--color-ink)] disabled:opacity-35"
                        >
                          <ChevronRight size={15} />
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </section>
      </div>
    </>
  );
}
