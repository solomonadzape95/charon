/**
 * Payment orchestration for the reading platform (escrow-batched model).
 *
 *  - Reader balances: a Supabase ledger backed by the pooled Arc treasury
 *    (TREASURY_WALLET_PK). Deposits credit the ledger; sessions/unlocks debit it.
 *  - Settlement: a reader's gross payment is split 95/5 — the creator's net
 *    accrues to their escrow ledger (shown live), the 5% fee stays in the
 *    treasury as platform revenue. No per-session on-chain call; settlement is
 *    batched to withdrawal time (cheaper, matches Circle batching).
 *  - Escrow: net earnings clear 7 days after they're earned, then become
 *    withdrawable. A Circle Programmable Wallet is provisioned lazily as the
 *    creator's managed claim wallet.
 *  - Withdraw: cleared escrow settles from the treasury → the creator's address
 *    on Arc (the real on-chain tx), and is moved into lifetime withdrawn.
 */
import { payUrl, ensureGatewayBalance } from "@/lib/payer";
import { circleEnabled, createCreatorWallet } from "@/lib/circle";
import {
  adjustCreatorBalance,
  adjustUserBalance,
  getCreatorById,
  listChapters,
  recordCreatorWithdrawal,
  recordPayment,
  setCreatorCircleWallet,
  setFollowMode,
  updatePayment,
} from "@/lib/db";
import { bundlePrice } from "@/lib/pricing";
import { ESCROW_HOLD_MS, splitFee } from "@/lib/money";
import { getCreatorBalances } from "@/lib/treasury";
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
  status: "settled" | "failed";
  /** what the reader paid (gross) */
  grossUsd?: number;
  /** platform's 5% cut */
  feeUsd?: number;
  /** what the creator earned (net), held in 7-day escrow */
  netUsd?: number;
  reason?: string;
}

/**
 * Settle a single reader→creator amount (escrow-batched):
 *   1. split the gross 95/5,
 *   2. debit the reader's ledger by the gross,
 *   3. accrue the creator's net to escrow (clears in 7 days); the 5% fee stays
 *      in the treasury as platform revenue.
 * No on-chain call here — the real Arc settlement happens once, at withdrawal.
 * This is the core call Agent 1 (and the unlock flows) use.
 */
export async function settleSession(args: SettleSessionArgs): Promise<SettleResult> {
  const { userId, creator, chapterId, sessionId, amountUsd } = args;
  const { grossUsdc, feeUsdc, netUsdc } = splitFee(amountUsd);
  const withdrawableAt = new Date(Date.now() + ESCROW_HOLD_MS).toISOString();

  const payment = await recordPayment({
    sessionId,
    userId,
    creatorId: creator.id,
    chapterId,
    amountUsdc: grossUsdc,
    feeUsdc,
    netUsdc,
    withdrawableAt,
    status: "pending",
  });

  // 1. Debit the reader's ledger by the gross (throws on insufficient balance).
  try {
    await adjustUserBalance(userId, -grossUsdc, args.debitKind ?? "session_debit", payment.id);
  } catch (e) {
    await updatePayment(payment.id, { status: "failed" });
    return { paymentId: payment.id, status: "failed", reason: (e as Error).message };
  }

  // 2. Accrue the creator's net to escrow; the fee is retained in the treasury.
  await adjustCreatorBalance(creator.id, netUsdc);
  await updatePayment(payment.id, { status: "settled" });

  // Provision the creator's managed claim wallet lazily, on first earning.
  if (circleEnabled() && !creator.circle_wallet_id) {
    try {
      const w = await createCreatorWallet(creator.id);
      await setCreatorCircleWallet(creator.id, w.walletId, w.address);
    } catch (e) {
      console.warn("[charon] Circle wallet provision failed (ledger-only escrow):", (e as Error).message);
    }
  }

  return { paymentId: payment.id, status: "settled", grossUsd: grossUsdc, feeUsd: feeUsdc, netUsd: netUsdc };
}

/**
 * Mode 3 — unlock an entire (completed) series for a single discounted payment.
 * Settles the bundle to the creator, then marks the reader's follow as series_unlock
 * so per-session settlement is skipped while they binge.
 */
export async function unlockSeries(args: {
  userId: string;
  seriesId: string;
  creator: Creator;
}): Promise<{ ok: boolean; amount: number; reason?: string }> {
  const chapters = await listChapters(args.seriesId);
  if (!chapters.length) return { ok: false, amount: 0, reason: "no chapters to unlock" };
  const amount = bundlePrice(chapters);
  const refChapterId = chapters[0].id;

  const result = await settleSession({
    userId: args.userId,
    creator: args.creator,
    chapterId: refChapterId,
    amountUsd: amount,
    debitKind: "unlock_debit",
  });
  if (result.status === "failed") return { ok: false, amount, reason: result.reason };
  await setFollowMode(args.userId, args.seriesId, "series_unlock");
  return { ok: true, amount };
}

export interface WithdrawResult {
  ok: boolean;
  txHash?: string;
  /** net moved out of escrow */
  amount: number;
  available: number;
  reason?: string;
}

/**
 * Withdraw cleared escrow to a destination address on Arc. Only earnings past
 * their 7-day escrow window are withdrawable. Settles real USDC from the
 * treasury, then moves the amount from escrow into lifetime withdrawn.
 */
export async function withdrawForCreator(
  creator: Creator,
  amountUsd: number,
  destinationAddress: string,
): Promise<WithdrawResult> {
  const { available } = await getCreatorBalances(creator.id);
  if (amountUsd < MIN_SETTLE) return { ok: false, amount: 0, available, reason: "nothing to withdraw" };
  if (amountUsd > available + 1e-9) {
    return { ok: false, amount: 0, available, reason: "amount exceeds cleared balance" };
  }
  try {
    const txHash = await settleFromTreasury(destinationAddress, amountUsd);
    await recordCreatorWithdrawal(creator.id, amountUsd);
    const after = await getCreatorBalances(creator.id);
    return { ok: true, txHash, amount: amountUsd, available: after.available };
  } catch (e) {
    return { ok: false, amount: 0, available, reason: (e as Error).message };
  }
}

/** Re-fetch a creator (used after escrow changes). */
export async function refreshCreator(creatorId: string): Promise<Creator | null> {
  return getCreatorById(creatorId);
}
