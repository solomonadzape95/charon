import { NextRequest, NextResponse } from "next/server";
import { getCreatorById, listPaymentsForCreator, listSeriesForCreator } from "@/lib/db";
import { supabaseService } from "@/lib/supabase";

export const runtime = "nodejs";

/**
 * Creator earnings snapshot for the dashboard.
 *   GET /api/creator/earnings?creatorId=<uuid>
 */
export async function GET(req: NextRequest) {
  const creatorId = req.nextUrl.searchParams.get("creatorId");
  if (!creatorId) return NextResponse.json({ error: "creatorId required" }, { status: 400 });

  const creator = await getCreatorById(creatorId);
  if (!creator) return NextResponse.json({ error: "not found" }, { status: 404 });

  const [payments, series] = await Promise.all([
    listPaymentsForCreator(creatorId, 50),
    listSeriesForCreator(creatorId),
  ]);

  // Resolve chapter titles for recent payments.
  const chapterIds = [...new Set(payments.map((p) => p.chapter_id).filter(Boolean))] as string[];
  const titles: Record<string, string> = {};
  if (chapterIds.length) {
    const { data } = await supabaseService()
      .from("chapters")
      .select("id, title, chapter_number")
      .in("id", chapterIds);
    for (const c of data ?? []) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const row = c as any;
      titles[row.id] = row.title ?? `Chapter ${row.chapter_number}`;
    }
  }

  return NextResponse.json({
    creator: {
      id: creator.id,
      name: creator.name,
      balance_usd: Number(creator.balance_usd),
      total_earned_usdc: Number(creator.total_earned_usdc),
      wallet_address: creator.wallet_address,
    },
    series: series.map((s) => ({ id: s.id, title: s.title, status: s.status })),
    payments: payments
      .filter((p) => p.status === "settled")
      .map((p) => ({
        id: p.id,
        amount: Number(p.amount_usdc),
        chapter: p.chapter_id ? titles[p.chapter_id] : null,
        tx: p.arc_tx_hash,
        created_at: p.created_at,
      })),
  });
}
