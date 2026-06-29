import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getCreatorById,
  getSeriesById,
  getSeriesBySlug,
  getUserByEmail,
  listAnnouncementsForSeries,
  listChapters,
  listSeries,
} from "@/lib/db";
import { Megaphone, Check } from "lucide-react";
import { supabaseService } from "@/lib/supabase";
import { supabaseServerAuth } from "@/lib/supabase-server";
import { PaymentModes } from "@/components/PaymentModes";
import { SeriesTabs } from "@/components/SeriesTabs";
import { LibraryButton } from "@/components/LibraryButton";
import { TipJar } from "@/components/TipJar";
import { AppHeader } from "@/components/AppHeader";
import { estimatedReadMinutes } from "@/lib/pricing";
import { coverFor } from "@/lib/covers";

export const dynamic = "force-dynamic";

export default async function SeriesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  // Resolve by slug first (canonical), falling back to id for old links.
  const series = (await getSeriesBySlug(id)) ?? (await getSeriesById(id));
  if (!series) notFound();

  const [creator, chapters, all, announcements] = await Promise.all([
    getCreatorById(series.creator_id),
    listChapters(series.id),
    listSeries(60),
    listAnnouncementsForSeries(series.id, series.creator_id, 3),
  ]);

  const chIds = chapters.map((c) => c.id);
  const db = supabaseService();
  const { data: commentRows } = chIds.length
    ? await db
        .from("sessions")
        .select("reader_comment, created_at, chapter_id")
        .in("chapter_id", chIds)
        .not("reader_comment", "is", null)
        .order("created_at", { ascending: false })
        .limit(14)
    : { data: [] as { reader_comment: string; created_at: string; chapter_id: string }[] };

  // Which chapters has THIS reader already read / own? (drives the "Read" marks)
  const ownedChapterIds = new Set<string>();
  let unlockedSeries = false;
  const {
    data: { user: authUser },
  } = await (await supabaseServerAuth()).auth.getUser();
  if (authUser?.email) {
    const appUser = await getUserByEmail(authUser.email.trim().toLowerCase());
    if (appUser) {
      const { data: follow } = await db
        .from("follows")
        .select("mode")
        .eq("user_id", appUser.id)
        .eq("series_id", series.id)
        .maybeSingle();
      unlockedSeries = (follow as { mode?: string } | null)?.mode === "series_unlock";
      if (chIds.length) {
        const { data: paid } = await db
          .from("payments")
          .select("chapter_id")
          .eq("user_id", appUser.id)
          .eq("status", "settled")
          .in("chapter_id", chIds);
        for (const p of paid ?? []) {
          const cid = (p as { chapter_id: string | null }).chapter_id;
          if (cid) ownedChapterIds.add(cid);
        }
      }
    }
  }

  const totalReads = chapters.reduce((s, c) => s + c.read_count, 0);
  const prices = chapters.map((c) => Number(c.current_price_usdc));
  const perChapterAvg = prices.length
    ? prices.reduce((a, b) => a + b, 0) / prices.length
    : 0.04;
  // Real, creator-set offers — only shown when configured (NULL = not offered).
  const passPrice = series.series_pass_price_usdc != null ? Number(series.series_pass_price_usdc) : null;
  const preReleasePrice = series.pre_release_price_usdc != null ? Number(series.pre_release_price_usdc) : null;
  const contentType = chapters[0]?.content_type ?? "text";
  const chTitle = new Map(
    chapters.map((c) => [c.id, `Ch ${c.chapter_number}`]),
  );

  // Tags are exactly the creator's genres — a comma-separated list, nothing invented.
  const tags = (series.genre ?? "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
  const primaryGenre = tags[0] ?? null;
  const related = all.filter((s) => s.id !== series.id);
  const sameGenre = primaryGenre
    ? related.filter((s) => (s.genre ?? "").toLowerCase().includes(primaryGenre.toLowerCase()))
    : [];
  const youMayLike = (sameGenre.length >= 4 ? sameGenre : related).slice(0, 6);

  const stats = [
    { label: "Chapters", value: `${chapters.length}` },
    { label: "Readers", value: series.follower_count.toLocaleString() },
    { label: "Reads", value: totalReads.toLocaleString() },
    { label: "Base price", value: `$${perChapterAvg.toFixed(2)}` },
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
          {primaryGenre && (
            <>
              <span>/</span>
              <span className="text-[var(--color-ink)]">{primaryGenre}</span>
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
              </div>
              <h1 className="font-display display-md mt-3 font-bold">
                {series.title}
              </h1>
              {creator &&
                (creator.slug ? (
                  <p className="mt-1 text-sm text-[var(--color-muted)]">
                    by{" "}
                    <Link href={`/author/${creator.slug}`} className="text-[var(--color-ink)] underline-offset-2 transition-colors hover:text-[var(--color-gold)] hover:underline">
                      {creator.name ?? "Anonymous"}
                    </Link>
                  </p>
                ) : (
                  <p className="mt-1 text-sm text-[var(--color-muted)]">by {creator.name ?? "Anonymous"}</p>
                ))}
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
                    className="border border-[var(--color-border)] px-2 py-0.5 text-xs text-[var(--color-muted)] uppercase text-utility"
                  >
                    {t}
                  </span>
                ))}
              </div>
            )}

            {/* Stats — even 4-up grid with hairline dividers */}
            <div className="grid grid-cols-4 gap-px border border-[var(--color-border)] bg-[var(--color-border)]">
              {stats.map((s) => (
                <div key={s.label} className="bg-[var(--color-surface)] px-3 py-3 text-center">
                  <p className="tabular text-lg font-semibold text-[var(--color-ink)]">{s.value}</p>
                  <p className="text-utility text-[var(--color-muted)]">{s.label}</p>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-3 pt-1">
              {chapters[0] && (
                <Link href={`/chapter/${chapters[0].id}`} className="btn-coin">
                  Start reading
                </Link>
              )}
              <LibraryButton seriesId={series.id} />
              {chapters[0] && <TipJar chapterId={chapters[0].id} />}
            </div>
          </div>
        </header>

        {/* Author announcements */}
        {announcements.length > 0 && (
          <section className="space-y-3">
            {announcements.map((a) => (
              <div key={a.id} className="border border-[color-mix(in_srgb,var(--color-gold)_30%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-gold)_6%,transparent)] p-5">
                <div className="flex items-center gap-2 text-utility text-[var(--color-gold)]">
                  <Megaphone size={14} /> {creator?.name ? `${creator.name} · ` : ""}Announcement
                  <span className="ml-auto text-[var(--color-muted)]">{new Date(a.created_at).toLocaleDateString()}</span>
                </div>
                {a.title && <p className="font-display mt-2 text-lg font-semibold">{a.title}</p>}
                <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-[var(--color-muted)]">{a.body}</p>
              </div>
            ))}
          </section>
        )}

        {/* Payment modes + start reading */}
        <section className="space-y-4">
          <h2 className="font-display text-2xl font-semibold">
            Choose how you read
          </h2>
          <PaymentModes
            seriesId={series.id}
            status={series.status}
            firstChapterId={chapters[0]?.id ?? null}
            passPrice={passPrice}
            preReleasePrice={preReleasePrice}
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
                      {unlockedSeries || ownedChapterIds.has(c.id) ? (
                        <span className="tabular inline-flex shrink-0 items-center gap-1 text-sm font-medium text-[var(--color-accent-2)]" title="You've read this chapter">
                          <Check size={14} /> Read
                        </span>
                      ) : (
                        <span className="tabular shrink-0 text-right text-sm font-semibold text-[var(--color-gold)]">
                          ${Number(c.current_price_usdc).toFixed(2)}
                        </span>
                      )}
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
