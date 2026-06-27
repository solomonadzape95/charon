import { NextRequest, NextResponse } from "next/server";
import { getUserById } from "@/lib/db";
import { supabaseService } from "@/lib/supabase";

export const runtime = "nodejs";

/**
 * A reader's wallet — balance + ledger (deposits, session debits, refunds).
 *   GET /api/me/wallet?userId=<uuid>
 */
export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId");
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });
  const user = await getUserById(userId);
  if (!user) return NextResponse.json({ error: "not found" }, { status: 404 });

  const { data: ledger } = await supabaseService()
    .from("ledger")
    .select("kind, amount_usd, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(100);

  const spent = (ledger ?? [])
    .filter((l) => Number(l.amount_usd) < 0)
    .reduce((s, l) => s + Math.abs(Number(l.amount_usd)), 0);
  const deposited = (ledger ?? [])
    .filter((l) => l.kind === "deposit")
    .reduce((s, l) => s + Number(l.amount_usd), 0);

  return NextResponse.json({
    balance: Number(user.balance_usd),
    deposited,
    spent,
    ledger: (ledger ?? []).map((l) => ({
      kind: l.kind,
      amount: Number(l.amount_usd),
      created_at: l.created_at,
    })),
  });
}
