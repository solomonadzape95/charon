import Link from "next/link";
import { HeroCollage } from "@/components/landing/HeroCollage";
import { StatsBand } from "@/components/landing/StatsBand";
import { BigFooter } from "@/components/landing/BigFooter";

const MARQUEE = [
  "NANOPAYMENTS",
  "SETTLED ON ARC",
  "NO SUBSCRIPTION",
  "PAY PER CHAPTER",
  "READ FREELY",
  "CREATORS KEEP IT",
  "USDC · x402",
];

const DIFF = [
  {
    title: "Pay per read",
    body: "No subscription. You pay for the chapters you actually read, scaled to how deeply you engaged.",
    old: "Subscriptions charge the skimmer and the superfan the same.",
  },
  {
    title: "Living prices",
    body: "Every chapter re-prices from real demand and reader behaviour — gently, capped at 20% a day.",
    old: "Fixed prices ignore what readers love or skip.",
  },
  {
    title: "Loyalty pays off",
    body: "Follow from chapter one and pay less. New readers and bingers get discounts too.",
    old: "Patreon tiers are flat and forget how long you've stayed.",
  },
  {
    title: "Creators keep it",
    body: "Earnings hit the creator's wallet per chapter, in real time. A small settlement fee, nothing else.",
    old: "Royal Road sends readers to Patreon. Webtoon and WebNovel take the rest.",
  },
  {
    title: "Early access, automated",
    body: "Opt in and new chapters auto-unlock the moment they drop. Or buy a finished series in one tap.",
    old: "Patreon early access is manual, monthly, and takes a cut.",
  },
  {
    title: "No interruptions",
    body: "Never stopped mid-chapter to buy coins. Read now; value flows after.",
    old: "Coin-gated apps break the story to sell you tokens.",
  },
];

const STEPS = [
  { n: "01", title: "Deposit once", body: "Add USDC with a card or wallet. Circle handles the onramp — no coins to buy." },
  { n: "02", title: "Read anything", body: "Open any chapter. The agent quietly notes how you engage." },
  { n: "03", title: "Creators get paid", body: "A fair nanopayment settles to every creator you read — on Arc, instantly." },
];

const AGENTS = [
  { name: "Reading Intelligence", body: "Values each session and pays the creator." },
  { name: "Creator Pricing", body: "Prices every chapter on upload." },
  { name: "Dynamic Repricing", body: "Tunes prices from live demand." },
  { name: "Budget Allocation", body: "Manages your balance and top-ups." },
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

      {/* The difference — editorial index list */}
      <section className="mx-auto max-w-[88rem] px-6 lg:px-10">
        <div className="grid gap-10 py-20 md:grid-cols-12">
          <div className="md:col-span-4 md:sticky md:top-28 md:self-start">
            <p className="text-utility mb-4 text-[var(--color-gold)]">The difference</p>
            <h2 className="font-display display-md font-semibold">
              Every platform makes you choose a flat fee or ads. We fixed the unit.
            </h2>
          </div>
          <div className="md:col-span-8">
            {DIFF.map((d, i) => (
              <div
                key={d.title}
                className="grid grid-cols-12 gap-4 border-t border-[var(--color-border)] py-8 first:border-t-0 first:pt-0"
              >
                <span className="text-utility col-span-2 pt-2 text-[var(--color-muted)] md:col-span-1">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div className="col-span-10 md:col-span-11">
                  <h3 className="font-display text-2xl font-semibold md:text-3xl">{d.title}</h3>
                  <p className="mt-2 max-w-xl text-[var(--color-muted)]">{d.body}</p>
                  <p className="mt-3 text-sm text-[var(--color-muted)]/70">— {d.old}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works — three numbered columns split by hairlines */}
      <section className="border-y border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="mx-auto max-w-[88rem] px-6 py-20 lg:px-10">
          <p className="text-utility mb-12 text-[var(--color-gold)]">How it works</p>
          <div className="grid md:grid-cols-3">
            {STEPS.map((s, i) => (
              <div
                key={s.n}
                className={`flex flex-col gap-4 py-2 md:px-10 md:first:pl-0 ${
                  i > 0 ? "border-t border-[var(--color-border)] pt-10 md:border-l md:border-t-0 md:pt-2" : ""
                }`}
              >
                <span className="font-display text-6xl font-bold text-coin">{s.n}</span>
                <h3 className="font-display text-2xl font-semibold">{s.title}</h3>
                <p className="text-[var(--color-muted)]">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* The four agents — hairline-split row */}
      <section className="mx-auto max-w-[88rem] px-6 py-20 lg:px-10">
        <div className="mb-12 max-w-2xl">
          <p className="text-utility mb-4 text-[var(--color-gold)]">Four agents at work</p>
          <h2 className="font-display display-md font-semibold">
            Real decisions, settled on-chain — shown to you in one plain line.
          </h2>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4">
          {AGENTS.map((a, i) => (
            <div
              key={a.name}
              className={`flex flex-col gap-2 border-t border-[var(--color-border)] py-6 lg:border-t-0 lg:py-0 lg:pl-8 ${
                i > 0 ? "lg:border-l lg:border-[var(--color-border)]" : ""
              } lg:first:pl-0`}
            >
              <span className="font-display text-4xl font-bold text-coin">{["I", "II", "III", "IV"][i]}</span>
              <h3 className="font-display text-xl font-semibold text-[var(--color-ink)]">{a.name}</h3>
              <p className="text-[var(--color-muted)]">{a.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Closing */}
      <section className="border-t border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="mx-auto flex max-w-[88rem] flex-col items-center gap-6 px-6 py-24 text-center lg:px-10">
          <h2 className="font-display display-md max-w-2xl font-semibold">
            Every chapter, paid the moment it&apos;s read.
          </h2>
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

      <BigFooter />
    </>
  );
}
