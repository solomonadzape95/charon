import { NextRequest, NextResponse } from "next/server";
import { getSeriesById, listChapters } from "@/lib/db";
import { supabaseService } from "@/lib/supabase";

export const runtime = "nodejs";

/**
 * Full management snapshot for one series — chapter stats, earnings, price
 * movement, and pre-release / series-pass counts.
 *   GET /api/creator/series/<seriesId>
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ seriesId: string }> }) {
  const { seriesId } = await params;
  const series = await getSeriesById(seriesId);
  if (!series) return NextResponse.json({ error: "not found" }, { status: 404 });
  const db = supabaseService();

  const chapters = await listChapters(seriesId);

  // Earnings per chapter (settled payments).
  const chapterIds = chapters.map((c) => c.id);
  const earnedByChapter = new Map<string, number>();
  if (chapterIds.length) {
    const { data: pays } = await db
      .from("payments")
      .select("chapter_id, amount_usdc")
      .in("chapter_id", chapterIds)
      .eq("status", "settled");
    for (const p of pays ?? []) {
      const cid = (p as { chapter_id: string | null }).chapter_id;
      if (cid) earnedByChapter.set(cid, (earnedByChapter.get(cid) ?? 0) + Number((p as { amount_usdc: number }).amount_usdc));
    }
  }

  const [{ count: preRelease }, { count: passBuyers }] = await Promise.all([
    db.from("follows").select("id", { count: "exact", head: true }).eq("series_id", seriesId).eq("mode", "pre_release"),
    db.from("follows").select("id", { count: "exact", head: true }).eq("series_id", seriesId).eq("mode", "series_unlock"),
  ]);

  return NextResponse.json({
    series: {
      id: series.id,
      slug: series.slug,
      title: series.title,
      description: series.description,
      genre: series.genre,
      status: series.status,
      cover_image: series.cover_image,
      follower_count: series.follower_count,
    },
    chapters: chapters.map((c) => {
      const cur = Number(c.current_price_usdc);
      const base = Number(c.base_price_usdc);
      const moved = cur > base + 0.001 ? "up" : cur < base - 0.001 ? "down" : null;
      return {
        id: c.id,
        n: c.chapter_number,
        title: c.title ?? `Chapter ${c.chapter_number}`,
        price: cur,
        basePrice: base,
        floor: Number(c.floor_price_usdc),
        earlyAccessPrice: c.early_access_price_usdc != null ? Number(c.early_access_price_usdc) : null,
        moved,
        reads: c.read_count,
        completion: Number(c.completion_rate),
        reread: Number(c.reread_rate),
        earned: earnedByChapter.get(c.id) ?? 0,
      };
    }),
    preReleaseSubscribers: preRelease ?? 0,
    passBuyers: passBuyers ?? 0,
  });
}
