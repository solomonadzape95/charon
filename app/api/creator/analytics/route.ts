import { NextRequest, NextResponse } from "next/server";
import { getCreatorById, listSeriesForCreator } from "@/lib/db";
import { supabaseService } from "@/lib/supabase";

export const runtime = "nodejs";

/**
 * Per-chapter performance for a creator — reads, completion, re-read, earnings.
 *   GET /api/creator/analytics?creatorId=<uuid>
 */
export async function GET(req: NextRequest) {
  const creatorId = req.nextUrl.searchParams.get("creatorId");
  if (!creatorId) return NextResponse.json({ error: "creatorId required" }, { status: 400 });
  const creator = await getCreatorById(creatorId);
  if (!creator) return NextResponse.json({ error: "not found" }, { status: 404 });
  const db = supabaseService();

  const series = await listSeriesForCreator(creatorId);

  // Earnings per chapter (settled payments).
  const { data: pays } = await db
    .from("payments")
    .select("chapter_id, amount_usdc")
    .eq("creator_id", creatorId)
    .eq("status", "settled");
  const earnedByChapter = new Map<string, number>();
  for (const p of pays ?? []) {
    const cid = (p as { chapter_id: string | null }).chapter_id;
    if (cid) earnedByChapter.set(cid, (earnedByChapter.get(cid) ?? 0) + Number((p as { amount_usdc: number }).amount_usdc));
  }

  const out = [];
  for (const s of series) {
    const { data: chapters } = await db
      .from("chapters")
      .select("id, chapter_number, title, read_count, completion_rate, reread_rate, current_price_usdc")
      .eq("series_id", s.id)
      .order("chapter_number", { ascending: true });
    out.push({
      id: s.id,
      title: s.title,
      followers: s.follower_count,
      chapters: (chapters ?? []).map((c) => ({
        n: c.chapter_number,
        title: c.title ?? `Chapter ${c.chapter_number}`,
        reads: c.read_count,
        completion: Number(c.completion_rate),
        reread: Number(c.reread_rate),
        price: Number(c.current_price_usdc),
        earned: earnedByChapter.get(c.id as string) ?? 0,
      })),
    });
  }

  return NextResponse.json({ totalEarned: Number(creator.total_earned_usdc), series: out });
}
