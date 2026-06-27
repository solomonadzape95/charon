import { NextRequest, NextResponse } from "next/server";
import { claimPayout } from "@/lib/payments";
import { getCreatorByClaimToken, listTipsForCreator } from "@/lib/db";

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 *   GET  /api/claim?token=<claim_token>  → creator escrow summary
 *   POST /api/claim { token, destinationAddress, email? } → withdraw to an address
 *
 * "Email verification": the claim link is the secret (delivered to the creator's
 * inbox). When the creator has an email on file, the claimant must echo it back.
 */
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) return NextResponse.json({ error: "token required" }, { status: 400 });
  const creator = await getCreatorByClaimToken(token);
  if (!creator) return NextResponse.json({ error: "not found" }, { status: 404 });
  const tips = await listTipsForCreator(creator.id);
  return NextResponse.json({
    creator: {
      id: creator.id,
      name: creator.name,
      balance_usd: Number(creator.balance_usd),
      claimed: creator.claimed,
      circle_wallet_address: creator.circle_wallet_address,
      has_email: Boolean(creator.email),
    },
    tips: tips.map((t) => ({
      amount_usd: Number(t.amount_usd),
      url: t.url,
      platform: t.platform,
      status: t.status,
      created_at: t.created_at,
    })),
  });
}

export async function POST(req: NextRequest) {
  let body: { token?: string; destinationAddress?: string; email?: string } = {};
  try {
    body = await req.json();
  } catch {
    /* ignore */
  }
  if (!body.token || !body.destinationAddress) {
    return NextResponse.json({ error: "token and destinationAddress required" }, { status: 400 });
  }
  if (!/^0x[a-fA-F0-9]{40}$/.test(body.destinationAddress.trim())) {
    return NextResponse.json({ error: "destinationAddress must be a 0x… wallet" }, { status: 400 });
  }
  const creator = await getCreatorByClaimToken(body.token);
  if (!creator) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (creator.claimed) return NextResponse.json({ error: "already claimed" }, { status: 409 });
  if (creator.email && body.email?.trim().toLowerCase() !== creator.email.toLowerCase()) {
    return NextResponse.json({ error: "email does not match the one we have on file" }, { status: 403 });
  }

  const out = await claimPayout(creator, body.destinationAddress.trim());
  if (!out.ok) return NextResponse.json({ error: out.reason ?? "claim failed" }, { status: 500 });
  return NextResponse.json({ ok: true, amount: out.amount, txHash: out.txHash });
}
