import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { adjustUserBalance } from "@/lib/db";
import { supabaseService } from "@/lib/supabase";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const search = req.nextUrl.searchParams.get("search")?.trim().toLowerCase();
  const limit = Math.min(100, Number(req.nextUrl.searchParams.get("limit")) || 50);

  let q = supabaseService()
    .from("users")
    .select("id, email, balance_usd, session_cap_usd, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (search) q = q.ilike("email", `%${search}%`);

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ users: data ?? [] });
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
