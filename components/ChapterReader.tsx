"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { SessionSummary, type SessionResult } from "@/components/SessionSummary";

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
}

const LS_KEY = "charon_user_id";
const BINGE_KEY = "charon_binge";
const BINGE_GAP_MS = 30 * 60 * 1000; // a new "sitting" after 30 min idle

/** Compute this chapter's binge depth within the current reading sitting. */
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

  const sessionIdRef = useRef<string | null>(null);
  const startedRef = useRef<number>(Date.now());
  const activeMsRef = useRef<number>(0);
  const lastTickRef = useRef<number>(Date.now());
  const maxScrollRef = useRef<number>(0);
  const lastScrollRef = useRef<number>(0);
  const scrollBacksRef = useRef<number>(0);
  const endedRef = useRef<boolean>(false);
  const commentRef = useRef("");
  commentRef.current = comment;

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

  // Track scroll depth + direction reversals (re-reading).
  useEffect(() => {
    function onScroll() {
      const c = computeCompletion();
      if (c > maxScrollRef.current) maxScrollRef.current = c;
      // A meaningful upward movement after progress = a re-read signal.
      if (c < lastScrollRef.current - 0.08) scrollBacksRef.current += 1;
      lastScrollRef.current = c;
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

  return (
    <div className="mx-auto max-w-2xl">
      {!userId && (
        <div className="mb-6 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-sm text-[var(--color-muted)]">
          You&apos;re reading as a guest.{" "}
          <Link href="/dashboard" className="text-[var(--color-gold)]">
            Set up your reading wallet
          </Link>{" "}
          to support creators automatically.
        </div>
      )}

      <header className="mb-8">
        <Link href={`/series/${props.seriesId}`} className="text-sm text-[var(--color-muted)] hover:text-[var(--color-ink)]">
          ← {props.seriesTitle}
        </Link>
        <h1 className="mt-2 text-3xl font-bold">{props.title}</h1>
        <p className="mt-1 text-xs text-[var(--color-muted)]">~{props.estReadMin} min read · ${props.price.toFixed(2)} this session est.</p>
      </header>

      {props.contentType === "text" ? (
        <article className="reader-prose whitespace-pre-wrap text-[1.075rem] leading-8">{props.content}</article>
      ) : (
        <ImageReader content={props.content} />
      )}

      <div className="mt-12 space-y-4 border-t border-[var(--color-border)] pt-6">
        {userId && (
          <div>
            <label className="text-sm text-[var(--color-muted)]">Leave a note (the agent weighs this)</label>
            <input
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="this chapter broke me…"
              className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm"
            />
          </div>
        )}
        {props.nextChapterId ? (
          <Link
            href={`/chapter/${props.nextChapterId}`}
            className="inline-flex rounded-lg bg-[var(--color-gold)] px-5 py-2.5 text-sm font-semibold text-black"
          >
            Next chapter →
          </Link>
        ) : (
          <Link
            href={`/series/${props.seriesId}`}
            className="inline-flex rounded-lg border border-[var(--color-border)] px-5 py-2.5 text-sm font-semibold"
          >
            Back to series
          </Link>
        )}
      </div>

      {summary && <SessionSummary result={summary} onClose={() => setSummary(null)} />}
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
