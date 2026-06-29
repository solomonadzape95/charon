import { NextRequest, NextResponse } from "next/server";
import {
  createChapter,
  getCreatorById,
  getSeriesById,
  getUserById,
  listChapters,
  listSubscribers,
  nextChapterNumber,
  updateSeries,
} from "@/lib/db";
import { priceChapter } from "@/lib/agents/pricing";
import { settleSession } from "@/lib/payments";
import { supabaseService } from "@/lib/supabase";
import { sanitizeHtml } from "@/lib/sanitize-html";
import { isHtmlContent } from "@/lib/chapter-html";

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

/**
 * Delete a chapter that has no reader history yet.
 *   DELETE /api/chapters?id=<uuid>
 */
export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const { error } = await supabaseService().from("chapters").delete().eq("id", id);
  if (error) {
    // Foreign-key guard — chapters with sessions/payments can't be hard-deleted.
    return NextResponse.json({ error: "This chapter has reader history and can't be deleted." }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}

export async function POST(req: NextRequest) {
  let body: {
    seriesId?: string;
    title?: string;
    contentType?: "text" | "images";
    content?: string;
    earlyAccessReleaseAt?: string | null;
    earlyAccess?: boolean;
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
  let storedContent = content;
  let wordCount = 0;
  if (contentType === "text") {
    if (isHtmlContent(content)) {
      storedContent = sanitizeHtml(content);
      const text = storedContent.replace(/<[^>]+>/g, " ").replace(/&[a-z]+;/gi, " ");
      wordCount = text.trim().split(/\s+/).filter(Boolean).length;
    } else {
      wordCount = content.trim().split(/\s+/).filter(Boolean).length;
    }
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
    content: storedContent,
    wordCount,
    floorPrice: pricing.floorPrice,
    basePrice: pricing.basePrice,
    currentPrice: pricing.basePrice,
    earlyAccessPrice: pricing.earlyAccessPrice,
    earlyAccessReleaseAt: body.earlyAccessReleaseAt ?? null,
  });

  // Light momentum bump for an active series.
  await updateSeries(seriesId, { momentum_score: Number(series.momentum_score) + 1 });

  // Mode 2 — pre-release: Agent 4 auto-pays subscribers the moment a chapter drops.
  let preReleaseUnlocks = 0;
  if (body.earlyAccess) {
    const creator = await getCreatorById(series.creator_id);
    const subscribers = await listSubscribers(seriesId, "pre_release");
    if (creator) {
      for (const sub of subscribers) {
        const user = await getUserById(sub.user_id);
        if (!user || Number(user.balance_usd) < pricing.earlyAccessPrice) continue;
        const res = await settleSession({
          userId: sub.user_id,
          creator,
          chapterId: chapter.id,
          amountUsd: pricing.earlyAccessPrice,
          debitKind: "unlock_debit",
        });
        if (res.status !== "failed") preReleaseUnlocks++;
      }
    }
  }

  return NextResponse.json({ chapter, pricingReasoning: pricing.reasoning, preReleaseUnlocks });
}
