"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { TrendingUp, Sparkles, Info, Search, ChevronLeft, ChevronRight, Users, BookText } from "lucide-react";
import { coverFor } from "@/lib/covers";
import { getLast } from "@/lib/reading";
import { AccountNav } from "@/components/AccountNav";
import { Loading } from "@/components/Loading";
import EmptyState from "@/components/EmptyState";
import { useCachedFetch } from "@/lib/use-cached-fetch";

const PAGE_SIZE = 12;

export default function DiscoveryPage() {
  return (
    <Suspense fallback={<Loading full />}>
      <Discovery />
    </Suspense>
  );
}

interface Series {
  id: string;
  slug?: string | null;
  title: string;
  genre: string | null;
  description: string | null;
  status: string;
  cover_image: string | null;
  follower_count: number;
  avg_completion_rate: number;
  momentum_score: number;
  chapter_count?: number;
  created_at?: string;
}

interface Library {
  follows: { id: string; title: string; genre: string | null; status: string; mode: string }[];
  history: { id: string; title: string; chaptersRead: number; lastReadAt: string }[];
}

const MODE_LABEL: Record<string, string> = {
  standard: "In library",
  pre_release: "Pre-release",
  series_unlock: "Unlocked",
  reading: "Reading",
};

type SortKey = "ranked" | "trending" | "readers" | "new";
const SORTS: { id: SortKey; label: string }[] = [
  { id: "ranked", label: "Top ranked" },
  { id: "trending", label: "Trending" },
  { id: "readers", label: "Most readers" },
  { id: "new", label: "Newest" },
];

const GENRES_SHOWN = 10; // tags shown before the "more" toggle

/** Genres are a comma-separated tag list — split them everywhere. */
function genresOf(s: Series): string[] {
  return (s.genre ?? "").split(",").map((g) => g.trim()).filter(Boolean);
}

/** Overall rank score — quality (completion) + reach (readers) + momentum. */
function rankScore(s: Series): number {
  return Number(s.follower_count) + Number(s.momentum_score) * 0.5 + Number(s.avg_completion_rate) * 100;
}

function Discovery() {
  const sp = useSearchParams();
  const urlQ = sp.get("q") ?? "";
  const [userId, setUserId] = useState<string | null>(null);
  const [genre, setGenre] = useState<string>("all");
  const [sort, setSort] = useState<SortKey>("ranked");
  const [query, setQuery] = useState(urlQ);
  const [page, setPage] = useState(1);
  const [showAllGenres, setShowAllGenres] = useState(false);

  // Cached: re-visiting Discover paints instantly, then revalidates.
  const { data: seriesData, loading } = useCachedFetch<{ series: Series[] }>("/api/series?limit=200", "series:all");
  const series = useMemo(() => seriesData?.series ?? [], [seriesData]);
  const { data: lib } = useCachedFetch<Library>(userId ? `/api/me/library?userId=${userId}` : null, `library:${userId ?? "anon"}`);

  useEffect(() => {
    setUserId(typeof window !== "undefined" ? localStorage.getItem("charon_user_id") : null);
  }, []);
  useEffect(() => setQuery(urlQ), [urlQ]);

  const byId = useMemo(() => new Map(series.map((s) => [s.id, s])), [series]);

  const continueReading = useMemo(() => {
    if (!lib) return [];
    const modeBySeries = new Map(lib.follows.map((f) => [f.id, f.mode]));
    return lib.history
      .map((h) => ({ ...h, meta: byId.get(h.id), mode: modeBySeries.get(h.id) ?? "reading" }))
      .sort((a, b) => +new Date(b.lastReadAt) - +new Date(a.lastReadAt));
  }, [lib, byId]);

  const startedIds = useMemo(() => new Set(continueReading.map((c) => c.id)), [continueReading]);
  const trending = useMemo(() => [...series].sort((a, b) => b.momentum_score - a.momentum_score).slice(0, 8), [series]);

  const recommended = useMemo(() => {
    const readGenres = new Set(continueReading.flatMap((c) => (c.meta ? genresOf(c.meta) : [])));
    const pool = series.filter((s) => !startedIds.has(s.id));
    const matched = pool.filter((s) => genresOf(s).some((g) => readGenres.has(g)));
    return (matched.length ? matched : pool).slice(0, 4);
  }, [series, continueReading, startedIds]);

  const genres = useMemo(() => [...new Set(series.flatMap(genresOf))].sort(), [series]);

  const browse = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = genre === "all" ? series : series.filter((s) => genresOf(s).some((g) => g.toLowerCase() === genre.toLowerCase()));
    if (q) list = list.filter((s) => (s.title + " " + (s.description ?? "") + " " + (s.genre ?? "")).toLowerCase().includes(q));
    list = [...list];
    if (sort === "ranked") list.sort((a, b) => rankScore(b) - rankScore(a));
    else if (sort === "trending") list.sort((a, b) => b.momentum_score - a.momentum_score);
    else if (sort === "readers") list.sort((a, b) => b.follower_count - a.follower_count);
    else list.sort((a, b) => +new Date(b.created_at ?? 0) - +new Date(a.created_at ?? 0));
    return list;
  }, [series, genre, sort, query]);

  const searching = query.trim().length > 0;

  useEffect(() => setPage(1), [genre, sort, query]);
  const totalPages = Math.max(1, Math.ceil(browse.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = browse.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  return (
    <>
      <AccountNav />
      <div className="mx-auto max-w-5xl space-y-16 px-6 py-12">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="font-display display-md font-semibold">Discover</h1>
            <p className="mt-1 text-[var(--color-muted)]">Read anything. After each session, a few cents go to the creators you read.</p>
          </div>
          {/* <SearchBox value={query} onChange={setQuery} /> */}
        </div>

        {loading && series.length === 0 ? (
          <PosterGridSkeleton />
        ) : searching ? (
          <section className="space-y-5">
            <SectionHead title={`Results for “${query.trim()}”`} />
            {browse.length === 0 ? (
              <EmptyState
                variant="inline"
                icon={<Search size={26} strokeWidth={1.5} />}
                title="No matches"
                description={`Nothing matched “${query.trim()}”. Try a different title, author, or genre.`}
              />
            ) : (
              <>
                <BrowseList items={pageItems} />
                <Pagination page={safePage} totalPages={totalPages} onPage={setPage} total={browse.length} />
              </>
            )}
          </section>
        ) : (
          <>
            {userId && !lib && (
              <section className="space-y-6">
                <SectionHead title="Continue reading" />
                <div className="grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="space-y-3">
                      <div className="aspect-[2/3] w-full animate-pulse bg-[var(--color-surface)]" />
                      <div className="h-3 w-1/2 animate-pulse bg-[var(--color-surface)]" />
                      <div className="h-4 w-3/4 animate-pulse bg-[var(--color-surface)]" />
                    </div>
                  ))}
                </div>
              </section>
            )}
            {continueReading.length > 0 && (
              <section className="space-y-6">
                <SectionHead title="Continue reading" />
                <div className="grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
                  {continueReading.map((c) => {
                    const last = getLast(c.id);
                    return (
                      <Poster
                        key={c.id}
                        s={c.meta}
                        fallbackId={c.id}
                        fallbackTitle={c.title}
                        href={last ? `/chapter/${last.chapterId}` : undefined}
                        highlight={c.mode === "pre_release"}
                        badge={MODE_LABEL[c.mode] ?? c.mode}
                        footer={
                          last ? (
                            <div>
                              <div className="h-1 w-full bg-[var(--color-surface-2)]">
                                <div className="h-full bg-[var(--color-gold)]" style={{ width: `${Math.round(last.pct * 100)}%` }} />
                              </div>
                              <p className="mt-1 text-xs text-[var(--color-muted)]">Resume Ch {last.n} · {Math.round(last.pct * 100)}%</p>
                            </div>
                          ) : c.mode === "pre_release" ? (
                            <span className="text-xs font-medium text-[var(--color-gold)]">New chapter available</span>
                          ) : (
                            <span className="text-xs text-[var(--color-muted)]">{c.chaptersRead} chapters read</span>
                          )
                        }
                      />
                    );
                  })}
                </div>
              </section>
            )}

            <section className="space-y-6">
              <SectionHead
                title="Trending this week"
                icon={TrendingUp}
                note="Ranked by real reader engagement: reading depth and completion. Never paid placement."
              />
              {trending.length === 0 ? (
                <EmptyState
                  variant="inline"
                  icon={<BookText size={26} strokeWidth={1.5} />}
                  title="No series yet"
                  description="Be the first to publish a story on Charon."
                  actionHref="/creator"
                  actionLabel="Publish the first one"
                />
              ) : (
                <div className="grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
                  {trending.map((s, i) => (
                    <Poster key={s.id} s={s} rank={i + 1} showDesc showStats />
                  ))}
                </div>
              )}
            </section>

            {recommended.length > 0 && (
              <section className="space-y-6">
                <SectionHead
                  title="Recommended for you"
                  icon={Sparkles}
                  note="Powered by Agent 4. It learns from your genres, what you binge, and what you finish."
                />
                <div className="grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
                  {recommended.map((s) => (
                    <Poster key={s.id} s={s} showDesc showStats />
                  ))}
                </div>
              </section>
            )}

            {series.length > 0 && (
              <section className="space-y-6">
                <SectionHead title="Browse all" note={`${browse.length} series`} />
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap gap-1.5">
                    <FilterChip active={genre === "all"} onClick={() => setGenre("all")}>All</FilterChip>
                    {(showAllGenres ? genres : genres.slice(0, GENRES_SHOWN)).map((g) => (
                      <FilterChip key={g} active={genre.toLowerCase() === g.toLowerCase()} onClick={() => setGenre(g)}>
                        {g}
                      </FilterChip>
                    ))}
                    {genres.length > GENRES_SHOWN && (
                      <button
                        onClick={() => setShowAllGenres((v) => !v)}
                        className="whitespace-nowrap rounded-full border border-dashed border-[var(--color-border)] px-3 py-1 text-utility text-[var(--color-muted)] transition-colors hover:border-[var(--color-gold)] hover:text-[var(--color-ink)]"
                      >
                        {showAllGenres ? "Less" : `+${genres.length - GENRES_SHOWN} more`}
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-utility text-[var(--color-muted)]">Sort</span>
                    <select
                      value={sort}
                      onChange={(e) => setSort(e.target.value as SortKey)}
                      className="border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-utility text-[var(--color-ink)] outline-none"
                    >
                      {SORTS.map((s) => (
                        <option key={s.id} value={s.id}>{s.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
                {browse.length === 0 ? (
                  <EmptyState variant="inline" title="Nothing in this genre yet" />
                ) : (
                  <>
                    <BrowseList items={pageItems} rankFrom={sort === "ranked" ? (safePage - 1) * PAGE_SIZE : null} />
                    <Pagination page={safePage} totalPages={totalPages} onPage={setPage} total={browse.length} />
                  </>
                )}
              </section>
            )}
          </>
        )}

        {!userId && !loading && (
          <p className="text-sm text-[var(--color-muted)]">
            <Link href="/join" className="text-[var(--color-gold)]">Sign in</Link> to see what you&apos;re reading and get personal recommendations.
          </p>
        )}
      </div>
    </>
  );
}

/* ── Poster (cover-forward card) ── */
function Poster({
  s,
  fallbackId,
  fallbackTitle,
  rank,
  badge,
  highlight,
  showDesc,
  showStats,
  footer,
  href,
}: {
  s?: Series;
  fallbackId?: string;
  fallbackTitle?: string;
  rank?: number;
  badge?: string;
  highlight?: boolean;
  showDesc?: boolean;
  showStats?: boolean;
  footer?: React.ReactNode;
  href?: string;
}) {
  const id = s?.id ?? fallbackId!;
  const title = s?.title ?? fallbackTitle ?? "";
  const primary = s ? genresOf(s)[0] : undefined;
  return (
    <Link href={href ?? `/series/${s?.slug ?? id}`} className="group block">
      <div
        className={`relative aspect-[2/3] w-full overflow-hidden border bg-[var(--color-surface)] transition-colors ${
          highlight ? "border-[var(--color-gold)]" : "border-[var(--color-border)] group-hover:border-[var(--color-gold)]"
        }`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={coverFor(id, s?.cover_image ?? null)}
          alt={title}
          className="h-full w-full object-cover grayscale-[0.15] transition-all duration-500 group-hover:grayscale-0 group-hover:scale-[1.03]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />
        {rank != null && (
          <span className="font-display absolute bottom-1 left-2 text-5xl font-bold text-white/85 drop-shadow">{String(rank).padStart(2, "0")}</span>
        )}
        {badge && (
          <span className="text-utility absolute right-2 top-2 bg-[var(--color-bg)]/80 px-2 py-0.5 text-[var(--color-gold)] backdrop-blur">{badge}</span>
        )}
      </div>
      <div className="mt-3">
        <div className="flex items-center justify-between gap-2">
          {primary && <span className="text-utility text-[var(--color-muted)]">{primary}</span>}
          {showStats && s && (
            <span className="text-utility inline-flex items-center gap-1 text-[var(--color-muted)]">
              <Users size={11} /> {s.follower_count.toLocaleString()}
            </span>
          )}
        </div>
        <h3 className="font-display mt-0.5 text-lg font-semibold leading-tight group-hover:text-[var(--color-gold)]">{title}</h3>
        {showDesc && s?.description && <p className="clamp-2 mt-1 text-sm leading-snug text-[var(--color-muted)]">{s.description}</p>}
        {footer && <div className="mt-1">{footer}</div>}
      </div>
    </Link>
  );
}

/* ── Browse list (catalog row) — real stats only ── */
function BrowseList({ items, rankFrom = null }: { items: Series[]; rankFrom?: number | null }) {
  return (
    <div className="grid gap-px border border-[var(--color-border)] bg-[var(--color-border)] sm:grid-cols-2">
      {items.map((s, i) => {
        const tags = genresOf(s);
        return (
          <Link key={s.id} href={`/series/${s.slug ?? s.id}`} className="group flex gap-4 bg-[var(--color-bg)] p-4 transition-colors hover:bg-[var(--color-surface)]">
            {rankFrom != null && (
              <span className="font-display w-7 shrink-0 self-center text-center text-xl font-bold text-[var(--color-muted)]">
                {rankFrom + i + 1}
              </span>
            )}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={coverFor(s.id, s.cover_image)}
              alt={s.title}
              className="h-32 w-[5.5rem] shrink-0 border border-[var(--color-border)] object-cover grayscale-[0.15]"
            />
            <div className="flex min-w-0 flex-1 flex-col">
              <div className="flex flex-wrap items-center gap-1.5">
                {tags.slice(0, 3).map((t) => (
                  <span key={t} className="text-utility text-[var(--color-gold)]">#{t}</span>
                ))}
                {s.status === "completed" && <span className="text-utility text-[var(--color-accent-2)]">· completed</span>}
              </div>
              <h3 className="font-display mt-1 text-lg font-semibold leading-tight group-hover:text-[var(--color-gold)]">{s.title}</h3>
              {s.description && <p className="clamp-2 mt-1 text-sm leading-snug text-[var(--color-muted)]">{s.description}</p>}
              <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 pt-2 text-sm text-[var(--color-muted)]">
                <span className="tabular inline-flex items-center gap-1"><BookText size={12} /> {s.chapter_count ?? 0} ch</span>
                <span className="tabular inline-flex items-center gap-1"><Users size={12} /> {s.follower_count.toLocaleString()}</span>
                {s.avg_completion_rate > 0 && <span className="tabular">{Math.round(Number(s.avg_completion_rate) * 100)}% finish</span>}
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

function Pagination({ page, totalPages, onPage, total }: { page: number; totalPages: number; onPage: (p: number) => void; total: number }) {
  if (totalPages <= 1) return <p className="py-2 text-center text-utility text-[var(--color-muted)]">{total} series</p>;
  const nums = pageNumbers(page, totalPages);
  return (
    <div className="flex flex-wrap items-center justify-center gap-1.5 pt-2">
      <PageBtn disabled={page <= 1} onClick={() => onPage(page - 1)} aria="Previous page"><ChevronLeft size={15} /></PageBtn>
      {nums.map((n, i) =>
        n === "…" ? (
          <span key={`e${i}`} className="px-1 text-utility text-[var(--color-muted)]">…</span>
        ) : (
          <button
            key={n}
            onClick={() => onPage(n)}
            aria-current={n === page ? "page" : undefined}
            className={`tabular min-w-9 rounded-full border px-3 py-1.5 text-sm transition-colors ${
              n === page ? "border-[var(--color-gold)] bg-[var(--color-gold)] text-black" : "border-[var(--color-border)] text-[var(--color-muted)] hover:border-[var(--color-muted)] hover:text-[var(--color-ink)]"
            }`}
          >
            {n}
          </button>
        ),
      )}
      <PageBtn disabled={page >= totalPages} onClick={() => onPage(page + 1)} aria="Next page"><ChevronRight size={15} /></PageBtn>
    </div>
  );
}

function PageBtn({ disabled, onClick, children, aria }: { disabled: boolean; onClick: () => void; children: React.ReactNode; aria: string }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={aria}
      className="grid h-9 w-9 place-items-center rounded-full border border-[var(--color-border)] text-[var(--color-muted)] transition-colors hover:border-[var(--color-gold)] hover:text-[var(--color-ink)] disabled:cursor-not-allowed disabled:opacity-35"
    >
      {children}
    </button>
  );
}

/** Compact page list: 1 … 4 5 [6] 7 8 … 20 */
function pageNumbers(page: number, total: number): (number | "…")[] {
  const out: (number | "…")[] = [];
  const add = (n: number) => out.push(n);
  const range = (a: number, b: number) => { for (let i = a; i <= b; i++) add(i); };
  if (total <= 7) { range(1, total); return out; }
  add(1);
  if (page > 4) out.push("…");
  range(Math.max(2, page - 1), Math.min(total - 1, page + 1));
  if (page < total - 3) out.push("…");
  add(total);
  return out;
}

function SearchBox({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="relative w-full sm:w-96">
      <Search size={16} strokeWidth={1.75} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-muted)]" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search series, genres…"
        className="charon-input rounded-full pl-12"
      />
    </div>
  );
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`whitespace-nowrap rounded-full border px-3 py-1 text-utility capitalize transition-colors ${
        active
          ? "border-[var(--color-gold)] bg-[var(--color-gold)] text-black"
          : "border-[var(--color-border)] text-[var(--color-muted)] hover:border-[var(--color-muted)] hover:text-[var(--color-ink)]"
      }`}
    >
      {children}
    </button>
  );
}

function SectionHead({ title, icon: Icon, note }: { title: string; icon?: typeof TrendingUp; note?: string }) {
  return (
    <div>
      <div className="flex items-center gap-2">
        {Icon && <Icon size={18} className="text-[var(--color-gold)]" strokeWidth={1.6} />}
        <h2 className="font-display text-2xl font-semibold">{title}</h2>
      </div>
      {note && (
        <p className="mt-1 flex items-center gap-1.5 text-xs text-[var(--color-muted)]">
          <Info size={12} /> {note}
        </p>
      )}
    </div>
  );
}

function PosterGridSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-7 w-48 animate-pulse bg-[var(--color-surface)]" />
      <div className="grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="space-y-3">
            <div className="aspect-[2/3] w-full animate-pulse bg-[var(--color-surface)]" />
            <div className="h-3 w-1/2 animate-pulse bg-[var(--color-surface)]" />
            <div className="h-4 w-3/4 animate-pulse bg-[var(--color-surface)]" />
          </div>
        ))}
      </div>
    </div>
  );
}
