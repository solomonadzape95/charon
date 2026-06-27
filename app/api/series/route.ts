import { NextRequest, NextResponse } from "next/server";
import { createSeries, getCreatorById, listSeries, listSeriesForCreator } from "@/lib/db";

export const runtime = "nodejs";

/**
 * Series listing + creation.
 *   GET  /api/series                  → all series (discovery)
 *   GET  /api/series?creatorId=<uuid> → a creator's series
 *   POST /api/series { creatorId, title, description?, genre?, coverImage? }
 */
export async function GET(req: NextRequest) {
  const creatorId = req.nextUrl.searchParams.get("creatorId");
  const series = creatorId ? await listSeriesForCreator(creatorId) : await listSeries();
  return NextResponse.json({ series });
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
