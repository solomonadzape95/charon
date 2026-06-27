/**
 * Hybrid payment orchestration.
 *
 *  - Reader balances: a Supabase ledger backed by the pooled Arc treasury
 *    (TREASURY_WALLET_PK). Deposits credit the ledger; tips debit it.
 *  - Direct route (creator wallet known, high confidence): the treasury settles
 *    USDC → creator wallet on Arc via the x402 /api/settle endpoint.
 *  - Escrow route (no wallet / low confidence): funds stay in the treasury,
 *    tracked as creators.balance_usd; a Circle Programmable Wallet is provisioned
 *    as the creator's managed claim wallet; a digest claim email is queued.
 *  - Claim: accumulated escrow settles from the treasury → the address the
 *    creator provides (or their Circle PW) on Arc.
 */
import { payUrl, ensureGatewayBalance } from "@/lib/payer";
import { circleEnabled, createCreatorWallet } from "@/lib/circle";
import { sendClaimEmail } from "@/lib/email";
import {
  adjustCreatorBalance,
  adjustUserBalance,
  createTip,
  getCreatorById,
  listTipsForCreator,
  markCreatorClaimed,
  setCreatorCircleWallet,
  updateTip,
} from "@/lib/db";
import type { Creator } from "@/lib/supabase";

export const MIN_TIP = 0.01;
export const MAX_TIP = 10;

function baseUrl(): string {
  return process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
}

/** Clamp + validate a tip amount against the hard platform limits. */
export function validateAmount(amount: number, sessionCap: number): { ok: boolean; reason?: string } {
  if (Number.isNaN(amount) || amount < MIN_TIP) return { ok: false, reason: `minimum tip is $${MIN_TIP}` };
  if (amount > MAX_TIP) return { ok: false, reason: `maximum tip is $${MAX_TIP}` };
  if (amount > sessionCap) return { ok: false, reason: `exceeds your session cap of $${sessionCap.toFixed(2)} (raise it in the dashboard)` };
  return { ok: true };
}

/** Credit a reader's balance (dashboard deposit). USDC physically sits in the treasury. */
export async function deposit(userId: string, amountUsd: number): Promise<number> {
  // Keep the treasury's Gateway deposit topped up so it can settle tips.
  try {
    await ensureGatewayBalance(process.env.TREASURY_WALLET_PK!, "1");
  } catch (e) {
    console.warn("[charon] ensureGatewayBalance:", (e as Error).message);
  }
  return adjustUserBalance(userId, amountUsd, "deposit");
}

/** Settle USDC from the pooled treasury to an address on Arc via x402. */
async function settleFromTreasury(toWallet: string, amountUsd: number): Promise<string | undefined> {
  const url = `${baseUrl()}/api/settle?to=${encodeURIComponent(toWallet)}&amount=${amountUsd}`;
  const res = await payUrl(process.env.TREASURY_WALLET_PK!, url);
  if (res.status !== 200) throw new Error(`settlement failed (status ${res.status})`);
  return res.transaction;
}

export interface RouteResult {
  tipId: string;
  status: "sent" | "escrowed" | "failed";
  txHash?: string;
  reason?: string;
  escrowed?: boolean;
}

/**
 * Execute a confirmed tip end-to-end. Debits the reader, then either settles
 * directly to the creator's wallet or escrows it (Circle PW + claim email).
 */
export async function executeTip(args: {
  userId: string;
  creator: Creator;
  url: string;
  platform?: string | null;
  amountUsd: number;
  confidence: number;
  agentReasoning?: string | null;
  forceEscrow?: boolean;
}): Promise<RouteResult> {
  const { userId, creator, amountUsd } = args;

  // 1. Debit the reader's ledger first (throws on insufficient balance).
  const tip = await createTip({
    userId,
    creatorId: creator.id,
    url: args.url,
    platform: args.platform,
    amountUsd,
    confidence: args.confidence,
    agentReasoning: args.agentReasoning,
  });
  try {
    await adjustUserBalance(userId, -amountUsd, "tip_debit", tip.id);
  } catch (e) {
    await updateTip(tip.id, { status: "failed" });
    return { tipId: tip.id, status: "failed", reason: (e as Error).message };
  }

  const canRouteDirect = !args.forceEscrow && args.confidence >= 95 && Boolean(creator.wallet_address);

  // 2a. Direct route — settle treasury → creator wallet on Arc.
  if (canRouteDirect) {
    try {
      const txHash = await settleFromTreasury(creator.wallet_address!, amountUsd);
      await updateTip(tip.id, { status: "sent", tx_hash: txHash ?? null });
      return { tipId: tip.id, status: "sent", txHash };
    } catch (e) {
      // Refund the reader and fall through to escrow.
      await adjustUserBalance(userId, amountUsd, "refund", tip.id);
      await updateTip(tip.id, { status: "failed" });
      return { tipId: tip.id, status: "failed", reason: (e as Error).message };
    }
  }

  // 2b. Escrow route — hold in treasury, track on creator, provision Circle PW.
  await adjustCreatorBalance(creator.id, amountUsd);
  await updateTip(tip.id, { status: "escrowed" });

  if (circleEnabled() && !creator.circle_wallet_id) {
    try {
      const w = await createCreatorWallet(creator.id);
      await setCreatorCircleWallet(creator.id, w.walletId, w.address);
    } catch (e) {
      console.warn("[charon] Circle wallet provision failed (ledger-only escrow):", (e as Error).message);
    }
  }

  // Queue/refresh the digest claim email if we have an address for them.
  if (creator.email) {
    const fresh = (await getCreatorById(creator.id))!;
    const tips = await listTipsForCreator(creator.id);
    await sendClaimEmail({
      to: creator.email,
      creatorName: creator.name,
      totalUsd: Number(fresh.balance_usd),
      tipCount: tips.filter((t) => t.status === "escrowed").length,
      claimUrl: `${baseUrl()}/claim/${creator.claim_token}`,
    });
  }

  return { tipId: tip.id, status: "escrowed", escrowed: true };
}

/**
 * Pay out a creator's accumulated escrow to a destination address on Arc.
 * Settles real USDC from the treasury, then zeroes the creator's escrow.
 */
export async function claimPayout(
  creator: Creator,
  destinationAddress: string,
): Promise<{ ok: boolean; txHash?: string; amount: number; reason?: string }> {
  const amount = Number(creator.balance_usd);
  if (amount < MIN_TIP) return { ok: false, amount, reason: "nothing to claim" };
  try {
    const txHash = await settleFromTreasury(destinationAddress, amount);
    // Mark every escrowed tip claimed + zero the creator balance.
    const tips = await listTipsForCreator(creator.id);
    await Promise.all(
      tips.filter((t) => t.status === "escrowed").map((t) => updateTip(t.id, { status: "claimed" })),
    );
    await markCreatorClaimed(creator.id);
    return { ok: true, txHash, amount };
  } catch (e) {
    return { ok: false, amount, reason: (e as Error).message };
  }
}
