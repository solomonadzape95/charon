import { NextRequest, NextResponse } from "next/server";
import { createSeries, getCreatorById, getSeriesById, listSeries, listSeriesForCreator, updateSeries } from "@/lib/db";
import { supabaseService, type SeriesStatus } from "@/lib/supabase";

export const runtime = "nodejs";

/**
 * Series listing + creation + editing.
 *   GET   /api/series                  → all series (discovery)
 *   GET   /api/series?creatorId=<uuid> → a creator's series
 *   POST  /api/series { creatorId, title, description?, genre?, coverImage? }
 *   PATCH /api/series { id, description?, genre?, status?, coverImage?, title? }
 */
export async function PATCH(req: NextRequest) {
  let body: {
    id?: string;
    title?: string;
    description?: string;
    genre?: string;
    coverImage?: string;
    status?: SeriesStatus;
    passPrice?: number | null;
    preReleasePrice?: number | null;
  } = {};
  try {
    body = await req.json();
  } catch {
    /* ignore */
  }
  const { id } = body;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const series = await getSeriesById(id);
  if (!series) return NextResponse.json({ error: "not found" }, { status: 404 });

  const patch: Record<string, unknown> = {};
  if (body.title != null) patch.title = body.title;
  if (body.description != null) patch.description = body.description;
  if (body.genre != null) patch.genre = body.genre;
  if (body.coverImage != null) patch.cover_image = body.coverImage;
  if (body.status && (body.status === "ongoing" || body.status === "completed")) patch.status = body.status;
  // Series Pass / pre-release prices: a positive number sets the offer; null clears it.
  if (body.passPrice !== undefined) patch.series_pass_price_usdc = sanitizePrice(body.passPrice);
  if (body.preReleasePrice !== undefined) patch.pre_release_price_usdc = sanitizePrice(body.preReleasePrice);
  if (Object.keys(patch).length) await updateSeries(id, patch);

  return NextResponse.json({ series: { ...series, ...patch } });
}

/** Clamp a creator-set price to the rail's cents, or null to clear the offer. */
function sanitizePrice(v: number | null): number | null {
  if (v == null) return null;
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(Math.min(999, n) * 100) / 100;
}

export async function GET(req: NextRequest) {
  const creatorId = req.nextUrl.searchParams.get("creatorId");
  const limit = Math.min(300, Number(req.nextUrl.searchParams.get("limit")) || 50);
  const series = creatorId ? await listSeriesForCreator(creatorId) : await listSeries(limit);

  // Attach chapter counts so cards can show "N chapters" without N+1 fetches.
  const ids = series.map((s) => s.id);
  const counts: Record<string, number> = {};
  if (ids.length) {
    const { data } = await supabaseService().from("chapters").select("series_id").in("series_id", ids);
    for (const row of data ?? []) {
      const sid = (row as { series_id: string }).series_id;
      counts[sid] = (counts[sid] ?? 0) + 1;
    }
  }
  const withCounts = series.map((s) => ({ ...s, chapter_count: counts[s.id] ?? 0 }));
  return NextResponse.json(
    { series: withCounts },
    { headers: { "Cache-Control": "public, max-age=15, stale-while-revalidate=120" } },
  );
}

export async function POST(req: NextRequest) {
  let body: {
    creatorId?: string;
    title?: string;
    description?: string;
    genre?: string;
    coverImage?: string;
  } = {};
  try {
    body = await req.json();
  } catch {
    /* ignore */
  }
  const { creatorId, title } = body;
  if (!creatorId || !title?.trim()) {
    return NextResponse.json({ error: "creatorId and title required" }, { status: 400 });
  }
  const creator = await getCreatorById(creatorId);
  if (!creator) return NextResponse.json({ error: "creator not found" }, { status: 404 });

  const series = await createSeries({
    creatorId,
    title: title.trim(),
    description: body.description ?? null,
    genre: body.genre ?? null,
    coverImage: body.coverImage ?? null,
  });
  return NextResponse.json({ series });
}
