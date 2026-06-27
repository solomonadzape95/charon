"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { SubNav } from "@/components/SubNav";

interface Audience {
  followerCount: number;
  supporters: { id: string; total: number; reads: number }[];
}

export default function AudiencePage() {
  const router = useRouter();
  const [data, setData] = useState<Audience | null>(null);

  useEffect(() => {
    const id = localStorage.getItem("charon_creator_id");
    if (!id) {
      router.replace("/creator/join");
      return;
    }
    fetch(`/api/creator/audience?creatorId=${id}`).then((r) => r.json()).then(setData).catch(() => {});
  }, [router]);

  return (
    <>
      <SubNav role="creator" />
      <div className="mx-auto max-w-4xl space-y-10 px-6 py-10">
        <section className="border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
          <p className="text-utility text-[var(--color-muted)]">Followers</p>
          <p className="font-display text-5xl font-bold text-coin">{data?.followerCount ?? 0}</p>
        </section>

        <section className="space-y-4">
          <h2 className="font-display text-2xl font-semibold">Top supporters</h2>
          {!data?.supporters.length ? (
            <p className="text-[var(--color-muted)]">No supporters yet — share your series to start earning.</p>
          ) : (
            <ol className="divide-y divide-[var(--color-border)] border border-[var(--color-border)]">
              {data.supporters.map((s, i) => (
                <li key={s.id} className="flex items-center justify-between bg-[var(--color-surface)] px-4 py-3">
                  <div className="flex items-center gap-4">
                    <span className="font-display text-xl font-bold text-[var(--color-muted)]">{i + 1}</span>
                    <div>
                      <p className="font-medium">{s.id}</p>
                      <p className="text-utility text-[var(--color-muted)]">{s.reads} chapters</p>
                    </div>
                  </div>
                  <span className="tabular font-semibold text-[var(--color-gold)]">${s.total.toFixed(2)}</span>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </>
  );
}
