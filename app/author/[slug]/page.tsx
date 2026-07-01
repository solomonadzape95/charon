import Link from "next/link";
import { notFound } from "next/navigation";
import { BookOpen, Users, PenTool } from "lucide-react";
import { getCreatorBySlug, listSeriesForCreator } from "@/lib/db";
import { supabaseService } from "@/lib/supabase";
import { AppHeader } from "@/components/AppHeader";
import EmptyState from "@/components/EmptyState";
import { coverFor } from "@/lib/covers";

export const dynamic = "force-dynamic";

export default async function AuthorPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const creator = await getCreatorBySlug(slug);
  if (!creator) notFound();

  const series = await listSeriesForCreator(creator.id);
  const seriesIds = series.map((s) => s.id);

  // Chapter counts in one query.
  const chapterCounts: Record<string, number> = {};
  if (seriesIds.length) {
    const { data } = await supabaseService().from("chapters").select("series_id").in("series_id", seriesIds);
    for (const row of data ?? []) {
      const sid = (row as { series_id: string }).series_id;
      chapterCounts[sid] = (chapterCounts[sid] ?? 0) + 1;
    }
  }

  const totalReaders = series.reduce((s, x) => s + Number(x.follower_count), 0);
  const totalChapters = Object.values(chapterCounts).reduce((a, b) => a + b, 0);
  const initial = (creator.name?.[0] ?? "A").toUpperCase();
  const genres = [...new Set(series.flatMap((s) => (s.genre ?? "").split(",").map((g) => g.trim()).filter(Boolean)))].slice(0, 8);

  return (
    <>
      <AppHeader />
      <div className="mx-auto max-w-5xl space-y-12 px-6 py-10">
        {/* Profile header */}
        <header className="flex flex-col gap-6 sm:flex-row sm:items-center">
          <span className="grid h-24 w-24 shrink-0 place-items-center rounded-full bg-[linear-gradient(180deg,var(--color-gold-soft),var(--color-gold-deep))] font-display text-4xl font-bold text-black">
            {initial}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-utility inline-flex items-center gap-1.5 text-[var(--color-gold)]">
              <PenTool size={13} /> Creator
            </p>
            <h1 className="font-display display-md mt-1 font-bold">{creator.name ?? "Anonymous creator"}</h1>
            {creator.bio ? (
              <p className="mt-3 max-w-2xl text-[var(--color-muted)]">{creator.bio}</p>
            ) : (
              <p className="mt-3 text-sm text-[var(--color-muted)]">Writing on Charon.</p>
            )}
            {genres.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-1.5">
                {genres.map((g) => (
                  <span key={g} className="text-utility border border-[var(--color-border)] px-2 py-0.5 text-[var(--color-muted)]">#{g}</span>
                ))}
              </div>
            )}
          </div>
        </header>

        {/* Stats */}
        <section className="grid grid-cols-3 gap-px border border-[var(--color-border)] bg-[var(--color-border)]">
          <Stat icon={PenTool} label="Series" value={`${series.length}`} />
          <Stat icon={BookOpen} label="Chapters" value={`${totalChapters}`} />
          <Stat icon={Users} label="Readers" value={totalReaders.toLocaleString()} />
        </section>

        {/* Series */}
        <section className="space-y-5">
          <h2 className="font-display text-2xl font-semibold">{creator.name ? `${creator.name}'s series` : "Series"}</h2>
          {series.length === 0 ? (
            <EmptyState title="No published series yet" description="When this author publishes, their stories will appear here." />
          ) : (
            <div className="grid grid-cols-2 gap-x-5 gap-y-7 sm:grid-cols-4">
              {series.map((s) => (
                <Link key={s.id} href={`/series/${s.slug ?? s.id}`} className="group block">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={coverFor(s.id, s.cover_image)}
                    alt={s.title}
                    className="aspect-[2/3] w-full border border-[var(--color-border)] object-cover grayscale-[0.15] transition-all group-hover:border-[var(--color-gold)] group-hover:grayscale-0"
                  />
                  <p className="font-display clamp-2 mt-2 text-sm font-semibold leading-tight group-hover:text-[var(--color-gold)]">{s.title}</p>
                  <p className="text-utility mt-0.5 text-[var(--color-muted)]">
                    {chapterCounts[s.id] ?? 0} ch · {s.status}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </>
  );
}

function Stat({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: string }) {
  return (
    <div className="bg-[var(--color-surface)] px-5 py-6 text-center">
      <Icon size={16} className="mx-auto text-[var(--color-gold)]" strokeWidth={1.6} />
      <p className="tabular mt-2 text-2xl font-semibold">{value}</p>
      <p className="text-utility mt-1 text-[var(--color-muted)]">{label}</p>
    </div>
  );
}
