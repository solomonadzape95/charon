import { NextRequest, NextResponse } from "next/server";
import {
  bumpLoyalty,
  finalizeSession,
  getChapterById,
  getCreatorById,
  getFollow,
  getOrCreateLoyalty,
  getSessionById,
  getSeriesById,
  getUserById,
  hasPaidForChapter,
  priorReadsOfChapter,
  updateChapter,
} from "@/lib/db";
import { settleSession, MIN_SETTLE } from "@/lib/payments";
import { applyReaderModifiers, type ReaderPrice } from "@/lib/pricing";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * End a reading session: Agent 1 values it, then it settles to the creator on Arc.
 *   POST /api/session/end {
 *     sessionId, completionRate, scrollBackCount, timeSpentSeconds, readerComment?
 *   }
 * Accepts sendBeacon (text body). Returns the session summary for the UI.
 */
export async function POST(req: NextRequest) {
  let body: {
    sessionId?: string;
    completionRate?: number;
    scrollBackCount?: number;
    timeSpentSeconds?: number;
    readerComment?: string | null;
  } = {};
  try {
    body = await req.json();
  } catch {
    try {
      body = JSON.parse(await req.text());
    } catch {
      /* ignore */
    }
  }

  const { sessionId } = body;
  if (!sessionId) return NextResponse.json({ error: "sessionId required" }, { status: 400 });

  const session = await getSessionById(sessionId);
  if (!session) return NextResponse.json({ error: "session not found" }, { status: 404 });
  // Idempotent: a session only settles once (beacon + unmount can both fire).
  if (session.ended_at) {
    return NextResponse.json({ alreadySettled: true, amount: session.amount_settled_usdc, reasoning: session.agent_reasoning });
  }
  if (!session.user_id || !session.chapter_id) {
    return NextResponse.json({ error: "session missing user/chapter" }, { status: 400 });
  }

  const [user, chapter] = await Promise.all([
    getUserById(session.user_id),
    getChapterById(session.chapter_id),
  ]);
  if (!user || !chapter) return NextResponse.json({ error: "user or chapter missing" }, { status: 404 });
  const series = await getSeriesById(chapter.series_id);
  if (!series) return NextResponse.json({ error: "series missing" }, { status: 404 });
  const creator = await getCreatorById(series.creator_id);
  if (!creator) return NextResponse.json({ error: "creator missing" }, { status: 404 });

  // Owner protection — a creator reading their own work is NEVER charged. The
  // reader UI already skips the session for owners; this is the authoritative
  // backstop so no settlement can ever fire against your own series.
  if (isSeriesOwner(user.email, creator.email)) {
    await finalizeSession(session.id, {
      ended_at: new Date().toISOString(),
      completion_rate: clamp01(Number(body.completionRate)),
      scroll_back_count: Math.max(0, Math.round(Number(body.scrollBackCount) || 0)),
      time_spent_seconds: Math.max(0, Number(body.timeSpentSeconds) || 0),
      amount_settled_usdc: 0,
      agent_reasoning: "Your own work — always free to read.",
    });
    return NextResponse.json({
      settled: false,
      status: "owner",
      amount: 0,
      reasoning: "Your own work — always free to read.",
      seriesTitle: series.title,
      chapterTitle: chapter.title ?? `Chapter ${chapter.chapter_number}`,
      balance: Number(user.balance_usd),
    });
  }

  const completionRate = clamp01(Number(body.completionRate));
  const scrollBackCount = Math.max(0, Math.round(Number(body.scrollBackCount) || 0));
  const timeSpentSeconds = Math.max(0, Number(body.timeSpentSeconds) || 0);
  const readerComment = (body.readerComment ?? "").toString().slice(0, 500) || null;

  // Pay once per chapter, forever — if this reader already settled this chapter,
  // re-reads are always free (charon-payment-architecture.md, Part 2).
  if (await hasPaidForChapter(session.user_id, session.chapter_id)) {
    await finalizeSession(session.id, {
      ended_at: new Date().toISOString(),
      completion_rate: clamp01(Number(body.completionRate)),
      scroll_back_count: Math.max(0, Math.round(Number(body.scrollBackCount) || 0)),
      time_spent_seconds: Math.max(0, Number(body.timeSpentSeconds) || 0),
      amount_settled_usdc: 0,
      agent_reasoning: "Free re-read — you already own this chapter.",
    });
    return NextResponse.json({
      settled: false,
      status: "reread",
      amount: 0,
      reasoning: "Free re-read — you already own this chapter.",
      seriesTitle: series.title,
      chapterTitle: chapter.title ?? `Chapter ${chapter.chapter_number}`,
      balance: Number(user.balance_usd),
    });
  }

  const loyalty = await getOrCreateLoyalty(session.user_id, series.id);
  const priorReads = await priorReadsOfChapter(session.user_id, session.chapter_id);

  // Series already unlocked (Mode 3) → no per-session charge.
  const follow = await getFollow(session.user_id, series.id);
  if (follow?.mode === "series_unlock") {
    await finalizeSession(session.id, {
      ended_at: new Date().toISOString(),
      completion_rate: clamp01(Number(body.completionRate)),
      scroll_back_count: Math.max(0, Math.round(Number(body.scrollBackCount) || 0)),
      time_spent_seconds: Math.max(0, Number(body.timeSpentSeconds) || 0),
      amount_settled_usdc: 0,
      agent_reasoning: "Included in your series pass — read on.",
    });
    return NextResponse.json({
      settled: false,
      status: "series_unlock",
      amount: 0,
      reasoning: "Included in your series pass — read on.",
      seriesTitle: series.title,
      chapterTitle: chapter.title ?? `Chapter ${chapter.chapter_number}`,
      balance: Number(user.balance_usd),
    });
  }

  // Simple, deterministic price: the chapter's current price minus the reader's
  // loyalty / binge / discovery discounts, capped by the session cap + balance.
  const priced = applyReaderModifiers(
    Number(chapter.current_price_usdc),
    {
      loyaltyTier: loyalty.loyalty_tier,
      bingeDepth: session.binge_depth,
      chaptersReadInSeries: loyalty.chapters_read,
    },
    Number(chapter.floor_price_usdc),
  );

  const cap = Number(user.session_cap_usd);
  const bal = Number(user.balance_usd);
  let amount = Math.round(Math.min(priced.readerPrice, cap, bal) * 100) / 100;
  let reasoning = priceReasoning(amount, priced);

  let settleStatus: "settled" | "failed" | "skipped" = "skipped";

  if (amount >= MIN_SETTLE) {
    const result = await settleSession({
      userId: session.user_id,
      creator,
      chapterId: chapter.id,
      sessionId: session.id,
      amountUsd: amount,
    });
    settleStatus = result.status;
    if (result.status === "failed") {
      amount = 0;
      reasoning = "Couldn't settle this session — your balance may be low.";
    }
  } else {
    amount = 0;
    reasoning = bal < MIN_SETTLE ? "Your balance is empty — top up to keep value flowing to creators." : reasoning;
  }

  // Persist the session record.
  await finalizeSession(session.id, {
    ended_at: new Date().toISOString(),
    completion_rate: completionRate,
    scroll_back_count: scrollBackCount,
    time_spent_seconds: timeSpentSeconds,
    reader_comment: readerComment,
    agent_value_score: null,
    amount_settled_usdc: amount,
    agent_reasoning: reasoning,
    loyalty_discount_applied: priced.loyaltyDiscount,
    binge_discount_applied: priced.bingeDiscount,
  });

  // Update chapter aggregates (running averages) + loyalty.
  await updateChapterAggregates(chapter.id, completionRate, timeSpentSeconds, priorReads > 0);
  if (amount >= MIN_SETTLE) await bumpLoyalty(session.user_id, series.id, amount);

  return NextResponse.json({
    settled: amount >= MIN_SETTLE && settleStatus !== "failed",
    status: settleStatus,
    amount,
    reasoning,
    creator: creator.name ?? series.title,
    seriesTitle: series.title,
    chapterTitle: chapter.title ?? `Chapter ${chapter.chapter_number}`,
    balance: Math.max(0, Number(user.balance_usd) - amount),
  });
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

/** A short, honest line about the charge — the discounts that applied, if any. */
function priceReasoning(amount: number, priced: ReaderPrice): string {
  const parts: string[] = [];
  if (priced.discoveryDiscount > 0) parts.push("first-3-chapters discount");
  if (priced.loyaltyDiscount > 0) parts.push("loyalty discount");
  if (priced.bingeDiscount > 0) parts.push("binge discount");
  return parts.length
    ? `$${amount.toFixed(2)} for this chapter · ${parts.join(" + ")}.`
    : `$${amount.toFixed(2)} for this chapter.`;
}

/** A reader owns a series when their account email matches the creator's email. */
function isSeriesOwner(userEmail: string | null, creatorEmail: string | null): boolean {
  if (!userEmail || !creatorEmail) return false;
  return userEmail.trim().toLowerCase() === creatorEmail.trim().toLowerCase();
}

async function updateChapterAggregates(
  chapterId: string,
  completionRate: number,
  timeSpent: number,
  wasReread: boolean,
): Promise<void> {
  const ch = await getChapterById(chapterId);
  if (!ch) return;
  const n = ch.read_count;
  const next = n + 1;
  const avg = (prev: number, val: number) => (prev * n + val) / next;
  await updateChapter(chapterId, {
    read_count: next,
    completion_rate: avg(Number(ch.completion_rate), completionRate),
    avg_time_spent_seconds: avg(Number(ch.avg_time_spent_seconds), timeSpent),
    reread_rate: avg(Number(ch.reread_rate), wasReread ? 1 : 0),
  });
}
