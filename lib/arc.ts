/**
 * Arc / Circle x402 nanopayment helpers.
 *
 * Server gating follows the pattern from circlefin/arc-nanopayments: manually
 * build payment requirements (with the Gateway batching `extra` field) and call
 * BatchFacilitatorClient.verify()/.settle() directly. Unlike that sample, our
 * `payTo` (seller) and price are dynamic per article, so each creator is paid
 * to their own Arc wallet.
 */
import { BatchFacilitatorClient } from "@circle-fin/x402-batching/server";

// ── Arc Testnet constants (from the @circle-fin/x402-batching SDK) ──
export const ARC_TESTNET_NETWORK = "eip155:5042002";
export const ARC_TESTNET_USDC = "0x3600000000000000000000000000000000000000";
export const ARC_TESTNET_GATEWAY_WALLET =
  "0x0077777d7EBA4688BDeF3E311b846F25870A19B9";
export const ARC_TESTNET_RPC = "https://rpc.testnet.arc.network";
export const ARC_EXPLORER = "https://testnet.arcscan.app";

// IMPORTANT: the SDK defaults to the MAINNET facilitator (gateway-api.circle.com),
// which rejects Arc testnet (eip155:5042002) as `unsupported_network`. Pin testnet.
export const CIRCLE_FACILITATOR_URL =
  process.env.CIRCLE_FACILITATOR_URL ?? "https://gateway-api-testnet.circle.com";
const facilitator = new BatchFacilitatorClient({ url: CIRCLE_FACILITATOR_URL });

export type PaymentRequirements = ReturnType<typeof buildPaymentRequirements>;

/** Convert a "$0.05" string (or bare number string) to atomic USDC requirements. */
export function buildPaymentRequirements(
  price: string,
  payTo: string,
  resourceUrl: string,
) {
  const clean = price.replace("$", "").trim();
  const amount = Math.round(parseFloat(clean) * 1_000_000); // 6 decimals
  return {
    scheme: "exact" as const,
    network: ARC_TESTNET_NETWORK,
    asset: ARC_TESTNET_USDC,
    amount: amount.toString(),
    payTo: payTo as `0x${string}`,
    resource: resourceUrl,
    maxTimeoutSeconds: 345600,
    extra: {
      name: "GatewayWalletBatched",
      version: "1",
      verifyingContract: ARC_TESTNET_GATEWAY_WALLET,
    },
  };
}

export function encode402Header(requirements: PaymentRequirements, resourceUrl: string) {
  const paymentRequired = {
    x402Version: 2,
    resource: {
      url: resourceUrl,
      description: `Paid resource (${
        Number(requirements.amount) / 1e6
      } USDC)`,
      mimeType: "application/json",
    },
    accepts: [requirements],
  };
  return Buffer.from(JSON.stringify(paymentRequired)).toString("base64");
}

export interface SettleOutcome {
  ok: boolean;
  status: number;
  /** present when ok */
  payer?: string;
  transaction?: string;
  amountUsdc?: string;
  /** present when !ok */
  reason?: string;
}

/**
 * Verify + settle a payment-signature header against the given requirements.
 * Returns a structured outcome the caller maps to a response.
 */
export async function verifyAndSettle(
  paymentSignature: string | null,
  requirements: PaymentRequirements,
): Promise<SettleOutcome> {
  if (!paymentSignature) {
    return { ok: false, status: 402, reason: "payment required" };
  }
  let payload: unknown;
  try {
    payload = JSON.parse(
      Buffer.from(paymentSignature, "base64").toString("utf-8"),
    );
  } catch {
    return { ok: false, status: 400, reason: "malformed payment-signature" };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const verifyResult = await facilitator.verify(payload as any, requirements as any);
  if (!verifyResult.isValid) {
    return {
      ok: false,
      status: 402,
      reason: verifyResult.invalidReason ?? "verification failed",
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const settleResult = await facilitator.settle(payload as any, requirements as any);
  if (!settleResult.success) {
    return {
      ok: false,
      status: 402,
      reason: settleResult.errorReason ?? "settlement failed",
    };
  }

  return {
    ok: true,
    status: 200,
    payer: settleResult.payer ?? verifyResult.payer ?? "unknown",
    transaction: settleResult.transaction ?? undefined,
    amountUsdc: (Number(requirements.amount) / 1e6).toString(),
  };
}

export function encodePaymentResponse(outcome: SettleOutcome) {
  return Buffer.from(
    JSON.stringify({
      success: true,
      transaction: outcome.transaction,
      network: ARC_TESTNET_NETWORK,
      payer: outcome.payer,
    }),
  ).toString("base64");
}
