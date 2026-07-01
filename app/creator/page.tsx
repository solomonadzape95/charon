"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Globe, Zap, Wallet, Check, Minus } from "lucide-react";
import { BigFooter } from "@/components/landing/BigFooter";
import { SafeImage } from "@/components/SafeImage";
import { HERO_COVERS } from "@/lib/hero-covers";

interface Stats {
  totalUsdc: number;
  earningCreators: number;
  chaptersRead: number;
  topCreators: { name: string | null; slug: string | null; earned: number }[];
  recent: { reasoning: string | null; amount: number; created_at: string }[];
}

const PROOF = [
  {
    icon: Globe,
    title: "Paid anywhere on Earth",
    body: "Get paid instantly in USDC (a digital dollar) to any wallet, anywhere. No minimums. No conversion delays. Built for creators in Lagos, Jakarta, Manila and São Paulo: every market Patreon and WebNovel left behind.",
  },
  {
    icon: Zap,
    title: "Earn in real time",
    body: "Money moves the moment a reader finishes a chapter, not at the end of the month. Watch it land, chapter by chapter.",
  },
  {
    icon: Wallet,
    title: "Withdraw with no threshold",
    body: "Cash out to your bank or wallet whenever you like. No $50 minimum, no waiting for a payout cycle.",
  },
];

// Comparison: rows × platforms. `good` highlights Charon's winning cell.
const COMPARE = {
  cols: ["Charon", "Patreon", "WebNovel", "Royal Road + Patreon"],
  rows: [
    { label: "Revenue share", values: ["95%, flat", "88% to 95%, less fees", "About 30% to 50%", "Split across two sites"] },
    { label: "Payout speed", values: ["Instant, per chapter", "Monthly, after a hold", "Paid 30+ days later", "Monthly"] },
    { label: "Reading experience", values: ["Built-in reader, no coins", "Posts, not a reader", "Coin-gated paywall", "Free site, paywall offsite"] },
  ],
};

export default function CreatorLanding() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    const tick = () => fetch("/api/stats").then((r) => r.json()).then(setStats).catch(() => {});
    tick();
    const t = setInterval(tick, 5000);
    return () => clearInterval(t);
  }, []);

  return (
    <>
      {/* Hero — cover collage behind, black overlay, no pointer events */}
      <section className="relative flex min-h-[72vh] items-center overflow-hidden border-b border-[var(--color-border)]">
        <div aria-hidden className="pointer-events-none absolute inset-0 flex">
          {[...HERO_COVERS, ...HERO_COVERS].slice(0, 14).map((c, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={i} src={c.cover} alt="" className="h-full min-w-0 flex-1 object-cover grayscale" />
          ))}
        </div>
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[var(--color-bg)] via-[color-mix(in_srgb,var(--color-bg)_88%,transparent)] to-[color-mix(in_srgb,var(--color-bg)_72%,transparent)]" />

        <div className="relative z-10 mx-auto w-full max-w-[88rem] px-6 py-20 lg:px-10">
          <p className="text-utility text-[var(--color-gold)]">For creators</p>
          <h1 className="font-display display-lg mt-4 max-w-4xl font-semibold">Upload your series. Get paid the moment it&apos;s read.</h1>
          <p className="mt-6 max-w-2xl text-lg text-[var(--color-muted)]">
            Readers pay per chapter based on how deeply they engage. You earn in real time and withdraw to your bank or wallet
            with no minimum threshold. No coins, no monthly cycle, no sending readers off to another site to pay.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/creator/onboarding" className="btn-coin">
              Start publishing
            </Link>
            <Link href="/creator/studio" className="btn-outline">
              Go to your studio
            </Link>
          </div>
        </div>
      </section>

      {/* Live earnings ticker */}
      <section className="border-y border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="mx-auto grid max-w-[88rem] gap-px bg-[var(--color-border)] px-6 py-0 sm:grid-cols-3 lg:px-10">
          <Stat value={`$${(stats?.totalUsdc ?? 0).toFixed(2)}`} label="USDC paid to creators" accent />
          <Stat value={`${stats?.earningCreators ?? 0}`} label="Creators earning now" />
          <Stat value={`${stats?.chaptersRead ?? 0}`} label="Chapters read & paid" />
        </div>
        <div className="mx-auto max-w-[88rem] px-6 py-6 lg:px-10">
          <div className="mb-3 flex items-center gap-2 text-utility text-[var(--color-muted)]">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-accent-2)] pulse-dot" /> Live payouts as they happen
          </div>
          <ul className="space-y-1.5">
            {(stats?.recent ?? []).slice(0, 5).map((r, i) => (
              <li key={i} className="flex items-center justify-between border-b border-[var(--color-border)] py-2 text-sm">
                <span className="truncate pr-4 text-[var(--color-muted)]">
                  {r.reasoning ?? "A reader finished a chapter."}
                </span>
                <span className="tabular shrink-0 font-semibold text-[var(--color-gold)]">+${r.amount.toFixed(2)}</span>
              </li>
            ))}
            {!stats?.recent?.length && (
              <li className="py-2 text-sm text-[var(--color-muted)]">Payouts will appear here as readers read.</li>
            )}
          </ul>
        </div>
      </section>

      {/* Fee split — the headline number */}
      <section className="mx-auto max-w-[88rem] px-6 py-24 lg:px-10">
        <div className="grid items-center gap-10 md:grid-cols-2">
          <div>
            <p className="text-utility text-[var(--color-gold)]">The fee, in full</p>
            <h2 className="font-display display-md mt-3 font-semibold">We take 5%. You keep 95%. No other fees.</h2>
            <p className="mt-4 max-w-md text-[var(--color-muted)]">
              No platform tax stacked on processing fees. No hidden markup on coins. The only other deduction is a 1.5%
              conversion fee. It applies only if you cash out to a bank instead of a wallet.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-px border border-[var(--color-border)] bg-[var(--color-border)]">
            <div className="bg-[var(--color-surface)] p-8 text-center">
              <p className="font-display text-6xl font-bold text-coin">95%</p>
              <p className="mt-2 text-utility text-[var(--color-muted)]">You keep</p>
            </div>
            <div className="bg-[var(--color-surface)] p-8 text-center">
              <p className="font-display text-6xl font-bold text-[var(--color-muted)]">5%</p>
              <p className="mt-2 text-utility text-[var(--color-muted)]">Platform</p>
            </div>
          </div>
        </div>
      </section>

      {/* Global payout proof points */}
      <section className="border-y border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="mx-auto max-w-[88rem] px-6 py-20 lg:px-10">
          <div className="grid gap-px bg-[var(--color-border)] md:grid-cols-3">
            {PROOF.map((p) => (
              <div key={p.title} className="bg-[var(--color-surface)] p-7">
                <div className="grid h-11 w-11 place-items-center border border-[var(--color-border)] text-[var(--color-gold)]">
                  <p.icon size={20} strokeWidth={1.5} />
                </div>
                <h3 className="font-display mt-4 text-xl font-semibold">{p.title}</h3>
                <p className="mt-2 text-sm text-[var(--color-muted)]">{p.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison table */}
      <section className="mx-auto max-w-[88rem] px-6 py-24 lg:px-10">
        <p className="text-utility text-[var(--color-gold)]">How we compare</p>
        <h2 className="font-display display-md mt-3 max-w-2xl font-semibold">Built for the people who write, not the middlemen.</h2>

        <div className="mt-10 overflow-x-auto scrollbar-thin">
          <table className="w-full min-w-[44rem] border-collapse text-left">
            <thead>
              <tr>
                <th className="w-44 border-b border-[var(--color-border)] py-4 pr-4 text-utility text-[var(--color-muted)]" />
                {COMPARE.cols.map((c, i) => (
                  <th
                    key={c}
                    className={`border-b border-[var(--color-border)] px-4 py-4 align-bottom ${
                      i === 0 ? "text-[var(--color-gold)]" : "text-[var(--color-muted)]"
                    }`}
                  >
                    <span className={i === 0 ? "font-display text-lg font-semibold" : "text-utility"}>{c}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {COMPARE.rows.map((row) => (
                <tr key={row.label}>
                  <th className="border-b border-[var(--color-border)] py-5 pr-4 text-left align-top text-utility text-[var(--color-muted)]">
                    {row.label}
                  </th>
                  {row.values.map((v, i) => (
                    <td
                      key={i}
                      className={`border-b border-[var(--color-border)] px-4 py-5 align-top text-sm ${
                        i === 0
                          ? "bg-[color-mix(in_srgb,var(--color-gold)_6%,transparent)] font-medium text-[var(--color-ink)]"
                          : "text-[var(--color-muted)]"
                      }`}
                    >
                      <span className="flex items-start gap-2">
                        {i === 0 ? (
                          <Check size={15} className="mt-0.5 shrink-0 text-[var(--color-gold)]" />
                        ) : (
                          <Minus size={15} className="mt-0.5 shrink-0 text-[var(--color-border)]" />
                        )}
                        {v}
                      </span>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Closing CTA — CTA image as a grayed-out background */}
      <section className="relative flex min-h-[60vh] items-center overflow-hidden border-t border-[var(--color-border)] bg-[var(--color-surface)]">
        <SafeImage src="/cta.png" alt="" className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-25 grayscale" />
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[var(--color-bg)] via-[color-mix(in_srgb,var(--color-bg)_82%,transparent)] to-[color-mix(in_srgb,var(--color-bg)_68%,transparent)]" />
        <div className="relative z-10 mx-auto flex w-full max-w-[88rem] flex-col items-center gap-6 px-6 py-24 text-center lg:px-10">
          <h2 className="font-display display-md max-w-2xl font-semibold">Your next chapter could be earning by tonight.</h2>
          <div className="flex flex-wrap justify-center gap-3">
            <Link href="/creator/onboarding" className="btn-coin">
              Start publishing
            </Link>
            <Link href="/read" className="btn-outline">
              Browse the platform
            </Link>
          </div>
        </div>
      </section>

      <BigFooter />
    </>
  );
}

function Stat({ value, label, accent }: { value: string; label: string; accent?: boolean }) {
  return (
    <div className="bg-[var(--color-surface)] px-6 py-8">
      <p className={`font-display text-4xl font-bold ${accent ? "text-coin" : "text-[var(--color-ink)]"}`}>{value}</p>
      <p className="mt-2 text-utility text-[var(--color-muted)]">{label}</p>
    </div>
  );
}
