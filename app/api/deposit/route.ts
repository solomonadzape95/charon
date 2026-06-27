import { NextRequest, NextResponse } from "next/server";
import { deposit } from "@/lib/payments";
import { getUserById } from "@/lib/db";

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * Top up a reader's balance (prepaid model). USDC is held in the pooled treasury.
 *   POST /api/deposit { userId, amountUsd }
 */
export async function POST(req: NextRequest) {
  let body: { userId?: string; amountUsd?: number } = {};
  try {
    body = await req.json();
  } catch {
    /* ignore */
  }
  const { userId } = body;
  const amount = Number(body.amountUsd);
  if (!userId || Number.isNaN(amount) || amount <= 0) {
    return NextResponse.json({ error: "userId and positive amountUsd required" }, { status: 400 });
  }
  if (amount > 100) return NextResponse.json({ error: "max single deposit is $100 (testnet)" }, { status: 400 });

  const user = await getUserById(userId);
  if (!user) return NextResponse.json({ error: "user not found" }, { status: 404 });

  const balance = await deposit(userId, amount);
  return NextResponse.json({ balance });
}
