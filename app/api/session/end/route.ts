import { NextRequest, NextResponse } from "next/server";
import {
  bumpLoyalty,
  finalizeSession,
  getChapterById,
  getCreatorById,
  getOrCreateLoyalty,
  getSessionById,
  getSeriesById,
  getUserById,
  priorReadsOfChapter,
  updateChapter,
} from "@/lib/db";
import { settleSession, MIN_SETTLE } from "@/lib/payments";
import { valueSession } from "@/lib/agents/reading";

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

  const completionRate = clamp01(Number(body.completionRate));
  const scrollBackCount = Math.max(0, Math.round(Number(body.scrollBackCount) || 0));
  const timeSpentSeconds = Math.max(0, Number(body.timeSpentSeconds) || 0);
  const readerComment = (body.readerComment ?? "").toString().slice(0, 500) || null;

  const loyalty = await getOrCreateLoyalty(session.user_id, series.id);
  const priorReads = await priorReadsOfChapter(session.user_id, session.chapter_id);

  const valuation = await valueSession(
    {
      timeSpentSeconds,
      completionRate,
      scrollBackCount,
      bingeDepth: session.binge_depth,
      readerComment,
      isReread: priorReads > 0,
    },
    {
      title: chapter.title ?? `Chapter ${chapter.chapter_number}`,
      wordCount: chapter.word_count,
      currentPrice: Number(chapter.current_price_usdc),
      floorPrice: Number(chapter.floor_price_usdc),
    },
    {
      loyaltyTier: loyalty.loyalty_tier,
      bingeDepth: session.binge_depth,
      chaptersReadInSeries: loyalty.chapters_read,
    },
    Number(user.session_cap_usd),
    Number(user.balance_usd),
  );

  let settleStatus: "settled" | "escrowed" | "failed" | "skipped" = "skipped";
  let txHash: string | undefined;
  let amount = valuation.amountUsd;
  let reasoning = valuation.reasoning;

  if (amount >= MIN_SETTLE) {
    const result = await settleSession({
      userId: session.user_id,
      creator,
      chapterId: chapter.id,
      sessionId: session.id,
      amountUsd: amount,
    });
    settleStatus = result.status;
    txHash = result.txHash;
    if (result.status === "failed") {
      amount = 0;
      reasoning = "Couldn't settle this session — your balance may be low.";
    }
  } else {
    amount = 0;
    reasoning =
      Number(user.balance_usd) < MIN_SETTLE
        ? "Your balance is empty — top up to keep value flowing to creators."
        : reasoning;
  }

  // Persist the session record + agent reasoning.
  await finalizeSession(session.id, {
    ended_at: new Date().toISOString(),
    completion_rate: completionRate,
    scroll_back_count: scrollBackCount,
    time_spent_seconds: timeSpentSeconds,
    reader_comment: readerComment,
    agent_value_score: valuation.engagementScore,
    amount_settled_usdc: amount,
    agent_reasoning: reasoning,
    loyalty_discount_applied: valuation.loyaltyDiscount,
    binge_discount_applied: valuation.bingeDiscount,
  });

  // Update chapter aggregates (running averages) + loyalty.
  await updateChapterAggregates(chapter.id, completionRate, timeSpentSeconds, priorReads > 0);
  if (amount >= MIN_SETTLE) await bumpLoyalty(session.user_id, series.id, amount);

  return NextResponse.json({
    settled: amount >= MIN_SETTLE && settleStatus !== "failed",
    status: settleStatus,
    amount,
    reasoning,
    engagementScore: valuation.engagementScore,
    creator: creator.name ?? series.title,
    seriesTitle: series.title,
    chapterTitle: chapter.title ?? `Chapter ${chapter.chapter_number}`,
    txHash,
    balance: Math.max(0, Number(user.balance_usd) - amount),
  });
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(1, Math.max(0, n));
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
