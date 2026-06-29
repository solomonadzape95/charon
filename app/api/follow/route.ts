import { NextRequest, NextResponse } from "next/server";
import { getFollow, getSeriesById, getUserById, removeFollow, setFollowMode, updateSeries } from "@/lib/db";
import type { FollowMode } from "@/lib/supabase";

export const runtime = "nodejs";

const MODES: FollowMode[] = ["standard", "pre_release", "series_unlock"];

/**
 * Follow a series / set reading mode.
 *   GET  /api/follow?userId=&seriesId=          → current mode (or null)
 *   POST /api/follow { userId, seriesId, mode }  → set mode
 */
export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId");
  const seriesId = req.nextUrl.searchParams.get("seriesId");
  if (!userId || !seriesId) return NextResponse.json({ error: "userId and seriesId required" }, { status: 400 });
  const follow = await getFollow(userId, seriesId);
  return NextResponse.json({ mode: follow?.mode ?? null });
}

export async function POST(req: NextRequest) {
  let body: { userId?: string; seriesId?: string; mode?: string } = {};
  try {
    body = await req.json();
  } catch {
    /* ignore */
  }
  const { userId, seriesId } = body;
  const mode = (body.mode ?? "standard") as FollowMode;
  if (!userId || !seriesId || !MODES.includes(mode)) {
    return NextResponse.json({ error: "userId, seriesId, valid mode required" }, { status: 400 });
  }
  const [user, series] = await Promise.all([getUserById(userId), getSeriesById(seriesId)]);
  if (!user || !series) return NextResponse.json({ error: "not found" }, { status: 404 });

  const existing = await getFollow(userId, seriesId);
  await setFollowMode(userId, seriesId, mode);
  if (!existing) await updateSeries(seriesId, { follower_count: Number(series.follower_count) + 1 });

  return NextResponse.json({ mode });
}

/**
 * Remove a series from the library (unfollow).
 *   DELETE /api/follow { userId, seriesId }
 */
export async function DELETE(req: NextRequest) {
  let body: { userId?: string; seriesId?: string } = {};
  try {
    body = await req.json();
  } catch {
    /* ignore */
  }
  const { userId, seriesId } = body;
  if (!userId || !seriesId) return NextResponse.json({ error: "userId and seriesId required" }, { status: 400 });

  const [series, existing] = await Promise.all([getSeriesById(seriesId), getFollow(userId, seriesId)]);
  if (existing) {
    await removeFollow(userId, seriesId);
    if (series) await updateSeries(seriesId, { follower_count: Math.max(0, Number(series.follower_count) - 1) });
  }
  return NextResponse.json({ ok: true, mode: null });
}
