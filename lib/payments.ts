/**
 * Payment orchestration for the reading platform.
 *
 *  - Reader balances: a Supabase ledger backed by the pooled Arc treasury
 *    (TREASURY_WALLET_PK). Deposits credit the ledger; sessions/unlocks debit it.
 *  - Settlement: the treasury settles USDC → a creator address on Arc via the
 *    x402 /api/settle endpoint. If the creator has no payout wallet yet, the
 *    amount is held as escrow (creators.balance_usd) + a Circle Programmable
 *    Wallet is provisioned as their managed claim wallet.
 *  - Claim/withdraw: accumulated escrow settles from the treasury → the address
 *    the creator provides (or their Circle PW) on Arc.
 */
import { payUrl, ensureGatewayBalance } from "@/lib/payer";
import { circleEnabled, createCreatorWallet } from "@/lib/circle";
import {
  adjustCreatorBalance,
  adjustUserBalance,
  getCreatorById,
  listPaymentsForCreator,
  markCreatorClaimed,
  recordPayment,
  setCreatorCircleWallet,
  updatePayment,
} from "@/lib/db";
import type { Creator } from "@/lib/supabase";

export const MIN_SETTLE = 0.01;
export const MAX_SESSION = 5;

function baseUrl(): string {
  return process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
}

/** Clamp + validate a session settlement against hard limits + the reader's cap. */
export function validateAmount(amount: number, sessionCap: number): { ok: boolean; reason?: string } {
  if (Number.isNaN(amount) || amount < MIN_SETTLE) return { ok: false, reason: `minimum settlement is $${MIN_SETTLE}` };
  if (amount > MAX_SESSION) return { ok: false, reason: `maximum single settlement is $${MAX_SESSION}` };
  if (amount > sessionCap) return { ok: false, reason: `exceeds session cap of $${sessionCap.toFixed(2)}` };
  return { ok: true };
}

/** Credit a reader's balance (deposit / top-up). USDC physically sits in the treasury. */
export async function deposit(userId: string, amountUsd: number): Promise<number> {
  try {
    await ensureGatewayBalance(process.env.TREASURY_WALLET_PK!, "1");
  } catch (e) {
    console.warn("[charon] ensureGatewayBalance:", (e as Error).message);
  }
  return adjustUserBalance(userId, amountUsd, "deposit");
}

/** Settle USDC from the pooled treasury to an address on Arc via x402. Returns the tx hash. */
export async function settleFromTreasury(toWallet: string, amountUsd: number): Promise<string | undefined> {
  const url = `${baseUrl()}/api/settle?to=${encodeURIComponent(toWallet)}&amount=${amountUsd}`;
  const res = await payUrl(process.env.TREASURY_WALLET_PK!, url);
  if (res.status !== 200) throw new Error(`settlement failed (status ${res.status})`);
  return res.transaction;
}

export interface SettleSessionArgs {
  userId: string;
  creator: Creator;
  chapterId: string;
  sessionId?: string | null;
  amountUsd: number;
  debitKind?: "session_debit" | "unlock_debit";
}

export interface SettleResult {
  paymentId: string;
  status: "settled" | "escrowed" | "failed";
  txHash?: string;
  reason?: string;
}

/**
 * Settle a single reader→creator amount: debit the reader, then either route
 * directly to the creator's Arc wallet or escrow it (Circle PW provisioned).
 * This is the core call Agent 1 (and the unlock flows) use.
 */
export async function settleSession(args: SettleSessionArgs): Promise<SettleResult> {
  const { userId, creator, chapterId, sessionId, amountUsd } = args;

  const payment = await recordPayment({
    sessionId,
    userId,
    creatorId: creator.id,
    chapterId,
    amountUsdc: amountUsd,
    status: "pending",
  });

  // 1. Debit the reader's ledger first (throws on insufficient balance).
  try {
    await adjustUserBalance(userId, -amountUsd, args.debitKind ?? "session_debit", payment.id);
  } catch (e) {
    await updatePayment(payment.id, { status: "failed" });
    return { paymentId: payment.id, status: "failed", reason: (e as Error).message };
  }

  // 2a. Direct route — settle treasury → creator wallet on Arc.
  if (creator.wallet_address) {
    try {
      const txHash = await settleFromTreasury(creator.wallet_address, amountUsd);
      await updatePayment(payment.id, { status: "settled", arc_tx_hash: txHash ?? null });
      await adjustCreatorBalance(creator.id, amountUsd);
      return { paymentId: payment.id, status: "settled", txHash };
    } catch (e) {
      await adjustUserBalance(userId, amountUsd, "refund", payment.id);
      await updatePayment(payment.id, { status: "failed" });
      return { paymentId: payment.id, status: "failed", reason: (e as Error).message };
    }
  }

  // 2b. Escrow route — hold in treasury, accrue to creator, provision Circle PW.
  await adjustCreatorBalance(creator.id, amountUsd);
  await updatePayment(payment.id, { status: "settled" });
  if (circleEnabled() && !creator.circle_wallet_id) {
    try {
      const w = await createCreatorWallet(creator.id);
      await setCreatorCircleWallet(creator.id, w.walletId, w.address);
    } catch (e) {
      console.warn("[charon] Circle wallet provision failed (ledger-only escrow):", (e as Error).message);
    }
  }
  return { paymentId: payment.id, status: "escrowed" };
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
  if (amount < MIN_SETTLE) return { ok: false, amount, reason: "nothing to claim" };
  try {
    const txHash = await settleFromTreasury(destinationAddress, amount);
    // Mark pending/escrowed payments as settled (best-effort audit) + zero balance.
    const pays = await listPaymentsForCreator(creator.id);
    await Promise.all(
      pays.filter((p) => p.status === "pending").map((p) => updatePayment(p.id, { status: "settled" })),
    );
    await markCreatorClaimed(creator.id);
    return { ok: true, txHash, amount };
  } catch (e) {
    return { ok: false, amount, reason: (e as Error).message };
  }
}

/** Re-fetch a creator and return whether they now have escrow to claim. */
export async function refreshCreator(creatorId: string): Promise<Creator | null> {
  return getCreatorById(creatorId);
}
