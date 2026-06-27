import { NextRequest, NextResponse } from "next/server";
import { getCreatorById, listSeriesForCreator } from "@/lib/db";
import { supabaseService } from "@/lib/supabase";

export const runtime = "nodejs";

/**
 * A creator's audience — follower count + top supporters by amount.
 *   GET /api/creator/audience?creatorId=<uuid>
 */
export async function GET(req: NextRequest) {
  const creatorId = req.nextUrl.searchParams.get("creatorId");
  if (!creatorId) return NextResponse.json({ error: "creatorId required" }, { status: 400 });
  const creator = await getCreatorById(creatorId);
  if (!creator) return NextResponse.json({ error: "not found" }, { status: 404 });
  const db = supabaseService();

  const series = await listSeriesForCreator(creatorId);
  const followerCount = series.reduce((s, x) => s + Number(x.follower_count), 0);

  // Top supporters: settled payments grouped by reader.
  const { data: pays } = await db
    .from("payments")
    .select("user_id, amount_usdc")
    .eq("creator_id", creatorId)
    .eq("status", "settled");
  const byUser = new Map<string, { total: number; reads: number }>();
  for (const p of pays ?? []) {
    const uid = (p as { user_id: string | null }).user_id;
    if (!uid) continue;
    const cur = byUser.get(uid) ?? { total: 0, reads: 0 };
    cur.total += Number((p as { amount_usdc: number }).amount_usdc);
    cur.reads += 1;
    byUser.set(uid, cur);
  }

  // Mask reader identity → "Reader a1b2".
  const supporters = [...byUser.entries()]
    .map(([uid, v]) => ({ id: `Reader ${uid.slice(0, 4)}`, total: v.total, reads: v.reads }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 12);

  return NextResponse.json({ followerCount, supporters });
}
