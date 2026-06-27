import { NextRequest, NextResponse } from "next/server";
import {
  buildPaymentRequirements,
  encode402Header,
  verifyAndSettle,
  encodePaymentResponse,
} from "@/lib/arc";

export const runtime = "nodejs";

/**
 * Generic x402 settlement endpoint. The pooled treasury wallet pays this URL to
 * move USDC to an arbitrary creator address on Arc — the "resource" being paid
 * for is the tip itself. Reuses the exact verify/settle path proven by /api/spike.
 *
 *   GET /api/settle?to=<creatorWallet>&amount=<usd>
 *
 * Not exploitable for theft: the caller can only send their OWN signed funds to
 * `to`. lib/payments.ts is the only intended caller (treasury → creator).
 */
export async function GET(req: NextRequest) {
  const to = req.nextUrl.searchParams.get("to");
  const amount = req.nextUrl.searchParams.get("amount");
  if (!to || !amount || Number.isNaN(Number(amount))) {
    return NextResponse.json({ error: "to and numeric amount required" }, { status: 400 });
  }

  const resourceUrl = req.nextUrl.href;
  const requirements = buildPaymentRequirements(amount, to, resourceUrl);

  const outcome = await verifyAndSettle(req.headers.get("payment-signature"), requirements);

  if (!outcome.ok) {
    return new NextResponse(JSON.stringify({ error: outcome.reason }), {
      status: outcome.status,
      headers: {
        "Content-Type": "application/json",
        "PAYMENT-REQUIRED": encode402Header(requirements, resourceUrl),
      },
    });
  }

  const res = NextResponse.json({
    settled: true,
    to,
    amount_usdc: outcome.amountUsdc,
    payer: outcome.payer,
    transaction: outcome.transaction,
  });
  res.headers.set("PAYMENT-RESPONSE", encodePaymentResponse(outcome));
  return res;
}
