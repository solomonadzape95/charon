import Link from "next/link";
import { notFound } from "next/navigation";
import { getCreatorById, getSeriesById, listChapters } from "@/lib/db";
import { PriceBadge } from "@/components/PriceBadge";
import { SeriesActions } from "@/components/SeriesActions";
import { estimatedReadMinutes } from "@/lib/pricing";

export const dynamic = "force-dynamic";

export default async function SeriesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const series = await getSeriesById(id);
  if (!series) notFound();

  const [creator, chapters] = await Promise.all([
    getCreatorById(series.creator_id),
    listChapters(id),
  ]);

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <div className="flex items-center gap-2 text-xs text-[var(--color-muted)]">
          {series.genre && <span className="rounded-full bg-[var(--color-surface-2)] px-2 py-0.5">{series.genre}</span>}
          <span>{series.status}</span>
        </div>
        <h1 className="text-3xl font-bold">{series.title}</h1>
        {creator?.name && <p className="text-sm text-[var(--color-muted)]">by {creator.name}</p>}
        {series.description && <p className="max-w-2xl text-[var(--color-muted)]">{series.description}</p>}
        <div className="pt-2">
          <SeriesActions seriesId={series.id} status={series.status} />
        </div>
      </header>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">{chapters.length} chapters</h2>
        {chapters.length === 0 ? (
          <p className="text-sm text-[var(--color-muted)]">No chapters published yet.</p>
        ) : (
          <ul className="divide-y divide-[var(--color-border)] overflow-hidden rounded-2xl border border-[var(--color-border)]">
            {chapters.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/chapter/${c.id}`}
                  className="flex items-center justify-between gap-3 bg-[var(--color-surface)] px-4 py-3 transition-colors hover:bg-[var(--color-surface-2)]"
                >
                  <div className="min-w-0">
                    <span className="text-sm font-medium">
                      {c.chapter_number}. {c.title ?? `Chapter ${c.chapter_number}`}
                    </span>
                    <span className="ml-2 text-xs text-[var(--color-muted)]">
                      {c.content_type === "text"
                        ? `~${estimatedReadMinutes(c.word_count)} min`
                        : `${c.word_count} panels`}
                    </span>
                  </div>
                  <PriceBadge price={Number(c.current_price_usdc)} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
