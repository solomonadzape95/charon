import { NextRequest, NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase";

export const runtime = "nodejs";

/**
 * Proactive creator registration (optional — most creators are created on first
 * tip). Lets a creator pre-register a payout wallet so tips route directly.
 *   POST /api/creators { name?, email?, walletAddress }
 *   GET  /api/creators → list (debug / stats)
 */
export async function POST(req: NextRequest) {
  let body: { name?: string; email?: string; walletAddress?: string } = {};
  try {
    body = await req.json();
  } catch {
    /* ignore */
  }
  const walletAddress = body.walletAddress?.trim();
  if (!walletAddress || !/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
    return NextResponse.json({ error: "valid 0x walletAddress required" }, { status: 400 });
  }
  const { data, error } = await supabaseService()
    .from("creators")
    .insert({ name: body.name ?? null, email: body.email ?? null, wallet_address: walletAddress })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ creator: data });
}

export async function GET() {
  const { data } = await supabaseService()
    .from("creators")
    .select("id, name, wallet_address, balance_usd, claimed, created_at")
    .order("created_at", { ascending: false });
  return NextResponse.json({ creators: data ?? [] });
}
