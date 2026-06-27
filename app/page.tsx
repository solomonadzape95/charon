import Link from "next/link";
import { HeroCollage } from "@/components/landing/HeroCollage";
import { StatsBand } from "@/components/landing/StatsBand";

const MARQUEE = [
  "NANOPAYMENTS",
  "SETTLED ON ARC",
  "NO SUBSCRIPTION",
  "PAY PER CHAPTER",
  "THE FERRYMAN'S TOLL",
  "READ FREELY",
  "CREATORS KEEP IT",
  "USDC · x402",
];

const FEATURES = [
  {
    kicker: "Post-reading settlement",
    title: "Pay for what you actually read",
    body: "No flat subscription. An agent values each session by how deeply you engaged — time, re-reads, binge depth — and settles a fair coin to the creator afterward.",
    old: "Subscriptions charge the skimmer and the bingeing superfan the same.",
  },
  {
    kicker: "Dynamic pricing",
    title: "Prices that breathe with demand",
    body: "Every chapter is re-priced from real signals — demand, time decay, momentum, re-read rate — gently, capped at ±20% a day. Trending chapters earn more; abandoned ones ease down.",
    old: "Fixed prices ignore whether a chapter is loved or skipped.",
  },
  {
    kicker: "Loyalty & discovery",
    title: "Devotion is rewarded",
    body: "Readers following since chapter one pay less. New readers get their first chapters discounted. Binge a series and each extra chapter costs a little less.",
    old: "Patreon tiers are flat and forget how long you've stayed.",
  },
  {
    kicker: "Direct settlement",
    title: "Creators keep nearly all of it",
    body: "Earnings flow straight to the creator's wallet per chapter, per reader, in real time — a small settlement fee, nothing else. No ad pennies, no rights grab, no middle cut.",
    old: "Royal Road points readers to Patreon. Webtoon and WebNovel take the rest.",
  },
  {
    kicker: "Pre-release & bundles",
    title: "Early access, handled by an agent",
    body: "Opt a series into pre-release and the budget agent auto-pays the moment a chapter drops — it's just there. Or unlock a finished series for one discounted coin.",
    old: "Patreon early-access is manual, monthly, and takes a third-party cut.",
  },
  {
    kicker: "No paywalls",
    title: "Never stopped mid-chapter",
    body: "You never hit a wall asking for coins. Read first; value flows after. A gentle nudge appears only when your balance runs low — never in the middle of a scene.",
    old: "Coin-gated readers interrupt the story to sell you tokens.",
  },
];

const STEPS = [
  { n: "I", title: "Deposit once", body: "Add a USDC balance with a card or wallet — Circle handles the onramp invisibly. No coins to buy." },
  { n: "II", title: "Read anything", body: "Open any chapter and read like any other app. The agent quietly tracks how you engage." },
  { n: "III", title: "The coin crosses", body: "After each session a fair nanopayment settles to every creator you read — on Arc, in real time." },
];

const AGENTS = [
  { name: "Reading Intelligence", body: "Values each session from genuine engagement and settles it to the creator." },
  { name: "Creator Pricing", body: "Sets a fair base price for every chapter the moment it's uploaded." },
  { name: "Dynamic Repricing", body: "Continuously tunes prices from demand, decay, loyalty and binge signals." },
  { name: "Budget Allocation", body: "Watches your balance, suggests top-ups and pre-release at the right moment." },
];

export default function Home() {
  return (
    <>
      <HeroCollage />
      <StatsBand />

      {/* Text marquee */}
      <section className="overflow-hidden border-b border-[var(--color-border)] py-5">
        <div className="flex w-max marquee-text">
          {[...MARQUEE, ...MARQUEE].map((w, i) => (
            <span key={i} className="text-utility flex items-center text-[var(--color-muted)]">
              <span className="px-6">{w}</span>
              <span className="text-[var(--color-gold)]">✦</span>
            </span>
          ))}
        </div>
      </section>

      {/* Why Charon — editorial feature cards */}
      <section className="mx-auto max-w-[88rem] px-6 py-20 lg:px-10">
        <div className="mb-12 max-w-2xl">
          <p className="text-utility mb-4 text-[var(--color-gold)]">Why Charon</p>
          <h2 className="font-display display-md font-semibold">
            Every reading platform makes you choose: a flat fee, or ads. Charon fixes the unit.
          </h2>
        </div>
        <div className="grid gap-px overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-border)] sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="flex flex-col gap-3 bg-[var(--color-bg)] p-7">
              <p className="text-utility text-[var(--color-gold)]">{f.kicker}</p>
              <h3 className="font-display text-2xl font-semibold leading-tight">{f.title}</h3>
              <p className="text-[var(--color-muted)]">{f.body}</p>
              <p className="mt-auto border-t border-[var(--color-border)] pt-3 text-sm italic text-[var(--color-muted)]">
                {f.old}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="border-y border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="mx-auto max-w-[88rem] px-6 py-20 lg:px-10">
          <p className="text-utility mb-12 text-[var(--color-gold)]">How it works</p>
          <div className="grid gap-12 md:grid-cols-3">
            {STEPS.map((s) => (
              <div key={s.n} className="flex flex-col gap-3">
                <span className="font-display text-5xl font-bold text-coin">{s.n}</span>
                <h3 className="font-display text-2xl font-semibold">{s.title}</h3>
                <p className="text-[var(--color-muted)]">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* The four agents */}
      <section className="mx-auto max-w-[88rem] px-6 py-20 lg:px-10">
        <div className="mb-12 max-w-2xl">
          <p className="text-utility mb-4 text-[var(--color-gold)]">Four agents at work</p>
          <h2 className="font-display display-md font-semibold">
            Real reasoning, settled on-chain — and shown to you in one plain sentence.
          </h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {AGENTS.map((a, i) => (
            <div key={a.name} className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
              <span className="text-utility text-[var(--color-muted)]">Agent {i + 1}</span>
              <h3 className="font-display mt-2 text-xl font-semibold text-[var(--color-gold)]">{a.name}</h3>
              <p className="mt-2 text-[var(--color-muted)]">{a.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Closing CTA */}
      <section className="border-t border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="mx-auto flex max-w-[88rem] flex-col items-center gap-6 px-6 py-24 text-center lg:px-10">
          <p className="font-display display-md max-w-3xl font-semibold">
            The ferryman took one coin per crossing. Every chapter is a crossing.
          </p>
          <p className="text-lg text-[var(--color-muted)]">The coin is automatic.</p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link href="/read" className="btn-coin">
              Start reading
            </Link>
            <Link href="/creator" className="btn-outline">
              Publish your work
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[var(--color-border)]">
        <div className="mx-auto flex max-w-[88rem] flex-wrap items-center justify-between gap-4 px-6 py-10 lg:px-10">
          <div className="flex items-center gap-3">
            <span className="font-display text-lg font-semibold text-coin">Charon</span>
            <span className="h-4 w-px bg-[var(--color-border)]" />
            <span className="text-utility text-[var(--color-muted)]">Settled on Arc · Circle · x402</span>
          </div>
          <span className="text-utility text-[var(--color-muted)]">
            Coin emblem by Brickclay · Noun Project
          </span>
        </div>
      </footer>
    </>
  );
}
