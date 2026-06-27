import { NextRequest, NextResponse } from "next/server";
import { getCreatorById, getSeriesById, getUserById } from "@/lib/db";
import { unlockSeries } from "@/lib/payments";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Mode 3 — unlock a whole series for one discounted payment.
 *   POST /api/series/unlock { userId, seriesId }
 */
export async function POST(req: NextRequest) {
  let body: { userId?: string; seriesId?: string } = {};
  try {
    body = await req.json();
  } catch {
    /* ignore */
  }
  const { userId, seriesId } = body;
  if (!userId || !seriesId) return NextResponse.json({ error: "userId and seriesId required" }, { status: 400 });

  const [user, series] = await Promise.all([getUserById(userId), getSeriesById(seriesId)]);
  if (!user) return NextResponse.json({ error: "user not found" }, { status: 404 });
  if (!series) return NextResponse.json({ error: "series not found" }, { status: 404 });
  const creator = await getCreatorById(series.creator_id);
  if (!creator) return NextResponse.json({ error: "creator not found" }, { status: 404 });

  const result = await unlockSeries({ userId, seriesId, creator });
  if (!result.ok) return NextResponse.json({ error: result.reason ?? "unlock failed" }, { status: 400 });
  return NextResponse.json({ unlocked: true, amount: result.amount, txHash: result.txHash });
}
