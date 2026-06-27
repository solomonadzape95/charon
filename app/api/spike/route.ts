import { NextRequest, NextResponse } from "next/server";
import {
  buildPaymentRequirements,
  encode402Header,
  verifyAndSettle,
  encodePaymentResponse,
} from "@/lib/arc";

export const runtime = "nodejs";

// A hardcoded $0.01 gated route used only to prove the Arc rail end-to-end.
const PRICE = "$0.01";

export async function GET(req: NextRequest) {
  // Distinct from the treasury payer — the rail rejects self-transfers.
  const seller =
    process.env.SPIKE_SELLER ?? "0xa196224F790d2c89070b3B6e0C7c77D8E7c7f739";
  const resourceUrl = req.nextUrl.href;
  const requirements = buildPaymentRequirements(PRICE, seller, resourceUrl);

  const outcome = await verifyAndSettle(
    req.headers.get("payment-signature"),
    requirements,
  );

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
    message: "hello from Arc — you paid for this",
    paid_by: outcome.payer,
    amount_usdc: outcome.amountUsdc,
    settlement: outcome.transaction,
  });
  res.headers.set("PAYMENT-RESPONSE", encodePaymentResponse(outcome));
  return res;
}
