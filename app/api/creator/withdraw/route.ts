import { NextRequest, NextResponse } from "next/server";
import { getCreatorById, recordCreatorWithdrawal } from "@/lib/db";
import { withdrawForCreator } from "@/lib/payments";
import { getCreatorBalances } from "@/lib/treasury";
import { roundUsdc } from "@/lib/money";

export const runtime = "nodejs";

const BANK_FEE = 0.015; // 1.5% Circle offramp conversion fee

/**
 * Creator escrow snapshot.
 *   GET /api/creator/withdraw?creatorId=<uuid>
 * Returns the available (cleared) vs pending (in 7-day escrow) split.
 */
export async function GET(req: NextRequest) {
  const creatorId = req.nextUrl.searchParams.get("creatorId");
  if (!creatorId) return NextResponse.json({ error: "creatorId required" }, { status: 400 });
  const creator = await getCreatorById(creatorId);
  if (!creator) return NextResponse.json({ error: "not found" }, { status: 404 });
  const balances = await getCreatorBalances(creatorId);
  return NextResponse.json({
    ...balances,
    wallet_address: creator.wallet_address,
    payout_preference: creator.payout_preference,
  });
}

/**
 * Withdraw cleared creator earnings.
 *   POST /api/creator/withdraw { creatorId, amountUsd, destination }
 * Only earnings past their 7-day escrow window are withdrawable. USDC payouts
 * settle on-chain from the treasury and are free; bank payouts disclose and net
 * out the 1.5% conversion fee.
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
  const amount = roundUsdc(Number(body.amountUsd));
  if (!creatorId || Number.isNaN(amount) || amount <= 0) {
    return NextResponse.json({ error: "creatorId and positive amountUsd required" }, { status: 400 });
  }

  const creator = await getCreatorById(creatorId);
  if (!creator) return NextResponse.json({ error: "not found" }, { status: 404 });

  const { available } = await getCreatorBalances(creatorId);
  if (amount > available + 1e-9) {
    return NextResponse.json(
      { error: "amount exceeds cleared balance (earnings clear 7 days after they're earned)" },
      { status: 400 },
    );
  }

  // USDC wallet: real on-chain settlement from the treasury.
  if (destination === "usdc_wallet") {
    if (!creator.wallet_address) {
      return NextResponse.json({ error: "add a payout wallet first" }, { status: 400 });
    }
    const res = await withdrawForCreator(creator, amount, creator.wallet_address);
    if (!res.ok) return NextResponse.json({ error: res.reason ?? "withdrawal failed" }, { status: 502 });
    return NextResponse.json({
      ok: true,
      withdrawn: amount,
      fee: 0,
      received: amount,
      destination,
      txHash: res.txHash,
      balance: res.available,
    });
  }

  // Bank offramp: ledger-only on testnet; disclose the 1.5% conversion fee.
  const fee = roundUsdc(amount * BANK_FEE);
  const received = roundUsdc(amount - fee);
  await recordCreatorWithdrawal(creatorId, amount);
  const after = await getCreatorBalances(creatorId);
  return NextResponse.json({
    ok: true,
    withdrawn: amount,
    fee,
    received,
    destination,
    balance: after.available,
  });
}
