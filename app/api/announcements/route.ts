import { NextRequest, NextResponse } from "next/server";
import {
  createAnnouncement,
  deleteAnnouncement,
  getSeriesById,
  listAnnouncementsForCreator,
  listAnnouncementsForSeries,
} from "@/lib/db";

export const runtime = "nodejs";

/**
 * Author announcements.
 *   GET    /api/announcements?seriesId=<uuid>&creatorId=<uuid>  → for a series page
 *   GET    /api/announcements?creatorId=<uuid>                  → a creator's own list
 *   POST   /api/announcements { creatorId, seriesId?, title?, body }
 *   DELETE /api/announcements?id=<uuid>
 */
export async function GET(req: NextRequest) {
  const seriesId = req.nextUrl.searchParams.get("seriesId");
  const creatorId = req.nextUrl.searchParams.get("creatorId");
  if (seriesId) {
    const series = await getSeriesById(seriesId);
    if (!series) return NextResponse.json({ announcements: [] });
    const announcements = await listAnnouncementsForSeries(seriesId, series.creator_id);
    return NextResponse.json({ announcements });
  }
  if (creatorId) {
    return NextResponse.json({ announcements: await listAnnouncementsForCreator(creatorId) });
  }
  return NextResponse.json({ error: "seriesId or creatorId required" }, { status: 400 });
}

export async function POST(req: NextRequest) {
  let body: { creatorId?: string; seriesId?: string | null; title?: string; body?: string } = {};
  try {
    body = await req.json();
  } catch {
    /* ignore */
  }
  const { creatorId } = body;
  const text = (body.body ?? "").trim();
  if (!creatorId || !text) return NextResponse.json({ error: "creatorId and body required" }, { status: 400 });
  const announcement = await createAnnouncement({
    creatorId,
    seriesId: body.seriesId ?? null,
    title: body.title?.trim() || null,
    body: text.slice(0, 2000),
  });
  return NextResponse.json({ announcement });
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  await deleteAnnouncement(id);
  return NextResponse.json({ ok: true });
}
