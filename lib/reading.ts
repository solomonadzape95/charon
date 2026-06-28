/**
 * Client-side reading state — resume position + bookmarks, in localStorage.
 * Per-device; fast and offline-friendly. (Can be moved server-side later.)
 */

const PCT_KEY = "charon_progress"; // { [chapterId]: pct 0..1 }
const LAST_KEY = "charon_last"; // { [seriesId]: { chapterId, n, title, pct, at } }
const BM_KEY = "charon_bookmarks"; // Bookmark[]

export interface LastRead {
  chapterId: string;
  n: number;
  title: string;
  pct: number;
  at: number;
}
export interface Bookmark {
  chapterId: string;
  seriesId: string;
  seriesTitle: string;
  n: number;
  title: string;
  note?: string;
  at: number;
}

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}

// ── progress ──
export function saveProgress(seriesId: string, chapter: { id: string; n: number; title: string }, pct: number) {
  const clamped = Math.max(0, Math.min(1, pct));
  const pcts = read<Record<string, number>>(PCT_KEY, {});
  pcts[chapter.id] = clamped;
  write(PCT_KEY, pcts);

  const last = read<Record<string, LastRead>>(LAST_KEY, {});
  last[seriesId] = { chapterId: chapter.id, n: chapter.n, title: chapter.title, pct: clamped, at: Date.now() };
  write(LAST_KEY, last);
}
export function getChapterPct(chapterId: string): number {
  return read<Record<string, number>>(PCT_KEY, {})[chapterId] ?? 0;
}
export function getLast(seriesId: string): LastRead | null {
  return read<Record<string, LastRead>>(LAST_KEY, {})[seriesId] ?? null;
}

// ── bookmarks ──
export function listBookmarks(): Bookmark[] {
  return read<Bookmark[]>(BM_KEY, []).sort((a, b) => b.at - a.at);
}
export function isBookmarked(chapterId: string): boolean {
  return read<Bookmark[]>(BM_KEY, []).some((b) => b.chapterId === chapterId);
}
export function toggleBookmark(entry: Omit<Bookmark, "at">): boolean {
  const all = read<Bookmark[]>(BM_KEY, []);
  const idx = all.findIndex((b) => b.chapterId === entry.chapterId);
  if (idx >= 0) {
    all.splice(idx, 1);
    write(BM_KEY, all);
    return false;
  }
  all.push({ ...entry, at: Date.now() });
  write(BM_KEY, all);
  return true;
}
export function removeBookmark(chapterId: string) {
  write(BM_KEY, read<Bookmark[]>(BM_KEY, []).filter((b) => b.chapterId !== chapterId));
}
