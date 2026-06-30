import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { supabaseService } from "@/lib/supabase";

export const runtime = "nodejs";

// Postgres "undefined_table" — surfaced as a friendly hint until the migration runs.
const NO_TABLE = "42P01";
const MIGRATION_HINT =
  "Reviews table is missing. Run the `create table public.reviews …` block from supabase/schema.sql in the Supabase SQL editor.";

/**
 * Submit a review / feedback. Open to anyone (signed-in or not).
 *   POST /api/reviews { message, rating?, name?, email?, userId?, page? }
 */
export async function POST(req: NextRequest) {
  let body: { message?: string; rating?: number; name?: string; email?: string; userId?: string; page?: string } = {};
  try {
    body = await req.json();
  } catch {
    /* ignore */
  }

  const message = (body.message ?? "").toString().trim().slice(0, 2000);
  if (!message) return NextResponse.json({ error: "message required" }, { status: 400 });

  const ratingNum = Number(body.rating);
  const rating = Number.isInteger(ratingNum) && ratingNum >= 1 && ratingNum <= 5 ? ratingNum : null;

  const { error } = await supabaseService().from("reviews").insert({
    message,
    rating,
    name: (body.name ?? "").toString().trim().slice(0, 120) || null,
    email: (body.email ?? "").toString().trim().slice(0, 200) || null,
    user_id: body.userId || null,
    page: (body.page ?? "").toString().slice(0, 200) || null,
  });

  if (error) {
    if (error.code === NO_TABLE) return NextResponse.json({ error: MIGRATION_HINT }, { status: 503 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

/**
 * Admin: list reviews (paginated, optional status filter).
 *   GET /api/reviews?status=new&page=1
 */
export async function GET(req: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const status = req.nextUrl.searchParams.get("status"); // new | read | archived
  const page = Math.max(1, Number(req.nextUrl.searchParams.get("page")) || 1);
  const pageSize = Math.min(100, Number(req.nextUrl.searchParams.get("pageSize")) || 25);
  const from = (page - 1) * pageSize;

  let q = supabaseService()
    .from("reviews")
    .select("id, created_at, rating, message, name, email, page, status", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, from + pageSize - 1);
  if (status === "new" || status === "read" || status === "archived") q = q.eq("status", status);

  const { data, error, count } = await q;
  if (error) {
    if (error.code === NO_TABLE) return NextResponse.json({ reviews: [], total: 0, page, pageSize, needsMigration: true });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ reviews: data ?? [], total: count ?? 0, page, pageSize });
}

/**
 * Admin: triage a review.
 *   PATCH /api/reviews { id, status: "new" | "read" | "archived" }
 */
export async function PATCH(req: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  let body: { id?: string; status?: string } = {};
  try {
    body = await req.json();
  } catch {
    /* ignore */
  }
  const { id } = body;
  if (!id || !["new", "read", "archived"].includes(body.status ?? "")) {
    return NextResponse.json({ error: "id and status (new|read|archived) required" }, { status: 400 });
  }
  const { error } = await supabaseService().from("reviews").update({ status: body.status }).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
