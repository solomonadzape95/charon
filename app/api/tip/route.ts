import { NextRequest, NextResponse } from "next/server";
import {
  adjustCreatorBalance,
  adjustUserBalance,
  getChapterById,
  getCreatorById,
  getSeriesById,
  getUserById,
  recordPayment,
  updatePayment,
} from "@/lib/db";
import { roundUsdc } from "@/lib/money";

export const runtime = "nodejs";

const MIN_TIP = 0.05;
const MAX_TIP = 50;

/**
 * Tip a creator on top of (or instead of) a chapter payment. Tips are 100% to the
 * creator — no platform fee — and settle straight to their escrow balance.
 *   POST /api/tip { userId, chapterId, amountUsd }
 */
export async function POST(req: NextRequest) {
  let body: { userId?: string; chapterId?: string; amountUsd?: number } = {};
  try {
    body = await req.json();
  } catch {
    /* ignore */
  }
  const { userId, chapterId } = body;
  const amount = roundUsdc(Number(body.amountUsd));
  if (!userId || !chapterId || amount < MIN_TIP) {
    return NextResponse.json({ error: `userId, chapterId and a tip of at least $${MIN_TIP} are required` }, { status: 400 });
  }
  if (amount > MAX_TIP) return NextResponse.json({ error: `tips are capped at $${MAX_TIP}` }, { status: 400 });

  const [user, chapter] = await Promise.all([getUserById(userId), getChapterById(chapterId)]);
  if (!user) return NextResponse.json({ error: "user not found" }, { status: 404 });
  if (!chapter) return NextResponse.json({ error: "chapter not found" }, { status: 404 });
  const series = await getSeriesById(chapter.series_id);
  if (!series) return NextResponse.json({ error: "series not found" }, { status: 404 });
  const creator = await getCreatorById(series.creator_id);
  if (!creator) return NextResponse.json({ error: "creator not found" }, { status: 404 });

  // Can't tip your own work.
  if (user.email && creator.email && user.email.trim().toLowerCase() === creator.email.trim().toLowerCase()) {
    return NextResponse.json({ error: "you can't tip your own series" }, { status: 400 });
  }

  // NB: no chapterId — a tip is not a chapter purchase. Tagging the tip with the
  // chapter would make hasPaidForChapter() treat the chapter as already bought,
  // so the actual read would settle as a free "re-read". Tips stay independent.
  const payment = await recordPayment({
    userId,
    creatorId: creator.id,
    amountUsdc: amount,
    feeUsdc: 0,
    netUsdc: amount,
    status: "pending",
  });

  // Debit the reader (throws on insufficient balance), then credit the creator 100%.
  try {
    await adjustUserBalance(userId, -amount, "tip", payment.id);
  } catch (e) {
    await updatePayment(payment.id, { status: "failed" });
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
  await adjustCreatorBalance(creator.id, amount);
  await updatePayment(payment.id, { status: "settled" });

  return NextResponse.json({
    ok: true,
    amount,
    creator: creator.name ?? series.title,
    balance: Math.max(0, Number(user.balance_usd) - amount),
  });
}
