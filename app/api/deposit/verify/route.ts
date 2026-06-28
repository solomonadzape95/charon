import { NextRequest, NextResponse } from "next/server";
import { getUserById, creditDepositByTx } from "@/lib/db";
import { verifyUsdcDeposit } from "@/lib/arc-verify";

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * Verify an on-chain USDC deposit and credit the reader's ledger.
 * Used by both deposit methods (connect-wallet one-click + manual transfer).
 * The credited amount is read from the chain, not the request — and it's
 * idempotent on the tx hash, so the same transfer can't be credited twice.
 *   POST /api/deposit/verify { userId, txHash, method? }
 */
export async function POST(req: NextRequest) {
  let body: { userId?: string; txHash?: string; method?: "wallet" | "manual" } = {};
  try {
    body = await req.json();
  } catch {
    /* ignore */
  }
  const { userId, txHash } = body;
  const method = body.method === "manual" ? "manual" : "wallet";
  if (!userId || !txHash) {
    return NextResponse.json({ error: "userId and txHash required" }, { status: 400 });
  }

  const user = await getUserById(userId);
  if (!user) return NextResponse.json({ error: "user not found" }, { status: 404 });

  const treasury = process.env.TREASURY_WALLET_ADDRESS ?? "";
  const v = await verifyUsdcDeposit(txHash, treasury);
  if (!v.ok) return NextResponse.json({ error: v.reason }, { status: 400 });

  const { credited, already, balance } = await creditDepositByTx({
    userId,
    txHash,
    amountUsd: v.amountUsd!,
    method,
    fromAddress: v.from ?? null,
  });

  return NextResponse.json({
    ok: true,
    credited,
    already,
    amountUsd: v.amountUsd,
    balance,
    message: already
      ? "This transaction was already credited."
      : `Credited $${v.amountUsd!.toFixed(2)} from your on-chain transfer.`,
  });
}
