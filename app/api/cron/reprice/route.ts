import { NextRequest, NextResponse } from "next/server";
import { listAllChapters, getSeriesById, logPriceChange, updateChapter } from "@/lib/db";
import { supabaseService } from "@/lib/supabase";
import { repriceChapter } from "@/lib/agents/repricing";
import { ageDays as ageDaysOf } from "@/lib/pricing";

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * Agent 3 — hourly dynamic repricing across all chapters.
 *   GET /api/cron/reprice           (Vercel Cron sends Authorization: Bearer $CRON_SECRET)
 *   GET /api/cron/reprice?key=...   (manual trigger for testing)
 */
export async function GET(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const now = Date.now();
  const chapters = await listAllChapters(1000);

  // 24h read volume per chapter (one query, tallied in memory).
  const since = new Date(now - 86_400_000).toISOString();
  const { data: recent } = await supabaseService()
    .from("sessions")
    .select("chapter_id")
    .gte("created_at", since);
  const volume = new Map<string, number>();
  for (const r of recent ?? []) {
    const cid = (r as { chapter_id: string | null }).chapter_id;
    if (cid) volume.set(cid, (volume.get(cid) ?? 0) + 1);
  }

  const momentumCache = new Map<string, number>();
  const changes: { chapterId: string; from: number; to: number; reason: string }[] = [];

  for (const ch of chapters) {
    let momentum = momentumCache.get(ch.series_id);
    if (momentum === undefined) {
      const series = await getSeriesById(ch.series_id);
      momentum = Number(series?.momentum_score ?? 0);
      momentumCache.set(ch.series_id, momentum);
    }

    const result = await repriceChapter({
      currentPrice: Number(ch.current_price_usdc),
      basePrice: Number(ch.base_price_usdc),
      floorPrice: Number(ch.floor_price_usdc),
      genre: null,
      ageDays: ageDaysOf(ch.public_release_at, now),
      readVolume24h: volume.get(ch.id) ?? 0,
      completionRate: Number(ch.completion_rate),
      rereadRate: Number(ch.reread_rate),
      seriesMomentum: momentum,
    });

    if (result.changed) {
      await updateChapter(ch.id, { current_price_usdc: result.newPrice });
      await logPriceChange({
        chapterId: ch.id,
        oldPrice: Number(ch.current_price_usdc),
        newPrice: result.newPrice,
        reason: result.reason,
        signals: result.signals,
      });
      changes.push({ chapterId: ch.id, from: Number(ch.current_price_usdc), to: result.newPrice, reason: result.reason });
    }
  }

  return NextResponse.json({ repriced: changes.length, scanned: chapters.length, changes });
}

function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true; // unset → allow (local dev)
  const header = req.headers.get("authorization");
  if (header === `Bearer ${secret}`) return true;
  return req.nextUrl.searchParams.get("key") === secret;
}
