import { NextRequest, NextResponse } from "next/server";
import { grantWelcomeCreditOnce, getUserById } from "@/lib/db";
import { roundUsdc } from "@/lib/money";

export const runtime = "nodejs";

/** New-reader welcome credit, in USD. Configurable; defaults to $0.50. */
function welcomeCreditUsd(): number {
  const v = Number(process.env.WELCOME_CREDIT_USD);
  return Number.isFinite(v) && v >= 0 ? roundUsdc(v) : 0.5;
}

/**
 * Grant the one-time welcome credit to a reader (idempotent — safe to call on
 * every onboarding mount; the DB guarantees it lands at most once).
 *   POST /api/me/welcome-credit { userId }
 */
export async function POST(req: NextRequest) {
  let body: { userId?: string } = {};
  try {
    body = await req.json();
  } catch {
    /* ignore */
  }
  const { userId } = body;
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

  const user = await getUserById(userId);
  if (!user) return NextResponse.json({ error: "user not found" }, { status: 404 });

  const amount = welcomeCreditUsd();
  const { granted, balance } = await grantWelcomeCreditOnce(userId, amount);
  return NextResponse.json({ granted, amount, balance });
}
