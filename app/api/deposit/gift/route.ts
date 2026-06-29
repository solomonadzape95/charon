import { NextRequest, NextResponse } from "next/server";
import { adjustUserBalance, getUserById } from "@/lib/db";

export const runtime = "nodejs";

const MAX_GIFT = 100;

/**
 * Gift from your own reading balance into another reader's balance — a ledger
 * transfer: the giver is debited, the recipient credited.
 *   POST /api/deposit/gift { fromUserId, toUserId, amountUsd }
 */
export async function POST(req: NextRequest) {
  let body: { fromUserId?: string; toUserId?: string; amountUsd?: number } = {};
  try {
    body = await req.json();
  } catch {
    /* ignore */
  }
  const { toUserId, fromUserId } = body;
  const amount = Math.round((Number(body.amountUsd) || 0) * 100) / 100;
  if (!fromUserId || !toUserId || amount <= 0) {
    return NextResponse.json({ error: "fromUserId, toUserId and a positive amount are required" }, { status: 400 });
  }
  if (amount > MAX_GIFT) {
    return NextResponse.json({ error: `gifts are capped at $${MAX_GIFT}` }, { status: 400 });
  }
  if (toUserId === fromUserId) {
    return NextResponse.json({ error: "you can't gift to yourself" }, { status: 400 });
  }

  const [giver, recipient] = await Promise.all([getUserById(fromUserId), getUserById(toUserId)]);
  if (!giver) return NextResponse.json({ error: "sender not found" }, { status: 404 });
  if (!recipient) return NextResponse.json({ error: "recipient not found" }, { status: 404 });
  if (Number(giver.balance_usd) < amount) {
    return NextResponse.json({ error: "your balance is too low for this gift — top up first" }, { status: 400 });
  }

  // Debit the giver first (throws if it would overdraw), then credit the recipient.
  let giverBalance: number;
  try {
    giverBalance = await adjustUserBalance(fromUserId, -amount, "gift");
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
  await adjustUserBalance(toUserId, amount, "gift");

  return NextResponse.json({
    ok: true,
    amount,
    balance: giverBalance,
    recipient: { id: recipient.id, email: recipient.email, username: (recipient.email ?? "reader").split("@")[0] },
  });
}
