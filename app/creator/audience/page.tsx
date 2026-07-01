"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Users, HeartHandshake, BookOpen, Crown } from "lucide-react";
import { Breadcrumb } from "@/components/Breadcrumb";
import { StatGridSkeleton, ListSkeleton, SkeletonBlock } from "@/components/Skeletons";
import { getCreatorId, resolveCreatorId } from "@/lib/account";

interface Supporter {
  id: string;
  total: number;
  reads: number;
}
interface Audience {
  followerCount: number;
  supporters: Supporter[];
}

export default function AudiencePage() {
  const router = useRouter();
  const [data, setData] = useState<Audience | null>(null);

  useEffect(() => {
    (async () => {
      const id = getCreatorId() ?? (await resolveCreatorId());
      if (!id) {
        router.replace("/dashboard");
        return;
      }
      fetch(`/api/creator/audience?creatorId=${id}`).then((r) => r.json()).then(setData).catch(() => {});
    })();
  }, [router]);

  return (
    <div className="mx-auto max-w-5xl space-y-10 px-6 py-10">
      <div>
        <Breadcrumb items={[{ label: "Studio", href: "/creator/studio" }, { label: "Audience" }]} />
        <h1 className="font-display display-md mt-2 font-semibold">Audience</h1>
        <p className="mt-2 text-[var(--color-muted)]">Who&apos;s following your work, and who&apos;s putting coins in the ferryman&apos;s hand.</p>
      </div>

      {!data ? (
        <>
          <StatGridSkeleton count={4} />
          <div className="space-y-4">
            <SkeletonBlock className="h-6 w-40" />
            <ListSkeleton rows={5} />
          </div>
        </>
      ) : (
        <Loaded data={data} />
      )}
    </div>
  );
}

function Loaded({ data }: { data: Audience }) {
  const supporters = data.supporters;
  const paying = supporters.length;
  const earned = supporters.reduce((s, x) => s + x.total, 0);
  const chapters = supporters.reduce((s, x) => s + x.reads, 0);
  const avg = paying ? earned / paying : 0;
  const max = Math.max(0.01, ...supporters.map((s) => s.total));

  return (
    <>
      {/* Headline metrics */}
      <section className="grid grid-cols-2 gap-px border border-[var(--color-border)] bg-[var(--color-border)] sm:grid-cols-4">
        <Metric icon={Users} label="Followers" value={`${data.followerCount}`} />
        <Metric icon={HeartHandshake} label="Paying supporters" value={`${paying}`} />
        <Metric icon={Crown} label="From supporters" value={`$${earned.toFixed(2)}`} accent />
        <Metric icon={BookOpen} label="Chapters they read" value={`${chapters}`} />
      </section>

      <section className="grid gap-px border border-[var(--color-border)] bg-[var(--color-border)] sm:grid-cols-2">
        <div className="bg-[var(--color-surface)] p-6">
          <p className="text-utility text-[var(--color-muted)]">Average per supporter</p>
          <p className="font-display mt-1 text-3xl font-bold text-coin">${avg.toFixed(2)}</p>
          <p className="mt-1 text-xs text-[var(--color-muted)]">Lifetime spend across all your series.</p>
        </div>
        <div className="bg-[var(--color-surface)] p-6">
          <p className="text-utility text-[var(--color-muted)]">Conversion to paying</p>
          <p className="font-display mt-1 text-3xl font-bold">{data.followerCount ? Math.round((paying / data.followerCount) * 100) : 0}%</p>
          <p className="mt-1 text-xs text-[var(--color-muted)]">Followers who&apos;ve paid for at least one chapter.</p>
        </div>
      </section>

      {/* Top supporters */}
      <section className="space-y-4">
        <h2 className="font-display text-2xl font-semibold">Top supporters</h2>
        {!supporters.length ? (
          <div className="border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] p-8 text-center">
            <p className="text-[var(--color-muted)]">No supporters yet. Share your series to start earning.</p>
            <Link href="/creator/studio" className="btn-outline mt-4 !py-2 !text-[0.72rem]">Back to studio</Link>
          </div>
        ) : (
          <ol className="divide-y divide-[var(--color-border)] border border-[var(--color-border)]">
            {supporters.map((s, i) => (
              <li key={s.id} className="flex items-center gap-4 bg-[var(--color-surface)] px-4 py-3.5">
                <span
                  className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm font-bold ${
                    i === 0
                      ? "bg-[var(--color-gold)] text-black"
                      : i < 3
                        ? "bg-[color-mix(in_srgb,var(--color-gold)_18%,transparent)] text-[var(--color-gold)]"
                        : "text-[var(--color-muted)]"
                  }`}
                >
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{s.id}</p>
                  <div className="mt-1 h-1 w-full max-w-[14rem] bg-[var(--color-surface-2)]">
                    <div className="h-full bg-[var(--color-gold)]" style={{ width: `${Math.max(4, (s.total / max) * 100)}%` }} />
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <p className="tabular font-semibold text-[var(--color-gold)]">${s.total.toFixed(2)}</p>
                  <p className="text-utility text-[var(--color-muted)]">{s.reads} chapters</p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>
    </>
  );
}

function Metric({ icon: Icon, label, value, accent }: { icon: typeof Users; label: string; value: string; accent?: boolean }) {
  return (
    <div className="bg-[var(--color-surface)] px-5 py-5">
      <div className="flex items-center gap-2 text-[var(--color-muted)]">
        <Icon size={14} strokeWidth={1.75} />
        <p className="text-utility">{label}</p>
      </div>
      <p className={`tabular mt-2 text-2xl font-semibold ${accent ? "text-[var(--color-gold)]" : ""}`}>{value}</p>
    </div>
  );
}
