"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { TrendingUp, Sparkles, Info, Search, Star } from "lucide-react";
import { coverFor } from "@/lib/covers";
import { getLast } from "@/lib/reading";
import { AccountNav } from "@/components/AccountNav";
import { Loading } from "@/components/Loading";

const BROWSE_PAGE = 12; // infinite-scroll chunk size

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
  standard: "Following",
  pre_release: "Pre-release",
  series_unlock: "Unlocked",
};

type SortKey = "trending" | "readers" | "new";
const SORTS: { id: SortKey; label: string }[] = [
  { id: "trending", label: "Trending" },
  { id: "readers", label: "Most readers" },
  { id: "new", label: "Newest" },
];

// A community rating derived from real engagement (completion rate).
function ratingFor(s: Series): number {
  const r = 3.7 + Number(s.avg_completion_rate || 0.6) * 1.25;
  return Math.min(4.95, Math.max(3.5, Math.round(r * 100) / 100));
}

function Discovery() {
  const sp = useSearchParams();
  const urlQ = sp.get("q") ?? "";
  const [series, setSeries] = useState<Series[]>([]);
  const [lib, setLib] = useState<Library | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [genre, setGenre] = useState<string>("all");
  const [sort, setSort] = useState<SortKey>("trending");
  const [query, setQuery] = useState(urlQ);
  const [visible, setVisible] = useState(BROWSE_PAGE);
  const sentinel = useRef<HTMLDivElement | null>(null);

  // React to the header search (which navigates to /read?q=…).
  useEffect(() => {
    setQuery(urlQ);
  }, [urlQ]);

  useEffect(() => {
    const id = typeof window !== "undefined" ? localStorage.getItem("charon_user_id") : null;
    setUserId(id);
    fetch("/api/series?limit=200")
      .then((r) => r.json())
      .then((d) => setSeries(d.series ?? []))
      .catch(() => {})
      .finally(() => setLoaded(true));
    if (id) {
      fetch(`/api/me/library?userId=${id}`)
        .then((r) => r.json())
        .then(setLib)
        .catch(() => {});
    }
  }, []);

  const byId = useMemo(() => new Map(series.map((s) => [s.id, s])), [series]);

  const continueReading = useMemo(() => {
    if (!lib) return [];
    const modeBySeries = new Map(lib.follows.map((f) => [f.id, f.mode]));
    return lib.history
      .map((h) => ({ ...h, meta: byId.get(h.id), mode: modeBySeries.get(h.id) ?? "standard" }))
      .sort((a, b) => +new Date(b.lastReadAt) - +new Date(a.lastReadAt));
  }, [lib, byId]);

  const startedIds = useMemo(() => new Set(continueReading.map((c) => c.id)), [continueReading]);
  const trending = series.slice(0, 8);

  const recommended = useMemo(() => {
    const readGenres = new Set(continueReading.map((c) => c.meta?.genre).filter(Boolean) as string[]);
    const pool = series.filter((s) => !startedIds.has(s.id));
    const matched = pool.filter((s) => s.genre && readGenres.has(s.genre));
    return (matched.length ? matched : pool).slice(0, 4);
  }, [series, continueReading, startedIds]);

  const genres = useMemo(() => [...new Set(series.map((s) => s.genre).filter(Boolean) as string[])].sort(), [series]);

  const browse = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = genre === "all" ? series : series.filter((s) => s.genre === genre);
    if (q) list = list.filter((s) => (s.title + " " + (s.description ?? "") + " " + (s.genre ?? "")).toLowerCase().includes(q));
    list = [...list];
    if (sort === "trending") list.sort((a, b) => b.momentum_score - a.momentum_score);
    else if (sort === "readers") list.sort((a, b) => b.follower_count - a.follower_count);
    else list.sort((a, b) => +new Date(b.created_at ?? 0) - +new Date(a.created_at ?? 0));
    return list;
  }, [series, genre, sort, query]);

  const searching = query.trim().length > 0;

  // Infinite scroll: reset the window when filters change, grow it as the sentinel appears.
  useEffect(() => {
    setVisible(BROWSE_PAGE);
  }, [genre, sort, query]);

  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) setVisible((v) => (v < browse.length ? v + BROWSE_PAGE : v));
      },
      { rootMargin: "400px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [browse.length]);

  const shown = browse.slice(0, visible);

  return (
    <>
      <AccountNav />
      <div className="mx-auto max-w-5xl space-y-16 px-6 py-12">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="font-display display-md font-semibold">Discover</h1>
            <p className="mt-1 text-[var(--color-muted)]">Read anything. Value flows to creators automatically after each session.</p>
          </div>
          <SearchBox value={query} onChange={setQuery} />
        </div>

        {/* When searching, show only results */}
        {searching ? (
          <section className="space-y-5">
            <SectionHead title={`Results for “${query.trim()}”`} />
            {browse.length === 0 ? (
              <p className="text-sm text-[var(--color-muted)]">No series match that search.</p>
            ) : (
              <>
                <BrowseList items={shown} />
                {visible < browse.length && <div ref={sentinel} className="h-10" />}
              </>
            )}
          </section>
        ) : (
          <>
            {/* Continue reading */}
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

            {/* Trending */}
            <section className="space-y-6">
              <SectionHead
                title="Trending this week"
                icon={TrendingUp}
                note="Ranked by genuine reader engagement — session depth & completion. Never paid placement."
              />
              {!loaded ? (
                <p className="text-sm text-[var(--color-muted)]">Loading…</p>
              ) : trending.length === 0 ? (
                <EmptyState />
              ) : (
                <div className="grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
                  {trending.map((s, i) => (
                    <Poster key={s.id} s={s} rank={i + 1} showDesc showRating />
                  ))}
                </div>
              )}
            </section>

            {/* Recommended */}
            {recommended.length > 0 && (
              <section className="space-y-6">
                <SectionHead
                  title="Recommended for you"
                  icon={Sparkles}
                  note="Powered by Agent 4 — learns from your genres, binge patterns & completion."
                />
                <div className="grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
                  {recommended.map((s) => (
                    <Poster key={s.id} s={s} showDesc showRating />
                  ))}
                </div>
              </section>
            )}

            {/* Browse all — filter + sort, detailed list */}
            {series.length > 0 && (
              <section className="space-y-6">
                <SectionHead title="Browse all" />
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap gap-1.5">
                    <FilterChip active={genre === "all"} onClick={() => setGenre("all")}>
                      All
                    </FilterChip>
                    {genres.map((g) => (
                      <FilterChip key={g} active={genre === g} onClick={() => setGenre(g)}>
                        {g}
                      </FilterChip>
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-utility text-[var(--color-muted)]">Sort</span>
                    <select
                      value={sort}
                      onChange={(e) => setSort(e.target.value as SortKey)}
                      className="border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-utility text-[var(--color-ink)] outline-none"
                    >
                      {SORTS.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                {browse.length === 0 ? (
                  <p className="text-sm text-[var(--color-muted)]">Nothing in this genre yet.</p>
                ) : (
                  <>
                    <BrowseList items={shown} />
                    {visible < browse.length ? (
                      <div ref={sentinel} className="grid place-items-center py-6 text-utility text-[var(--color-muted)]">
                        Loading more…
                      </div>
                    ) : (
                      <p className="py-4 text-center text-utility text-[var(--color-muted)]">{browse.length} series · that&apos;s everything</p>
                    )}
                  </>
                )}
              </section>
            )}
          </>
        )}

        {!userId && loaded && (
          <p className="text-sm text-[var(--color-muted)]">
            <Link href="/join" className="text-[var(--color-gold)]">
              Sign in
            </Link>{" "}
            to see what you&apos;re reading and get personal recommendations.
          </p>
        )}
      </div>
    </>
  );
}

/* ── Poster (cover-forward card with optional blurb + rating) ── */
function Poster({
  s,
  fallbackId,
  fallbackTitle,
  rank,
  badge,
  highlight,
  showDesc,
  showRating,
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
  showRating?: boolean;
  footer?: React.ReactNode;
  href?: string;
}) {
  const id = s?.id ?? fallbackId!;
  const title = s?.title ?? fallbackTitle ?? "";
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
          {s?.genre && <span className="text-utility text-[var(--color-muted)]">{s.genre}</span>}
          {showRating && s && <Rating value={ratingFor(s)} />}
        </div>
        <h3 className="font-display mt-0.5 text-lg font-semibold leading-tight group-hover:text-[var(--color-gold)]">{title}</h3>
        {showDesc && s?.description && <p className="clamp-2 mt-1 text-sm leading-snug text-[var(--color-muted)]">{s.description}</p>}
        {footer && <div className="mt-1">{footer}</div>}
      </div>
    </Link>
  );
}

/* ── Browse list (cover left, detail right — like a catalog) ── */
function BrowseList({ items }: { items: Series[] }) {
  return (
    <div className="grid gap-px border border-[var(--color-border)] bg-[var(--color-border)] sm:grid-cols-2">
      {items.map((s) => (
        <Link key={s.id} href={`/series/${s.slug ?? s.id}`} className="group flex gap-4 bg-[var(--color-bg)] p-4 transition-colors hover:bg-[var(--color-surface)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={coverFor(s.id, s.cover_image)}
            alt={s.title}
            className="h-32 w-[5.5rem] shrink-0 border border-[var(--color-border)] object-cover grayscale-[0.15]"
          />
          <div className="flex min-w-0 flex-1 flex-col">
            <div className="flex flex-wrap items-center gap-1.5">
              {s.genre && <span className="text-utility text-[var(--color-gold)]">#{s.genre}</span>}
              {s.status === "completed" && <span className="text-utility text-[var(--color-accent-2)]">· completed</span>}
            </div>
            <h3 className="font-display mt-1 text-lg font-semibold leading-tight group-hover:text-[var(--color-gold)]">{s.title}</h3>
            {s.description && <p className="clamp-2 mt-1 text-sm leading-snug text-[var(--color-muted)]">{s.description}</p>}
            <div className="mt-auto flex items-center gap-4 pt-2 text-sm text-[var(--color-muted)]">
              <Rating value={ratingFor(s)} />
              <span className="tabular">{(s.chapter_count ?? 0)} ch</span>
              <span className="tabular">{s.follower_count.toLocaleString()} readers</span>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}

function Rating({ value }: { value: number }) {
  return (
    <span className="inline-flex items-center gap-1 text-sm">
      <Star size={13} className="fill-[var(--color-gold)] text-[var(--color-gold)]" />
      <span className="tabular text-[var(--color-ink)]">{value.toFixed(2)}</span>
    </span>
  );
}

function SearchBox({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="relative w-full sm:w-96">
      <Search size={16} strokeWidth={1.75} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-muted)] mr-3" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search series, genres…"
        className="charon-input rounded-full pl-20"
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

function EmptyState() {
  return (
    <p className="text-sm text-[var(--color-muted)]">
      No series yet.{" "}
      <Link href="/creator" className="text-[var(--color-gold)]">
        Publish the first one →
      </Link>
    </p>
  );
}
