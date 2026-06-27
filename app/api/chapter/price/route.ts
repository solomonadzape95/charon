import { NextRequest, NextResponse } from "next/server";
import { getChapterById } from "@/lib/db";
import { supabaseService, type Loyalty } from "@/lib/supabase";
import { applyReaderModifiers } from "@/lib/pricing";

export const runtime = "nodejs";

/**
 * The price THIS reader pays for a chapter, with the reason driving it.
 *   GET /api/chapter/price?chapterId=<uuid>&userId=<uuid?>
 * Used by the chapter price badge so readers always see why a price is what it is.
 */
export async function GET(req: NextRequest) {
  const chapterId = req.nextUrl.searchParams.get("chapterId");
  const userId = req.nextUrl.searchParams.get("userId");
  if (!chapterId) return NextResponse.json({ error: "chapterId required" }, { status: 400 });

  const chapter = await getChapterById(chapterId);
  if (!chapter) return NextResponse.json({ error: "not found" }, { status: 404 });

  const current = Number(chapter.current_price_usdc);
  const floor = Number(chapter.floor_price_usdc);

  // Latest repricing reason (for the "why" tooltip).
  const { data: ph } = await supabaseService()
    .from("price_history")
    .select("reason, created_at")
    .eq("chapter_id", chapterId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const lastChangeReason = (ph as { reason: string | null } | null)?.reason ?? null;

  // No reader → just the public current price.
  if (!userId) {
    return NextResponse.json({ currentPrice: current, readerPrice: current, label: "standard", lastChangeReason });
  }

  // Reader modifiers from their loyalty in this series.
  const { data: loyaltyRow } = await supabaseService()
    .from("loyalty")
    .select("*")
    .eq("user_id", userId)
    .eq("series_id", chapter.series_id)
    .maybeSingle();
  const loyalty = loyaltyRow as Loyalty | null;

  const rp = applyReaderModifiers(
    current,
    {
      loyaltyTier: loyalty?.loyalty_tier ?? "new",
      bingeDepth: 1,
      chaptersReadInSeries: loyalty?.chapters_read ?? 0,
    },
    floor,
  );

  return NextResponse.json({
    currentPrice: current,
    readerPrice: rp.readerPrice,
    label: rp.label,
    lastChangeReason,
  });
}
