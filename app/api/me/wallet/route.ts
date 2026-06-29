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

  const db = supabaseService();
  const { data: ledger } = await db
    .from("ledger")
    .select("kind, amount_usd, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(200);

  // The reader agent's funded wallet (if they have one) — so the money they
  // moved into the agent is visible from the wallet, not just on the agent page.
  const { data: agent } = await db
    .from("agent_config")
    .select("wallet_balance_usdc, week_funded_usdc")
    .eq("user_id", userId)
    .maybeSingle();

  const spent = (ledger ?? [])
    .filter((l) => Number(l.amount_usd) < 0)
    .reduce((s, l) => s + Math.abs(Number(l.amount_usd)), 0);
  const deposited = (ledger ?? [])
    .filter((l) => l.kind === "deposit")
    .reduce((s, l) => s + Number(l.amount_usd), 0);

  const agentRow = agent as { wallet_balance_usdc: number; week_funded_usdc: number } | null;

  return NextResponse.json({
    balance: Number(user.balance_usd),
    deposited,
    spent,
    agentWallet: agentRow ? { balance: Number(agentRow.wallet_balance_usdc), funded: Number(agentRow.week_funded_usdc) } : null,
    ledger: (ledger ?? []).map((l) => ({
      kind: l.kind,
      amount: Number(l.amount_usd),
      created_at: l.created_at,
    })),
  });
}
