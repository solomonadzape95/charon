"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AccountNav } from "@/components/AccountNav";
import { coverFor } from "@/lib/covers";
import { listBookmarks, removeBookmark, type Bookmark } from "@/lib/reading";
import { Bookmark as BookmarkIcon, X } from "lucide-react";

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

interface Item {
  id: string;
  slug: string | null;
  title: string;
  genre: string | null;
  cover_image: string | null;
  mode: string;
  chaptersRead: number;
  lastReadAt: number;
}

const MODE_LABEL: Record<string, string> = {
  standard: "Following",
  pre_release: "Pre-release",
  series_unlock: "Unlocked",
};

const FEATURED = 6;

export default function LibraryPage() {
  const router = useRouter();
  const [lib, setLib] = useState<Lib | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);

  useEffect(() => {
    setBookmarks(listBookmarks());
    const id = localStorage.getItem("charon_user_id");
    if (!id) {
      router.replace("/join");
      return;
    }
    fetch(`/api/me/library?userId=${id}`)
      .then((r) => r.json())
      .then(setLib)
      .catch(() => {});
  }, [router]);

  const items = useMemo<Item[]>(() => {
    if (!lib) return [];
    const map = new Map<string, Item>();
    for (const f of lib.follows) {
      map.set(f.id, { id: f.id, slug: f.slug, title: f.title, genre: f.genre, cover_image: f.cover_image, mode: f.mode, chaptersRead: 0, lastReadAt: 0 });
    }
    for (const h of lib.history) {
      const cur = map.get(h.id) ?? { id: h.id, slug: h.slug, title: h.title, genre: h.genre, cover_image: h.cover_image, mode: "standard", chaptersRead: 0, lastReadAt: 0 };
      cur.chaptersRead = h.chaptersRead;
      cur.lastReadAt = +new Date(h.lastReadAt);
      map.set(h.id, cur);
    }
    return [...map.values()].sort((a, b) => b.lastReadAt - a.lastReadAt || b.chaptersRead - a.chaptersRead);
  }, [lib]);

  const href = (it: Item) => `/series/${it.slug ?? it.id}`;
  const featured = items.slice(0, FEATURED);
  const rest = items.slice(FEATURED);

  return (
    <>
      <AccountNav />
      <div className="mx-auto max-w-5xl space-y-10 px-6 py-10">
        <div>
          <h1 className="font-display display-md font-semibold">Your library</h1>
          <p className="mt-1 text-[var(--color-muted)]">
            {items.length > 0 ? `${items.length} series you follow or have read.` : "Series you follow or read will live here."}
          </p>
        </div>

        {!lib ? (
          <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="aspect-[2/3] animate-pulse bg-[var(--color-surface)]" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <p className="text-[var(--color-muted)]">
            Nothing here yet. <Link href="/read" className="text-[var(--color-gold)]">Browse stories →</Link>
          </p>
        ) : (
          <>
            {/* Featured — posters with covers */}
            <div className="grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 lg:grid-cols-6">
              {featured.map((it) => (
                <Link key={it.id} href={href(it)} className="group block">
                  <div className="relative aspect-[2/3] w-full overflow-hidden border border-[var(--color-border)] transition-colors group-hover:border-[var(--color-gold)]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={coverFor(it.id, it.cover_image)}
                      alt={it.title}
                      className="h-full w-full object-cover grayscale-[0.15] transition-all duration-500 group-hover:grayscale-0 group-hover:scale-[1.03]"
                    />
                    <span className="text-utility absolute right-1.5 top-1.5 bg-[var(--color-bg)]/80 px-2 py-0.5 text-[var(--color-gold)] backdrop-blur">
                      {MODE_LABEL[it.mode] ?? it.mode}
                    </span>
                  </div>
                  <h3 className="font-display clamp-2 mt-2 text-sm font-semibold leading-tight group-hover:text-[var(--color-gold)]">{it.title}</h3>
                  <p className="text-utility mt-0.5 text-[var(--color-muted)]">{it.chaptersRead > 0 ? `${it.chaptersRead} read` : (it.genre ?? "—")}</p>
                </Link>
              ))}
            </div>

            {/* The rest — expandable list with thumbnails */}
            {rest.length > 0 && (
              <div className="space-y-3">
                {expanded && (
                  <ul className="divide-y divide-[var(--color-border)] border border-[var(--color-border)]">
                    {rest.map((it) => (
                      <li key={it.id}>
                        <Link href={href(it)} className="flex items-center gap-4 bg-[var(--color-surface)] px-4 py-3 transition-colors hover:bg-[var(--color-surface-2)]">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={coverFor(it.id, it.cover_image)} alt="" className="h-16 w-11 shrink-0 border border-[var(--color-border)] object-cover grayscale-[0.15]" />
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-medium">{it.title}</p>
                            <p className="text-utility mt-0.5 text-[var(--color-muted)]">{it.genre ?? "—"}</p>
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
                    <p className="truncate font-medium hover:text-[var(--color-gold)]">
                      {b.seriesTitle} · Ch {b.n}
                    </p>
                    <p className="text-utility mt-0.5 truncate text-[var(--color-muted)]">{b.title}{b.note ? ` — ${b.note}` : ""}</p>
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
