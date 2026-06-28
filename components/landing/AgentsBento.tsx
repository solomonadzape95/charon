"use client";

import { useState } from "react";
import { Eye, Tag, LineChart, Wallet } from "lucide-react";

// PNGs (dropped in /public/agents) replace the lucide fallbacks when present.
const TILES = [
  { n: "I", icon: Eye, png: "/agents/reading.png", name: "Reading Intelligence", body: "Reads each session — time on page, re-reads, binge depth — and settles the creator what it was actually worth." },
  { n: "II", icon: Tag, png: "/agents/pricing.png", name: "Creator Pricing", body: "Sets a fair base price for every chapter the moment it's uploaded, from word count and genre benchmarks." },
  { n: "III", icon: LineChart, png: "/agents/repricing.png", name: "Dynamic Repricing", body: "Tunes each chapter's price from live demand and engagement — gently, capped at 20% a day, never sudden." },
  { n: "IV", icon: Wallet, png: "/agents/budget.png", name: "Budget Allocation", body: "Watches a reader's balance and times top-up nudges and early-access auto-pays so the reading never stops." },
];

export function AgentsBento() {
  return (
    <section className="mx-auto max-w-[88rem] px-6 py-20 lg:px-10">
      <div className="mb-12 max-w-2xl">
        <p className="text-utility mb-4 text-[var(--color-gold)]">Four agents at work</p>
        <h2 className="font-display display-md font-semibold">Real decisions, settled on-chain — shown to you in one plain line.</h2>
      </div>

      <div className="grid gap-px border border-[var(--color-border)] bg-[var(--color-border)] sm:grid-cols-2">
        {TILES.map((t) => (
          <article key={t.name} className="group flex flex-col gap-5 bg-[var(--color-surface)] p-8 transition-colors hover:bg-[var(--color-surface-2)] sm:flex-row">
            <div className="grid h-24 w-24 shrink-0 place-items-center border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-gold)] transition-colors group-hover:border-[var(--color-gold)]">
              <AgentIcon png={t.png} Icon={t.icon} />
            </div>
            <div>
              <div className="flex items-baseline gap-3">
                <span className="font-display text-2xl font-bold text-coin">{t.n}</span>
                <h3 className="font-display text-xl font-semibold">{t.name}</h3>
              </div>
              <p className="mt-2 max-w-sm text-[var(--color-muted)]">{t.body}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function AgentIcon({ png, Icon }: { png: string; Icon: typeof Eye }) {
  const [err, setErr] = useState(false);
  if (err) return <Icon size={44} strokeWidth={1.4} />;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={png} alt="" className="h-20 w-20 object-contain" onError={() => setErr(true)} />;
}
