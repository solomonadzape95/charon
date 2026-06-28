"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Settings2, X, Minus, Plus, ChevronLeft, ChevronRight, Bookmark, BookmarkCheck } from "lucide-react";
import { SessionSummary, type SessionResult } from "@/components/SessionSummary";
import { saveProgress, getChapterPct, isBookmarked, toggleBookmark } from "@/lib/reading";

interface Props {
  chapterId: string;
  title: string;
  seriesTitle: string;
  seriesId: string;
  contentType: "text" | "images";
  content: string;
  price: number;
  estReadMin: number;
  nextChapterId: string | null;
  prevChapterId: string | null;
  chapterNumber?: number;
  guest?: boolean;
}

const LS_KEY = "charon_user_id";
const BINGE_KEY = "charon_binge";
const PREFS_KEY = "charon_reader_prefs";
const BINGE_GAP_MS = 30 * 60 * 1000; // a new "sitting" after 30 min idle

type ReadTheme = "paper" | "sepia" | "dark";
type ReadFont = "serif" | "sans";
interface Prefs {
  theme: ReadTheme;
  font: ReadFont;
  size: number; // px
  leading: number; // line-height multiplier
}
const DEFAULT_PREFS: Prefs = { theme: "sepia", font: "serif", size: 19, leading: 1.85 };

const THEMES: Record<ReadTheme, { bg: string; fg: string; chrome: string; line: string; surface: string }> = {
  paper: { bg: "#faf8f2", fg: "#1c1a16", chrome: "#736d63", line: "#e7e2d6", surface: "#ffffff" },
  sepia: { bg: "#f3ead6", fg: "#433726", chrome: "#8a7b5c", line: "#e0d4b8", surface: "#f7efdd" },
  dark: { bg: "#0d0d0d", fg: "#d9d5cd", chrome: "#8d877a", line: "#242424", surface: "#161616" },
};
const FONTS: Record<ReadFont, string> = {
  serif: "var(--font-garamond), Georgia, 'Times New Roman', serif",
  sans: "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
};

const REACTIONS = ["❤️", "🔥", "😭", "😮", "👏"];

// Nav links: plain text in the reading-theme colour, gold on hover (no pill).
const NAV_CLASS = "inline-flex items-center gap-1.5 text-[var(--nav)] transition-colors hover:text-[var(--color-gold)]";

function nextBingeDepth(): number {
  try {
    const now = Date.now();
    const raw = sessionStorage.getItem(BINGE_KEY);
    const prev = raw ? (JSON.parse(raw) as { count: number; last: number }) : null;
    const count = prev && now - prev.last < BINGE_GAP_MS ? prev.count + 1 : 1;
    sessionStorage.setItem(BINGE_KEY, JSON.stringify({ count, last: now }));
    return count;
  } catch {
    return 1;
  }
}

export function ChapterReader(props: Props) {
  const [userId, setUserId] = useState<string | null>(null);
  const [summary, setSummary] = useState<SessionResult | null>(null);
  const [comment, setComment] = useState("");
  const [reaction, setReaction] = useState<string | null>(null);
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);
  const [showSettings, setShowSettings] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const lastSaveRef = useRef<number>(0);
  const chMeta = { id: props.chapterId, n: props.chapterNumber ?? 0, title: props.title };

  const sessionIdRef = useRef<string | null>(null);
  const startedRef = useRef<number>(Date.now());
  const activeMsRef = useRef<number>(0);
  const lastTickRef = useRef<number>(Date.now());
  const maxScrollRef = useRef<number>(0);
  const lastScrollRef = useRef<number>(0);
  const scrollBacksRef = useRef<number>(0);
  const endedRef = useRef<boolean>(false);
  const commentRef = useRef("");
  const progressRef = useRef<HTMLDivElement | null>(null);
  const progressTextRef = useRef<HTMLSpanElement | null>(null);
  commentRef.current = comment;

  const theme = THEMES[prefs.theme];
  const navStyle = { "--nav": theme.chrome } as React.CSSProperties;

  // Load saved reading preferences.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(PREFS_KEY);
      if (raw) setPrefs({ ...DEFAULT_PREFS, ...JSON.parse(raw) });
    } catch {
      /* ignore */
    }
  }, []);

  const updatePrefs = useCallback((patch: Partial<Prefs>) => {
    setPrefs((p) => {
      const next = { ...p, ...patch };
      try {
        localStorage.setItem(PREFS_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  // Resume position + bookmark state for this chapter.
  useEffect(() => {
    setBookmarked(isBookmarked(props.chapterId));
    const pct = getChapterPct(props.chapterId);
    if (pct > 0.02 && pct < 0.95) {
      maxScrollRef.current = pct;
      const t = setTimeout(() => {
        const doc = document.documentElement;
        const scrollable = doc.scrollHeight - doc.clientHeight;
        if (scrollable > 0) window.scrollTo({ top: scrollable * pct });
      }, 140);
      return () => clearTimeout(t);
    }
  }, [props.chapterId]);

  function onBookmark() {
    const on = toggleBookmark({
      chapterId: props.chapterId,
      seriesId: props.seriesId,
      seriesTitle: props.seriesTitle,
      n: props.chapterNumber ?? 0,
      title: props.title,
    });
    setBookmarked(on);
  }

  // Resolve the reader and open a session.
  useEffect(() => {
    const id = typeof window !== "undefined" ? localStorage.getItem(LS_KEY) : null;
    setUserId(id);
    if (!id) return;

    const bingeDepth = nextBingeDepth();
    let cancelled = false;
    fetch("/api/session/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: id, chapterId: props.chapterId, bingeDepth }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) sessionIdRef.current = d.sessionId ?? null;
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [props.chapterId]);

  const computeCompletion = useCallback(() => {
    const doc = document.documentElement;
    const scrollable = doc.scrollHeight - doc.clientHeight;
    if (scrollable <= 0) return 1; // short chapter, fully visible
    return Math.min(1, doc.scrollTop / scrollable);
  }, []);

  // Track scroll depth + direction reversals (re-reading) + the visible progress bar.
  useEffect(() => {
    function onScroll() {
      const c = computeCompletion();
      const pct = Math.round(c * 100);
      if (progressRef.current) progressRef.current.style.width = `${pct}%`;
      if (progressTextRef.current) progressTextRef.current.textContent = `${pct}%`;
      if (c > maxScrollRef.current) maxScrollRef.current = c;
      if (c < lastScrollRef.current - 0.08) scrollBacksRef.current += 1;
      lastScrollRef.current = c;
      // Persist resume position (throttled).
      const now = Date.now();
      if (now - lastSaveRef.current > 1500) {
        lastSaveRef.current = now;
        saveProgress(props.seriesId, { id: props.chapterId, n: props.chapterNumber ?? 0, title: props.title }, Math.max(maxScrollRef.current, c));
      }
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [computeCompletion]);

  // Accumulate active (visible) time only.
  useEffect(() => {
    function tick() {
      const now = Date.now();
      if (document.visibilityState === "visible") activeMsRef.current += now - lastTickRef.current;
      lastTickRef.current = now;
    }
    const t = setInterval(tick, 1000);
    function onVis() {
      tick();
      if (document.visibilityState === "hidden") endSession(true);
    }
    document.addEventListener("visibilitychange", onVis);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", onVis);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const endSession = useCallback(
    (viaBeacon: boolean) => {
      const sessionId = sessionIdRef.current;
      if (!sessionId || endedRef.current) return;
      endedRef.current = true;

      const now = Date.now();
      if (document.visibilityState === "visible") activeMsRef.current += now - lastTickRef.current;
      const payload = {
        sessionId,
        completionRate: Math.max(maxScrollRef.current, computeCompletion()),
        scrollBackCount: scrollBacksRef.current,
        timeSpentSeconds: Math.round(activeMsRef.current / 1000),
        readerComment: commentRef.current || null,
      };
      saveProgress(props.seriesId, { id: props.chapterId, n: props.chapterNumber ?? 0, title: props.title }, payload.completionRate);

      if (viaBeacon && navigator.sendBeacon) {
        navigator.sendBeacon("/api/session/end", new Blob([JSON.stringify(payload)], { type: "application/json" }));
        return;
      }
      fetch("/api/session/end", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        keepalive: true,
      })
        .then((r) => r.json())
        .then((d) => {
          if (d && (d.settled || d.amount != null)) setSummary(d as SessionResult);
        })
        .catch(() => {});
    },
    [computeCompletion],
  );

  // Settle on tab close / hard navigation.
  useEffect(() => {
    function onUnload() {
      endSession(true);
    }
    window.addEventListener("beforeunload", onUnload);
    return () => {
      window.removeEventListener("beforeunload", onUnload);
      endSession(false); // SPA navigation away → settle + show summary
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startStr = props.chapterNumber ? `Chapter ${props.chapterNumber}` : props.title;

  return (
    <div style={{ background: theme.bg, color: theme.fg }} className="min-h-screen transition-colors">
      {/* Top progress bar */}
      <div className="fixed inset-x-0 top-0 z-30 h-[3px]" style={{ background: theme.line }}>
        <div ref={progressRef} className="h-full bg-[var(--color-gold)]" style={{ width: "0%" }} />
      </div>

      {/* Minimal chrome */}
      <header
        className="sticky top-[3px] z-20 backdrop-blur"
        style={{ background: `color-mix(in srgb, ${theme.bg} 88%, transparent)`, borderBottom: `1px solid ${theme.line}` }}
      >
        <div className="mx-auto grid max-w-3xl grid-cols-[1fr_auto_1fr] items-center gap-4 px-6 py-3.5" style={{ color: theme.chrome }}>
          <Link href={`/series/${props.seriesId}`} className="flex min-w-0 items-center gap-1.5 text-sm transition-opacity hover:opacity-70">
            <ChevronLeft size={16} className="shrink-0" />
            <span className="truncate">{props.seriesTitle}</span>
          </Link>
          <p className="text-utility hidden min-w-0 truncate text-center sm:block">{startStr}</p>
          <div className="flex items-center justify-end gap-2.5">
            <span ref={progressTextRef} className="text-utility tabular hidden w-9 text-right sm:inline">
              0%
            </span>
            <button
              onClick={onBookmark}
              aria-label={bookmarked ? "Remove bookmark" : "Bookmark this chapter"}
              title={bookmarked ? "Remove bookmark" : "Bookmark this chapter"}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full transition-opacity hover:opacity-70"
              style={{ border: `1px solid ${bookmarked ? "var(--color-gold)" : theme.line}`, color: bookmarked ? "var(--color-gold)" : "inherit" }}
            >
              {bookmarked ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}
            </button>
            <button
              onClick={() => setShowSettings((s) => !s)}
              aria-label="Reading settings"
              title="Reading settings"
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full transition-opacity hover:opacity-70"
              style={{ border: `1px solid ${theme.line}` }}
            >
              <Settings2 size={16} />
            </button>
          </div>
        </div>
      </header>

      {/* Settings popover */}
      {showSettings && (
        <ReaderSettings prefs={prefs} update={updatePrefs} onClose={() => setShowSettings(false)} theme={theme} />
      )}

      {/* Reading surface */}
      <div className="mx-auto max-w-3xl px-6 pb-24 pt-10">
        {props.guest && (
          <div className="mb-8 px-4 py-3 text-sm" style={{ border: `1px solid ${theme.line}`, color: theme.chrome }}>
            Chapter 1 is free.{" "}
            <Link href="/join" className="underline">
              Sign in
            </Link>{" "}
            to keep reading and support the author.
          </div>
        )}

        <h1 className="font-display mb-10 text-3xl font-semibold sm:text-4xl">{props.title}</h1>

        {props.contentType === "text" ? (
          <article
            className="whitespace-pre-wrap"
            style={{ fontFamily: FONTS[prefs.font], fontSize: `${prefs.size}px`, lineHeight: prefs.leading }}
          >
            {props.content}
          </article>
        ) : (
          <ImageReader content={props.content} />
        )}

        {/* End-of-chapter */}
        <div className="mt-16 space-y-8 border-t pt-8" style={{ borderColor: theme.line }}>
          {/* Reactions */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-utility mr-1" style={{ color: theme.chrome }}>
              React
            </span>
            {REACTIONS.map((r) => (
              <button
                key={r}
                onClick={() => setReaction((cur) => (cur === r ? null : r))}
                className="grid h-10 w-10 place-items-center rounded-full text-lg transition-transform hover:scale-110"
                style={{
                  border: `1px solid ${reaction === r ? "var(--color-gold)" : theme.line}`,
                  background: reaction === r ? "color-mix(in srgb, var(--color-gold) 16%, transparent)" : "transparent",
                }}
              >
                {r}
              </button>
            ))}
          </div>

          {/* One-line comment */}
          {userId && (
            <input
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Leave a note (optional — the agent weighs this)…"
              className="w-full bg-transparent px-3 py-2 text-sm outline-none"
              style={{ border: `1px solid ${theme.line}`, color: theme.fg }}
            />
          )}

          {/* Navigation — plain text, gold on hover */}
          <div className="flex items-center justify-between gap-4 text-sm font-medium">
            {props.prevChapterId ? (
              <Link href={`/chapter/${props.prevChapterId}`} className={NAV_CLASS} style={navStyle}>
                <ChevronLeft size={16} /> Previous
              </Link>
            ) : (
              <span />
            )}

            <Link href={`/series/${props.seriesId}`} className={NAV_CLASS} style={navStyle}>
              Contents
            </Link>

            {props.guest ? (
              <Link
                href="/join"
                className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-gold)] px-4 py-2 text-sm font-semibold text-black"
              >
                Sign in to continue <ChevronRight size={16} />
              </Link>
            ) : props.nextChapterId ? (
              <Link href={`/chapter/${props.nextChapterId}`} className={NAV_CLASS} style={navStyle}>
                Next <ChevronRight size={16} />
              </Link>
            ) : (
              <span />
            )}
          </div>
        </div>
      </div>

      {summary && <SessionSummary result={summary} onClose={() => setSummary(null)} />}
    </div>
  );
}

function ReaderSettings({
  prefs,
  update,
  onClose,
  theme,
}: {
  prefs: Prefs;
  update: (p: Partial<Prefs>) => void;
  onClose: () => void;
  theme: { bg: string; fg: string; chrome: string; line: string; surface: string };
}) {
  return (
    <>
      <div className="fixed inset-0 z-30" onClick={onClose} />
      <div
        className="fixed right-4 top-16 z-40 w-72 space-y-5 p-5 shadow-2xl sm:right-8"
        style={{ background: theme.surface, color: theme.fg, border: `1px solid ${theme.line}` }}
      >
        <div className="flex items-center justify-between">
          <span className="text-utility" style={{ color: theme.chrome }}>
            Reading settings
          </span>
          <button onClick={onClose} aria-label="Close" className="hover:opacity-70">
            <X size={16} />
          </button>
        </div>

        {/* Theme */}
        <Row label="Theme" theme={theme}>
          <div className="flex gap-2">
            {(["paper", "sepia", "dark"] as ReadTheme[]).map((t) => (
              <button
                key={t}
                onClick={() => update({ theme: t })}
                aria-label={t}
                className="h-8 w-8 rounded-full"
                style={{
                  background: THEMES[t].bg,
                  border: `2px solid ${prefs.theme === t ? "var(--color-gold)" : theme.line}`,
                }}
              />
            ))}
          </div>
        </Row>

        {/* Font family */}
        <Row label="Typeface" theme={theme}>
          <div className="flex gap-2">
            {(["serif", "sans"] as ReadFont[]).map((f) => (
              <button
                key={f}
                onClick={() => update({ font: f })}
                className="flex-1 px-3 py-1.5 text-sm capitalize"
                style={{
                  fontFamily: FONTS[f],
                  border: `1px solid ${prefs.font === f ? "var(--color-gold)" : theme.line}`,
                  color: prefs.font === f ? "var(--color-gold)" : theme.fg,
                }}
              >
                {f}
              </button>
            ))}
          </div>
        </Row>

        {/* Font size */}
        <Row label="Font size" theme={theme}>
          <Stepper
            theme={theme}
            value={`${prefs.size}`}
            onDec={() => update({ size: Math.max(15, prefs.size - 1) })}
            onInc={() => update({ size: Math.min(28, prefs.size + 1) })}
          />
        </Row>

        {/* Line height */}
        <Row label="Line spacing" theme={theme}>
          <Stepper
            theme={theme}
            value={prefs.leading.toFixed(2)}
            onDec={() => update({ leading: Math.max(1.4, Math.round((prefs.leading - 0.1) * 100) / 100) })}
            onInc={() => update({ leading: Math.min(2.2, Math.round((prefs.leading + 0.1) * 100) / 100) })}
          />
        </Row>
      </div>
    </>
  );
}

function Row({ label, theme, children }: { label: string; theme: { chrome: string }; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-sm" style={{ color: theme.chrome }}>
        {label}
      </span>
      {children}
    </div>
  );
}

function Stepper({
  value,
  onDec,
  onInc,
  theme,
}: {
  value: string;
  onDec: () => void;
  onInc: () => void;
  theme: { line: string; fg: string };
}) {
  return (
    <div className="flex items-center gap-2">
      <button onClick={onDec} className="grid h-8 w-8 place-items-center" style={{ border: `1px solid ${theme.line}` }}>
        <Minus size={14} />
      </button>
      <span className="tabular w-8 text-center text-sm" style={{ color: theme.fg }}>
        {value}
      </span>
      <button onClick={onInc} className="grid h-8 w-8 place-items-center" style={{ border: `1px solid ${theme.line}` }}>
        <Plus size={14} />
      </button>
    </div>
  );
}

function ImageReader({ content }: { content: string }) {
  let urls: string[] = [];
  try {
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed)) urls = parsed;
  } catch {
    urls = content.split(/\s+/).filter(Boolean);
  }
  return (
    <div className="space-y-1">
      {urls.map((u, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img key={i} src={u} alt={`panel ${i + 1}`} className="w-full" loading="lazy" />
      ))}
    </div>
  );
}
