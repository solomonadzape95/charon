import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { adjustUserBalance } from "@/lib/db";
import { supabaseService } from "@/lib/supabase";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const search = req.nextUrl.searchParams.get("search")?.trim().toLowerCase();
  const page = Math.max(1, Number(req.nextUrl.searchParams.get("page")) || 1);
  const pageSize = Math.min(100, Number(req.nextUrl.searchParams.get("pageSize")) || 25);
  const from = (page - 1) * pageSize;

  let q = supabaseService()
    .from("users")
    .select("id, email, balance_usd, session_cap_usd, created_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, from + pageSize - 1);
  if (search) q = q.ilike("email", `%${search}%`);

  const { data, error, count } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ users: data ?? [], total: count ?? 0, page, pageSize });
}

/** Adjust a reader's balance (credit positive, debit negative). */
export async function PATCH(req: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  let body: { id?: string; deltaUsd?: number } = {};
  try {
    body = await req.json();
  } catch {
    /* ignore */
  }
  const { id } = body;
  const delta = Number(body.deltaUsd);
  if (!id || Number.isNaN(delta) || delta === 0) {
    return NextResponse.json({ error: "id and non-zero deltaUsd required" }, { status: 400 });
  }
  try {
    const balance = await adjustUserBalance(id, delta, delta >= 0 ? "deposit" : "refund");
    return NextResponse.json({ ok: true, balance });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
