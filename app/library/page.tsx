"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bookmark as BookmarkIcon, X, Plus, Check } from "lucide-react";
import { AccountNav } from "@/components/AccountNav";
import EmptyState from "@/components/EmptyState";
import { coverFor } from "@/lib/covers";
import { listBookmarks, removeBookmark, type Bookmark } from "@/lib/reading";
import { useCachedFetch } from "@/lib/use-cached-fetch";

interface Followed {
  id: string;
  slug: string | null;
  title: string;
  genre: string | null;
  status: string;
  cover_image: string | null;
  mode: string;
}
interface Read {
  id: string;
  slug: string | null;
  title: string;
  genre: string | null;
  cover_image: string | null;
  chaptersRead: number;
  lastReadAt: string;
}
interface Lib {
  follows: Followed[];
  history: Read[];
}

const MODE_LABEL: Record<string, string> = {
  standard: "In library",
  pre_release: "Pre-release",
  series_unlock: "Unlocked",
};

const FEATURED = 6;

export default function LibraryPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [adding, setAdding] = useState<string | null>(null);

  const { data: lib, refresh } = useCachedFetch<Lib>(userId ? `/api/me/library?userId=${userId}` : null, `library:${userId ?? "anon"}`);

  useEffect(() => {
    setBookmarks(listBookmarks());
    const id = localStorage.getItem("charon_user_id");
    if (!id) {
      router.replace("/join");
      return;
    }
    setUserId(id);
  }, [router]);

  async function addToLibrary(seriesId: string) {
    if (!userId) return;
    setAdding(seriesId);
    try {
      await fetch("/api/follow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, seriesId, mode: "standard" }),
      });
      refresh();
    } finally {
      setAdding(null);
    }
  }

  // The library is exactly what you've added — follows, enriched with read counts.
  const followIds = useMemo(() => new Set((lib?.follows ?? []).map((f) => f.id)), [lib]);
  const readCount = useMemo(() => new Map((lib?.history ?? []).map((h) => [h.id, h.chaptersRead])), [lib]);

  const library = useMemo(
    () => (lib?.follows ?? []).map((f) => ({ ...f, chaptersRead: readCount.get(f.id) ?? 0 })),
    [lib, readCount],
  );
  // Read but not added — offered under "Continue reading" with a one-tap add.
  const continueReading = useMemo(
    () => (lib?.history ?? []).filter((h) => !followIds.has(h.id)),
    [lib, followIds],
  );

  const featured = library.slice(0, FEATURED);
  const rest = library.slice(FEATURED);

  return (
    <>
      <AccountNav />
      <div className="mx-auto max-w-5xl space-y-12 px-6 py-10">
        <div>
          <h1 className="font-display display-md font-semibold">Your library</h1>
          <p className="mt-1 text-[var(--color-muted)]">
            {library.length > 0 ? `${library.length} series you've added.` : "Series you add live here. Add the ones you want to keep."}
          </p>
        </div>

        {!lib ? (
          <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="aspect-[2/3] animate-pulse bg-[var(--color-surface)]" />
            ))}
          </div>
        ) : (
          <>
            {/* The library — explicitly added */}
            {library.length === 0 ? (
              <EmptyState
                icon={<Plus size={26} strokeWidth={1.5} />}
                title="Your library is empty"
                description="Add a series from its page, or from what you've read below, to keep it here."
                actionHref="/read"
                actionLabel="Browse stories"
              />
            ) : (
              <>
                <div className="grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 lg:grid-cols-6">
                  {featured.map((it) => (
                    <Link key={it.id} href={`/series/${it.slug ?? it.id}`} className="group block">
                      <div className="relative aspect-[2/3] w-full overflow-hidden border border-[var(--color-border)] transition-colors group-hover:border-[var(--color-gold)]">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={coverFor(it.id, it.cover_image)}
                          alt={it.title}
                          className="h-full w-full object-cover grayscale-[0.15] transition-all duration-500 group-hover:scale-[1.03] group-hover:grayscale-0"
                        />
                        <span className="text-utility absolute right-1.5 top-1.5 bg-[var(--color-bg)]/80 px-2 py-0.5 text-[var(--color-gold)] backdrop-blur">
                          {MODE_LABEL[it.mode] ?? it.mode}
                        </span>
                      </div>
                      <h3 className="font-display clamp-2 mt-2 text-sm font-semibold leading-tight group-hover:text-[var(--color-gold)]">{it.title}</h3>
                      <p className="text-utility mt-0.5 text-[var(--color-muted)]">{it.chaptersRead > 0 ? `${it.chaptersRead} read` : (it.genre ?? "")}</p>
                    </Link>
                  ))}
                </div>

                {rest.length > 0 && (
                  <div className="space-y-3">
                    {expanded && (
                      <ul className="divide-y divide-[var(--color-border)] border border-[var(--color-border)]">
                        {rest.map((it) => (
                          <li key={it.id}>
                            <Link href={`/series/${it.slug ?? it.id}`} className="flex items-center gap-4 bg-[var(--color-surface)] px-4 py-3 transition-colors hover:bg-[var(--color-surface-2)]">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={coverFor(it.id, it.cover_image)} alt="" className="h-16 w-11 shrink-0 border border-[var(--color-border)] object-cover grayscale-[0.15]" />
                              <div className="min-w-0 flex-1">
                                <p className="truncate font-medium">{it.title}</p>
                                <p className="text-utility mt-0.5 text-[var(--color-muted)]">{it.genre ?? ""}</p>
                              </div>
                              <span className="text-utility shrink-0 text-[var(--color-gold)]">{MODE_LABEL[it.mode] ?? it.mode}</span>
                              {it.chaptersRead > 0 && <span className="text-utility hidden shrink-0 text-[var(--color-muted)] sm:inline">{it.chaptersRead} read</span>}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                    <button onClick={() => setExpanded((e) => !e)} className="btn-outline">
                      {expanded ? "Show less" : `Show ${rest.length} more`}
                    </button>
                  </div>
                )}
              </>
            )}

            {/* Continue reading — read but not added; one tap to add */}
            {continueReading.length > 0 && (
              <section className="space-y-3">
                <h2 className="font-display text-2xl font-semibold">Continue reading</h2>
                <p className="text-sm text-[var(--color-muted)]">Series you&apos;ve read but haven&apos;t added. Add the ones you want to keep.</p>
                <ul className="divide-y divide-[var(--color-border)] border border-[var(--color-border)]">
                  {continueReading.map((it) => (
                    <li key={it.id} className="flex items-center gap-4 bg-[var(--color-surface)] px-4 py-3">
                      <Link href={`/series/${it.slug ?? it.id}`} className="flex min-w-0 flex-1 items-center gap-4">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={coverFor(it.id, it.cover_image)} alt="" className="h-16 w-11 shrink-0 border border-[var(--color-border)] object-cover grayscale-[0.15]" />
                        <div className="min-w-0">
                          <p className="truncate font-medium hover:text-[var(--color-gold)]">{it.title}</p>
                          <p className="text-utility mt-0.5 text-[var(--color-muted)]">{it.chaptersRead} read · {it.genre ?? ""}</p>
                        </div>
                      </Link>
                      <button
                        onClick={() => addToLibrary(it.id)}
                        disabled={adding === it.id}
                        className="btn-outline shrink-0 !py-2 !text-[0.7rem]"
                      >
                        {adding === it.id ? <Check size={13} /> : <Plus size={13} />}
                        Add
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </>
        )}

        {/* Bookmarks */}
        {bookmarks.length > 0 && (
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <BookmarkIcon size={18} className="text-[var(--color-gold)]" />
              <h2 className="font-display text-2xl font-semibold">Bookmarks</h2>
            </div>
            <ul className="divide-y divide-[var(--color-border)] border border-[var(--color-border)]">
              {bookmarks.map((b) => (
                <li key={b.chapterId} className="flex items-center gap-3 bg-[var(--color-surface)] px-4 py-3">
                  <Link href={`/chapter/${b.chapterId}`} className="min-w-0 flex-1">
                    <p className="truncate font-medium hover:text-[var(--color-gold)]">{b.seriesTitle} · Ch {b.n}</p>
                    <p className="text-utility mt-0.5 truncate text-[var(--color-muted)]">{b.title}{b.note ? ` · ${b.note}` : ""}</p>
                  </Link>
                  <button
                    onClick={() => {
                      removeBookmark(b.chapterId);
                      setBookmarks(listBookmarks());
                    }}
                    aria-label="Remove bookmark"
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-[var(--color-muted)] transition-colors hover:text-red-400"
                  >
                    <X size={15} />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </>
  );
}
