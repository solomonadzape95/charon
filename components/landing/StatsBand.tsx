"use client";

import { useEffect, useState } from "react";

interface Stats {
  totalUsdc: number;
  chaptersRead: number;
  earningCreators: number;
  series: number;
}

function Big({ label, value, unit, accent }: { label: string; value: string; unit?: string; accent?: boolean }) {
  return (
    <div className="flex flex-col gap-3">
      <span className="text-utility text-[var(--color-muted)]">{label}</span>
      <span className={`tabular text-3xl font-medium md:text-4xl ${accent ? "text-coin" : "text-[var(--color-ink)]"}`}>
        {value}
        {unit && <span className="ml-1.5 text-base text-[var(--color-muted)]">{unit}</span>}
      </span>
    </div>
  );
}

export function StatsBand() {
  const [s, setS] = useState<Stats | null>(null);

  useEffect(() => {
    const tick = () => fetch("/api/stats").then((r) => r.json()).then(setS).catch(() => {});
    tick();
    const t = setInterval(tick, 6000);
    return () => clearInterval(t);
  }, []);

  const v = (n: number | undefined, d = "·") => (s ? String(n) : d);

  return (
    <section className="border-b border-[var(--color-border)]">
      <div className="mx-auto grid max-w-[88rem] grid-cols-2 gap-x-8 gap-y-10 px-6 py-12 md:grid-cols-4 lg:px-10">
        <Big label="USDC paid on Arc" value={s ? `$${s.totalUsdc.toFixed(2)}` : "·"} accent />
        <Big label="Chapters paid" value={v(s?.chaptersRead)} />
        <Big label="Creators earning" value={v(s?.earningCreators)} />
        <div className="flex flex-col gap-3">
          <span className="text-utility text-[var(--color-muted)]">Status</span>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[var(--color-accent-2)] pulse-dot" />
            <span className="tabular text-3xl font-medium uppercase md:text-4xl">Beta</span>
          </div>
        </div>
      </div>
    </section>
  );
}
