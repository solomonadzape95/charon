import { NextRequest, NextResponse } from "next/server";
import { getCreatorById } from "@/lib/db";
import { supabaseService } from "@/lib/supabase";

export const runtime = "nodejs";

const BANK_FEE = 0.015; // 1.5% Circle offramp conversion fee

/**
 * Withdraw cleared creator earnings.
 *   POST /api/creator/withdraw { creatorId, amountUsd, destination }
 * Decrements the creator's claimable balance. USDC payouts are free; bank
 * payouts disclose and net out the 1.5% conversion fee.
 */
export async function POST(req: NextRequest) {
  let body: { creatorId?: string; amountUsd?: number; destination?: "usdc_wallet" | "bank" } = {};
  try {
    body = await req.json();
  } catch {
    /* ignore */
  }
  const { creatorId } = body;
  const destination = body.destination === "bank" ? "bank" : "usdc_wallet";
  const amount = Number(body.amountUsd);
  if (!creatorId || Number.isNaN(amount) || amount <= 0) {
    return NextResponse.json({ error: "creatorId and positive amountUsd required" }, { status: 400 });
  }

  const creator = await getCreatorById(creatorId);
  if (!creator) return NextResponse.json({ error: "not found" }, { status: 404 });

  const available = Number(creator.balance_usd);
  if (amount > available + 1e-9) {
    return NextResponse.json({ error: "amount exceeds available balance" }, { status: 400 });
  }
  if (destination === "usdc_wallet" && !creator.wallet_address) {
    return NextResponse.json({ error: "add a payout wallet first" }, { status: 400 });
  }

  const fee = destination === "bank" ? Math.round(amount * BANK_FEE * 100) / 100 : 0;
  const received = Math.round((amount - fee) * 100) / 100;

  await supabaseService()
    .from("creators")
    .update({ balance_usd: Math.round((available - amount) * 100) / 100 })
    .eq("id", creatorId);

  return NextResponse.json({
    ok: true,
    withdrawn: amount,
    fee,
    received,
    destination,
    balance: Math.round((available - amount) * 100) / 100,
  });
}
