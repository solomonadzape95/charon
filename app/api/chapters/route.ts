import { NextRequest, NextResponse } from "next/server";
import { createChapter, getSeriesById, listChapters, nextChapterNumber, updateSeries } from "@/lib/db";
import { priceChapter } from "@/lib/agents/pricing";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Chapter listing + upload.
 *   GET  /api/chapters?seriesId=<uuid>  → chapters in a series
 *   POST /api/chapters {
 *     seriesId, title?, contentType: 'text'|'images', content,
 *     earlyAccessReleaseAt?, overrideBasePrice?
 *   }
 * On upload, Agent 2 sets the base price (creator may override).
 */
export async function GET(req: NextRequest) {
  const seriesId = req.nextUrl.searchParams.get("seriesId");
  if (!seriesId) return NextResponse.json({ error: "seriesId required" }, { status: 400 });
  const chapters = await listChapters(seriesId);
  return NextResponse.json({ chapters });
}

export async function POST(req: NextRequest) {
  let body: {
    seriesId?: string;
    title?: string;
    contentType?: "text" | "images";
    content?: string;
    earlyAccessReleaseAt?: string | null;
    overrideBasePrice?: number;
  } = {};
  try {
    body = await req.json();
  } catch {
    /* ignore */
  }
  const { seriesId, content } = body;
  const contentType = body.contentType === "images" ? "images" : "text";
  if (!seriesId || !content?.trim()) {
    return NextResponse.json({ error: "seriesId and content required" }, { status: 400 });
  }
  const series = await getSeriesById(seriesId);
  if (!series) return NextResponse.json({ error: "series not found" }, { status: 404 });

  // Word count: text → count words; images → count of image URLs (panels).
  let wordCount = 0;
  if (contentType === "text") {
    wordCount = content.trim().split(/\s+/).filter(Boolean).length;
  } else {
    try {
      const arr = JSON.parse(content);
      wordCount = Array.isArray(arr) ? arr.length : 0;
    } catch {
      // newline-separated URLs
      wordCount = content.split(/\s+/).filter(Boolean).length;
    }
  }

  const chapterNumber = await nextChapterNumber(seriesId);

  // Agent 2 prices the chapter (deterministic fallback if the model is down).
  const pricing = await priceChapter({
    wordCount,
    contentType,
    genre: series.genre,
    seriesFollowers: series.follower_count,
    seriesMomentum: series.momentum_score,
    chapterNumber,
    override: body.overrideBasePrice,
  });

  const chapter = await createChapter({
    seriesId,
    chapterNumber,
    title: body.title ?? null,
    contentType,
    content,
    wordCount,
    floorPrice: pricing.floorPrice,
    basePrice: pricing.basePrice,
    currentPrice: pricing.basePrice,
    earlyAccessPrice: pricing.earlyAccessPrice,
    earlyAccessReleaseAt: body.earlyAccessReleaseAt ?? null,
  });

  // Light momentum bump for an active series.
  await updateSeries(seriesId, { momentum_score: Number(series.momentum_score) + 1 });

  return NextResponse.json({ chapter, pricingReasoning: pricing.reasoning });
}
