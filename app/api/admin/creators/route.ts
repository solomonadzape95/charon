import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { supabaseService } from "@/lib/supabase";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const search = req.nextUrl.searchParams.get("search")?.trim().toLowerCase();
  const filter = req.nextUrl.searchParams.get("filter"); // claimed | unclaimed
  const page = Math.max(1, Number(req.nextUrl.searchParams.get("page")) || 1);
  const pageSize = Math.min(100, Number(req.nextUrl.searchParams.get("pageSize")) || 25);
  const from = (page - 1) * pageSize;

  let q = supabaseService()
    .from("creators")
    .select("id, name, email, slug, wallet_address, balance_usd, total_earned_usdc, claimed, claim_token, created_at", { count: "exact" })
    .order("total_earned_usdc", { ascending: false })
    .range(from, from + pageSize - 1);
  if (filter === "claimed") q = q.eq("claimed", true);
  if (filter === "unclaimed") q = q.eq("claimed", false);
  if (search) q = q.or(`name.ilike.%${search}%,email.ilike.%${search}%,slug.ilike.%${search}%`);

  const { data, error, count } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ creators: data ?? [], total: count ?? 0, page, pageSize });
}

/**
 * Admin creator actions.
 *   PATCH { id, action: "markClaimed" | "markUnclaimed" | "setWallet" | "adjustEscrow", walletAddress?, deltaUsd? }
 */
export async function PATCH(req: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  let body: { id?: string; action?: string; walletAddress?: string; deltaUsd?: number } = {};
  try {
    body = await req.json();
  } catch {
    /* ignore */
  }
  const { id, action } = body;
  if (!id || !action) return NextResponse.json({ error: "id and action required" }, { status: 400 });
  const db = supabaseService();

  if (action === "markClaimed" || action === "markUnclaimed") {
    await db.from("creators").update({ claimed: action === "markClaimed" }).eq("id", id);
    return NextResponse.json({ ok: true });
  }
  if (action === "setWallet") {
    if (!body.walletAddress || !/^0x[a-fA-F0-9]{40}$/.test(body.walletAddress)) {
      return NextResponse.json({ error: "valid 0x walletAddress required" }, { status: 400 });
    }
    await db.from("creators").update({ wallet_address: body.walletAddress }).eq("id", id);
    return NextResponse.json({ ok: true });
  }
  if (action === "adjustEscrow") {
    const delta = Number(body.deltaUsd);
    if (Number.isNaN(delta) || delta === 0) return NextResponse.json({ error: "non-zero deltaUsd required" }, { status: 400 });
    const { data } = await db.from("creators").select("balance_usd").eq("id", id).maybeSingle();
    const next = Math.round((Number((data as { balance_usd: number } | null)?.balance_usd ?? 0) + delta) * 100) / 100;
    if (next < 0) return NextResponse.json({ error: "escrow cannot go negative" }, { status: 400 });
    await db.from("creators").update({ balance_usd: next }).eq("id", id);
    return NextResponse.json({ ok: true, balance: next });
  }
  return NextResponse.json({ error: "unknown action" }, { status: 400 });
}
