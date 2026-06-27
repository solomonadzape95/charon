"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { SubNav } from "@/components/SubNav";

interface Analytics {
  totalEarned: number;
  series: {
    id: string;
    title: string;
    followers: number;
    chapters: { n: number; title: string; reads: number; completion: number; reread: number; price: number; earned: number }[];
  }[];
}

function Bar({ value, label }: { value: number; label: string }) {
  return (
    <div className="min-w-0">
      <div className="flex justify-between text-utility text-[var(--color-muted)]">
        <span>{label}</span>
        <span>{Math.round(value * 100)}%</span>
      </div>
      <div className="mt-1 h-1.5 w-full bg-[var(--color-surface-2)]">
        <div className="h-full bg-[var(--color-gold)]" style={{ width: `${Math.min(100, value * 100)}%` }} />
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  const router = useRouter();
  const [data, setData] = useState<Analytics | null>(null);

  useEffect(() => {
    const id = localStorage.getItem("charon_creator_id");
    if (!id) {
      router.replace("/creator/join");
      return;
    }
    fetch(`/api/creator/analytics?creatorId=${id}`).then((r) => r.json()).then(setData).catch(() => {});
  }, [router]);

  return (
    <>
      <SubNav role="creator" />
      <div className="mx-auto max-w-5xl space-y-10 px-6 py-10">
        <div>
          <h1 className="font-display text-3xl font-semibold">Analytics</h1>
          <p className="mt-1 text-[var(--color-muted)]">
            ${(data?.totalEarned ?? 0).toFixed(2)} earned · where readers stay and where they drop.
          </p>
        </div>

        {!data?.series.length && <p className="text-[var(--color-muted)]">No published chapters yet.</p>}

        {data?.series.map((s) => (
          <section key={s.id} className="space-y-4">
            <div className="flex items-baseline justify-between border-b border-[var(--color-border)] pb-2">
              <h2 className="font-display text-2xl font-semibold">{s.title}</h2>
              <span className="text-utility text-[var(--color-muted)]">{s.followers} followers</span>
            </div>
            <div className="space-y-5">
              {s.chapters.map((c) => (
                <div key={c.n} className="grid gap-4 border-b border-[var(--color-border)] pb-5 md:grid-cols-[1fr_auto] md:items-center">
                  <div className="min-w-0">
                    <div className="flex items-baseline gap-3">
                      <span className="text-utility text-[var(--color-muted)]">{String(c.n).padStart(2, "0")}</span>
                      <h3 className="font-display truncate text-lg font-semibold">{c.title}</h3>
                    </div>
                    <div className="mt-3 grid max-w-md grid-cols-2 gap-4">
                      <Bar value={c.completion} label="Completion" />
                      <Bar value={c.reread} label="Re-read" />
                    </div>
                  </div>
                  <div className="flex gap-8 md:flex-col md:gap-1 md:text-right">
                    <div>
                      <p className="tabular text-xl font-semibold text-[var(--color-gold)]">${c.earned.toFixed(2)}</p>
                      <p className="text-utility text-[var(--color-muted)]">{c.reads} reads · ${c.price.toFixed(2)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </>
  );
}
