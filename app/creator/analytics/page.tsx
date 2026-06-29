"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DollarSign, Eye, Percent, BookMarked, Users } from "lucide-react";
import { Breadcrumb } from "@/components/Breadcrumb";
import { StatGridSkeleton, SkeletonBlock } from "@/components/Skeletons";
import { getCreatorId, resolveCreatorId } from "@/lib/account";

interface ChapterRow {
  n: number;
  title: string;
  reads: number;
  completion: number;
  reread: number;
  price: number;
  earned: number;
}
interface SeriesRow {
  id: string;
  title: string;
  followers: number;
  chapters: ChapterRow[];
}
interface Analytics {
  totalEarned: number;
  series: SeriesRow[];
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
    (async () => {
      const id = getCreatorId() ?? (await resolveCreatorId());
      if (!id) {
        router.replace("/dashboard");
        return;
      }
      fetch(`/api/creator/analytics?creatorId=${id}`).then((r) => r.json()).then(setData).catch(() => {});
    })();
  }, [router]);

  const allChapters = data?.series.flatMap((s) => s.chapters) ?? [];
  const totalReads = allChapters.reduce((s, c) => s + c.reads, 0);
  const avgCompletion = allChapters.length ? allChapters.reduce((s, c) => s + c.completion, 0) / allChapters.length : 0;

  return (
    <div className="mx-auto max-w-5xl space-y-10 px-6 py-10">
      <div>
        <Breadcrumb items={[{ label: "Studio", href: "/creator/studio" }, { label: "Analytics" }]} />
        <h1 className="font-display display-md mt-2 font-semibold">Analytics</h1>
        <p className="mt-2 text-[var(--color-muted)]">Where readers stay, where they drop, and which chapters earn.</p>
      </div>

      {!data ? (
        <>
          <StatGridSkeleton count={4} />
          <div className="space-y-4">
            <SkeletonBlock className="h-7 w-48" />
            <SkeletonBlock className="h-40 w-full" />
          </div>
        </>
      ) : (
        <>
          {/* Aggregate metrics */}
          <section className="grid grid-cols-2 gap-px border border-[var(--color-border)] bg-[var(--color-border)] sm:grid-cols-4">
            <Metric icon={DollarSign} label="Earned all-time" value={`$${data.totalEarned.toFixed(2)}`} accent />
            <Metric icon={Eye} label="Total reads" value={`${totalReads}`} />
            <Metric icon={Percent} label="Avg completion" value={`${Math.round(avgCompletion * 100)}%`} />
            <Metric icon={BookMarked} label="Chapters live" value={`${allChapters.length}`} />
          </section>

          {!data.series.length && (
            <div className="border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] p-8 text-center">
              <p className="text-[var(--color-muted)]">No published chapters yet.</p>
              <Link href="/creator/studio" className="btn-outline mt-4 !py-2 !text-[0.72rem]">Back to studio</Link>
            </div>
          )}

          {data.series.map((s) => {
            const earned = s.chapters.reduce((a, c) => a + c.earned, 0);
            const reads = s.chapters.reduce((a, c) => a + c.reads, 0);
            const seriesCompletion = s.chapters.length ? s.chapters.reduce((a, c) => a + c.completion, 0) / s.chapters.length : 0;
            const best = s.chapters.slice().sort((a, b) => b.completion - a.completion)[0];
            return (
              <section key={s.id} className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--color-border)] pb-2">
                  <h2 className="font-display text-2xl font-semibold">{s.title}</h2>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                    <IconStat icon={Users} value={`${s.followers}`} title="Followers" />
                    <IconStat icon={Eye} value={`${reads}`} title="Reads" />
                    <IconStat icon={DollarSign} value={earned.toFixed(2)} title="Earned" accent />
                    <IconStat icon={Percent} value={`${Math.round(seriesCompletion * 100)}`} title="Avg completion" />
                  </div>
                </div>

                {best && best.reads > 0 && (
                  <p className="text-sm text-[var(--color-muted)]">
                    Strongest chapter:{" "}
                    <span className="text-[var(--color-ink)]">#{String(best.n).padStart(2, "0")} {best.title}</span> —{" "}
                    {Math.round(best.completion * 100)}% completion.
                  </p>
                )}

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
            );
          })}
        </>
      )}
    </div>
  );
}

function IconStat({ icon: Icon, value, title, accent }: { icon: typeof Eye; value: string; title: string; accent?: boolean }) {
  return (
    <span
      title={title}
      className={`tabular inline-flex items-center gap-1.5 text-sm ${accent ? "text-[var(--color-gold)]" : "text-[var(--color-muted)]"}`}
    >
      <Icon size={14} strokeWidth={1.75} className={accent ? "text-[var(--color-gold)]" : "text-[var(--color-muted)]"} />
      {value}
    </span>
  );
}

function Metric({ icon: Icon, label, value, accent }: { icon: typeof Eye; label: string; value: string; accent?: boolean }) {
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
