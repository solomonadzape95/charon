import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getCreatorById,
  getSeriesById,
  getSeriesBySlug,
  listChapters,
  listSeries,
} from "@/lib/db";
import { supabaseService } from "@/lib/supabase";
import { PaymentModes } from "@/components/PaymentModes";
import { SeriesTabs } from "@/components/SeriesTabs";
import { AppHeader } from "@/components/AppHeader";
import { estimatedReadMinutes } from "@/lib/pricing";
import { coverFor } from "@/lib/covers";

export const dynamic = "force-dynamic";

const GENRE_TAGS: Record<string, string[]> = {
  litrpg: ["system", "progression", "weak-to-strong"],
  fantasy: ["magic", "adventure", "lost-world"],
  romance: ["slow-burn", "found-family"],
  scifi: ["space", "first-contact", "mystery"],
  action: ["martial", "tournament"],
  mystery: ["detective", "noir"],
  horror: ["dread", "survival"],
  manhwa: ["vertical-scroll", "action"],
};

function updateFrequency(dates: string[]): string | null {
  if (dates.length < 2) return null;
  const sorted = dates.map((d) => +new Date(d)).sort((a, b) => a - b);
  let total = 0;
  for (let i = 1; i < sorted.length; i++) total += sorted[i] - sorted[i - 1];
  const avgDays = total / (sorted.length - 1) / 86_400_000;
  if (avgDays < 1) return "new chapter daily";
  return `new chapter every ${Math.max(1, Math.round(avgDays))}–${Math.round(avgDays) + 1} days`;
}

export default async function SeriesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  // Resolve by slug first (canonical), falling back to id for old links.
  const series = (await getSeriesBySlug(id)) ?? (await getSeriesById(id));
  if (!series) notFound();

  const [creator, chapters, all] = await Promise.all([
    getCreatorById(series.creator_id),
    listChapters(series.id),
    listSeries(60),
  ]);

  const chIds = chapters.map((c) => c.id);
  const db = supabaseService();
  const [{ data: commentRows }, { data: sessRows }] = await Promise.all([
    chIds.length
      ? db
          .from("sessions")
          .select("reader_comment, created_at, chapter_id")
          .in("chapter_id", chIds)
          .not("reader_comment", "is", null)
          .order("created_at", { ascending: false })
          .limit(14)
      : Promise.resolve({
          data: [] as {
            reader_comment: string;
            created_at: string;
            chapter_id: string;
          }[],
        }),
    chIds.length
      ? db
          .from("sessions")
          .select("amount_settled_usdc")
          .in("chapter_id", chIds)
          .not("amount_settled_usdc", "is", null)
      : Promise.resolve({ data: [] as { amount_settled_usdc: number }[] }),
  ]);

  const totalReads = chapters.reduce((s, c) => s + c.read_count, 0);
  const prices = chapters.map((c) => Number(c.current_price_usdc));
  const perChapterAvg = prices.length
    ? prices.reduce((a, b) => a + b, 0) / prices.length
    : 0.04;
  const suggestedPass = Math.max(
    0.99,
    Math.round(prices.reduce((a, b) => a + b, 0) * 0.7 * 100) / 100,
  );
  const settled = (sessRows ?? []).map((s) => Number(s.amount_settled_usdc));
  const avgSession = settled.length
    ? settled.reduce((a, b) => a + b, 0) / settled.length
    : perChapterAvg;
  const completion = Number(series.avg_completion_rate) || 0.6;
  const rating = Math.min(
    4.95,
    Math.max(3.5, Math.round((3.7 + completion * 1.25) * 100) / 100),
  );
  const contentType = chapters[0]?.content_type ?? "text";
  const freq = updateFrequency(chapters.map((c) => c.created_at));
  const chTitle = new Map(
    chapters.map((c) => [c.id, `Ch ${c.chapter_number}`]),
  );

  const tags = [
    ...new Set(
      [
        series.genre,
        ...(GENRE_TAGS[(series.genre ?? "").toLowerCase()] ?? []),
      ].filter(Boolean),
    ),
  ] as string[];
  const related = all.filter((s) => s.id !== series.id);
  const sameGenre = related.filter((s) => s.genre === series.genre);
  const youMayLike = (sameGenre.length >= 4 ? sameGenre : related).slice(0, 6);

  const stats = [
    { label: "Chapters", value: `${chapters.length}` },
    { label: "Readers", value: series.follower_count.toLocaleString() },
    { label: "Reads", value: totalReads.toLocaleString() },
    { label: "Avg / session", value: `$${avgSession.toFixed(2)}` },
  ];
  const comments = (commentRows ?? []).map((r) => ({
    text: r.reader_comment,
    who: chTitle.get(r.chapter_id) ?? "Chapter",
    when: new Date(r.created_at).toLocaleDateString(),
  }));

  return (
    <>
      <AppHeader />
      <div className="mx-auto max-w-5xl space-y-12 px-6 py-10">
        {/* Breadcrumb */}
        <nav className="text-utility flex items-center gap-2 text-[var(--color-muted)]">
          <Link href="/read" className="hover:text-[var(--color-ink)]">
            Discover
          </Link>
          {series.genre && (
            <>
              <span>/</span>
              <span className="text-[var(--color-ink)]">{series.genre}</span>
            </>
          )}
        </nav>

        {/* Header — bigger cover, stats sit under the plot + tags */}
        <header className="flex flex-col gap-8 sm:flex-row">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={coverFor(series.id, series.cover_image)}
            alt={series.title}
            className="h-96 w-64 shrink-0 self-start border border-[var(--color-border)] object-cover grayscale-[0.12]"
          />
          <div className="min-w-0 flex-1 space-y-4">
            <div>
              <div className="flex flex-wrap items-center gap-2 text-utility text-[var(--color-muted)]">
                <span className="bg-[var(--color-surface-2)] px-2 py-0.5 text-[var(--color-gold)]">
                  {series.status}
                </span>
                <span>{contentType === "images" ? "Manhwa" : "Webnovel"}</span>
                <span className="inline-flex items-center gap-1 text-[var(--color-ink)]">
                  <Star /> {rating.toFixed(2)}
                </span>
              </div>
              <h1 className="font-display display-md mt-3 font-bold">
                {series.title}
              </h1>
              {creator && (
                <p className="mt-1 text-sm text-[var(--color-muted)]">
                  by {creator.name ?? "Anonymous"}
                </p>
              )}
            </div>

            {series.description && (
              <p className="clamp-3 text-[var(--color-muted)]">
                {series.description}
              </p>
            )}

            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {tags.slice(0, 6).map((t) => (
                  <span
                    key={t}
                    className="border border-[var(--color-border)] px-2 py-0.5 text-xs text-[var(--color-muted)]"
                  >
                    #{t}
                  </span>
                ))}
              </div>
            )}

            {/* Stats under the plot + tags */}
            <div className="flex flex-wrap gap-x-8 gap-y-3 border border-[var(--color-border)] divide-x justify-start items-start">
              {stats.map((s) => (
                <div
                  key={s.label}
                  className="py-2 flex flex-col items-center justify-center w-1/5"
                >
                  <p className="tabular text-lg font-semibold text-[var(--color-ink)]">
                    {s.value}
                  </p>
                  <p className="text-utility text-[var(--color-muted)]">
                    {s.label}
                  </p>
                </div>
              ))}
            </div>
            {freq && (
              <p className="text-xs text-[var(--color-muted)]">⟳ {freq}</p>
            )}
          </div>
        </header>

        {/* Payment modes + start reading */}
        <section className="space-y-4">
          <h2 className="font-display text-2xl font-semibold">
            Choose how you read
          </h2>
          <PaymentModes
            seriesId={series.id}
            status={series.status}
            firstChapterId={chapters[0]?.id ?? null}
            suggestedPass={suggestedPass}
            perChapterAvg={perChapterAvg}
          />
        </section>

        {/* About / Contents tabs */}
        <SeriesTabs
          chapterCount={chapters.length}
          about={
            <div className="space-y-10">
              <div className="space-y-4">
                <h3 className="font-display text-xl font-semibold">Synopsis</h3>
                {series.description ? (
                  <p className="max-w-2xl leading-relaxed text-[var(--color-muted)]">
                    {series.description}
                  </p>
                ) : (
                  <p className="text-sm text-[var(--color-muted)]">
                    No synopsis yet.
                  </p>
                )}
              </div>

              {comments.length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-display text-xl font-semibold">
                    What readers are saying
                  </h3>
                  <CommentsMarquee comments={comments} />
                </div>
              )}
            </div>
          }
          contents={
            chapters.length === 0 ? (
              <p className="text-sm text-[var(--color-muted)]">
                No chapters published yet.
              </p>
            ) : (
              <ul className="divide-y divide-[var(--color-border)] border border-[var(--color-border)]">
                {chapters.map((c) => (
                  <li key={c.id}>
                    <Link
                      href={`/chapter/${c.id}`}
                      className="flex items-center gap-4 bg-[var(--color-surface)] px-4 py-3 transition-colors hover:bg-[var(--color-surface-2)]"
                    >
                      <span className="tabular w-8 shrink-0 text-sm text-[var(--color-muted)]">
                        {String(c.chapter_number).padStart(2, "0")}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {c.title ?? `Chapter ${c.chapter_number}`}
                        </p>
                        <p className="text-utility mt-0.5 text-[var(--color-muted)]">
                          {c.content_type === "text"
                            ? `${c.word_count.toLocaleString()} words · ~${estimatedReadMinutes(c.word_count)} min`
                            : `${c.word_count} panels`}
                        </p>
                      </div>
                      <div
                        className="hidden w-24 shrink-0 sm:block"
                        title={`${Math.round(Number(c.completion_rate) * 100)}% completion`}
                      >
                        <div className="h-1 w-full bg-[var(--color-surface-2)]">
                          <div
                            className={`h-full ${Number(c.completion_rate) >= 0.75 ? "bg-[var(--color-accent-2)]" : "bg-[var(--color-gold)]"}`}
                            style={{
                              width: `${Math.min(100, Number(c.completion_rate) * 100)}%`,
                            }}
                          />
                        </div>
                      </div>
                      <span className="tabular w-12 shrink-0 text-right text-sm font-semibold text-[var(--color-gold)]">
                        ${Number(c.current_price_usdc).toFixed(2)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )
          }
        />

        {/* You may also like */}
        {youMayLike.length > 0 && (
          <section className="space-y-4">
            <h2 className="font-display text-2xl font-semibold">
              You may also like
            </h2>
            <div className="grid grid-cols-3 gap-x-4 gap-y-6 sm:grid-cols-6">
              {youMayLike.map((s) => (
                <Link
                  key={s.id}
                  href={`/series/${s.slug ?? s.id}`}
                  className="group block"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={coverFor(s.id, s.cover_image)}
                    alt={s.title}
                    className="aspect-[2/3] w-full border border-[var(--color-border)] object-cover grayscale-[0.15] transition-all group-hover:border-[var(--color-gold)] group-hover:grayscale-0"
                  />
                  <p className="font-display clamp-2 mt-2 text-sm font-semibold leading-tight group-hover:text-[var(--color-gold)]">
                    {s.title}
                  </p>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </>
  );
}

function Star() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="14"
      height="14"
      className="fill-[var(--color-gold)]"
      aria-hidden
    >
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  );
}

/** Horizontal marquee of reader reactions (CSS-only; pauses on hover). */
function CommentsMarquee({
  comments,
}: {
  comments: { text: string; who: string; when: string }[];
}) {
  const loop = [...comments, ...comments];
  return (
    <div className="group relative overflow-hidden">
      <div className="marquee-text flex w-max gap-4 group-hover:[animation-play-state:paused]">
        {loop.map((c, i) => (
          <figure
            key={i}
            className="flex w-80 shrink-0 flex-col justify-between border border-[var(--color-border)] bg-[var(--color-surface)] p-4"
          >
            <blockquote className="text-sm leading-relaxed">
              “{c.text}”
            </blockquote>
            <figcaption className="text-utility mt-3 text-[var(--color-muted)]">
              {c.who} · {c.when}
            </figcaption>
          </figure>
        ))}
      </div>
      {/* edge fades */}
      <div className="pointer-events-none absolute inset-y-0 left-0 w-12 bg-gradient-to-r from-[var(--color-bg)] to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-[var(--color-bg)] to-transparent" />
    </div>
  );
}
