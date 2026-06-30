import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { supabaseService } from "@/lib/supabase";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const search = req.nextUrl.searchParams.get("search")?.trim().toLowerCase();
  const page = Math.max(1, Number(req.nextUrl.searchParams.get("page")) || 1);
  const pageSize = Math.min(200, Number(req.nextUrl.searchParams.get("pageSize")) || 25);
  const from = (page - 1) * pageSize;
  const db = supabaseService();

  let q = db
    .from("series")
    .select("id, slug, title, creator_id, genre, status, follower_count, momentum_score, created_at", { count: "exact" })
    .order("momentum_score", { ascending: false })
    .range(from, from + pageSize - 1);
  if (search) q = q.ilike("title", `%${search}%`);

  const { data: series, error, count } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const rows = series ?? [];

  const creatorIds = [...new Set(rows.map((s) => (s as { creator_id: string }).creator_id))];
  const seriesIds = rows.map((s) => (s as { id: string }).id);
  const [{ data: creators }, { data: chapters }] = await Promise.all([
    creatorIds.length ? db.from("creators").select("id, name").in("id", creatorIds) : Promise.resolve({ data: [] }),
    seriesIds.length ? db.from("chapters").select("series_id").in("series_id", seriesIds) : Promise.resolve({ data: [] }),
  ]);
  const creatorName = new Map((creators ?? []).map((c) => [(c as { id: string }).id, (c as { name: string | null }).name]));
  const chCount: Record<string, number> = {};
  for (const c of chapters ?? []) {
    const sid = (c as { series_id: string }).series_id;
    chCount[sid] = (chCount[sid] ?? 0) + 1;
  }

  return NextResponse.json({
    series: rows.map((s) => {
      const r = s as Record<string, unknown>;
      return { ...r, creatorName: creatorName.get(r.creator_id as string) ?? null, chapterCount: chCount[r.id as string] ?? 0 };
    }),
    total: count ?? 0,
    page,
    pageSize,
  });
}

/** PATCH { id, status } — ongoing | completed */
export async function PATCH(req: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;
  let body: { id?: string; status?: string } = {};
  try {
    body = await req.json();
  } catch {
    /* ignore */
  }
  if (!body.id || (body.status !== "ongoing" && body.status !== "completed")) {
    return NextResponse.json({ error: "id and status (ongoing|completed) required" }, { status: 400 });
  }
  await supabaseService().from("series").update({ status: body.status }).eq("id", body.id);
  return NextResponse.json({ ok: true });
}

/** DELETE ?id= — remove a series (best effort; blocked if chapters have reader history). */
export async function DELETE(req: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const { error } = await supabaseService().from("series").delete().eq("id", id);
  if (error) return NextResponse.json({ error: "Could not delete — series has reader history. Set it to completed instead." }, { status: 400 });
  return NextResponse.json({ ok: true });
}
