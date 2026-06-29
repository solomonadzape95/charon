import { NextRequest, NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase";

export const runtime = "nodejs";

/**
 * Cross-post status for a chapter.
 *   GET  /api/crosspost?chapterId=<uuid>            → [{ platform, posted, external_url }]
 *   POST /api/crosspost { chapterId, platform, posted?, externalUrl? }  → upsert
 */
export async function GET(req: NextRequest) {
  const chapterId = req.nextUrl.searchParams.get("chapterId");
  if (!chapterId) return NextResponse.json({ error: "chapterId required" }, { status: 400 });
  const { data } = await supabaseService()
    .from("cross_post_status")
    .select("platform, posted, posted_at, external_url")
    .eq("chapter_id", chapterId);
  return NextResponse.json({ statuses: data ?? [] });
}

export async function POST(req: NextRequest) {
  let body: { chapterId?: string; platform?: string; posted?: boolean; externalUrl?: string } = {};
  try {
    body = await req.json();
  } catch {
    /* ignore */
  }
  const { chapterId, platform } = body;
  if (!chapterId || !platform) return NextResponse.json({ error: "chapterId and platform required" }, { status: 400 });

  const row: Record<string, unknown> = { chapter_id: chapterId, platform };
  if (typeof body.posted === "boolean") {
    row.posted = body.posted;
    row.posted_at = body.posted ? new Date().toISOString() : null;
  }
  if (body.externalUrl !== undefined) row.external_url = body.externalUrl || null;

  const { error } = await supabaseService()
    .from("cross_post_status")
    .upsert(row, { onConflict: "chapter_id,platform" });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
