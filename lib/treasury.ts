/**
 * Treasury & escrow accounting — the read side of the money model.
 *
 * Reader balances are a ledger over a single pooled Arc treasury. Creator
 * earnings accrue as net escrow (95% of gross) and clear 7 days after they're
 * earned. This module computes a creator's available/pending split and runs the
 * solvency invariant that protects the pool from drift:
 *
 *   total_deposits == reader_float + creator_unpaid + platform_revenue + total_withdrawn
 *
 * Verified across all four flows (deposit, settle, withdraw, refund): every
 * dollar that came in is either still held (reader float, creator escrow,
 * platform revenue) or has left (withdrawn). A non-zero residual means a bug.
 */
import { roundUsdc } from "@/lib/money";
import { supabaseService } from "@/lib/supabase";

export interface CreatorBalances {
  /** cleared escrow, withdrawable now */
  available: number;
  /** still inside the 7-day escrow window */
  pending: number;
  /** available + pending (matches creators.balance_usd cache) */
  total: number;
  /** lifetime net earned */
  lifetime: number;
}

/**
 * Split a creator's unwithdrawn escrow into available (cleared) vs pending,
 * derived from settled payments minus what's already been withdrawn.
 */
export async function getCreatorBalances(creatorId: string): Promise<CreatorBalances> {
  const db = supabaseService();
  const [{ data: creator }, { data: rows }] = await Promise.all([
    db.from("creators").select("total_earned_usdc, total_withdrawn_usdc").eq("id", creatorId).maybeSingle(),
    db
      .from("payments")
      .select("net_usdc, withdrawable_at")
      .eq("creator_id", creatorId)
      .eq("status", "settled"),
  ]);

  const now = Date.now();
  let clearedNet = 0;
  let pendingNet = 0;
  for (const r of (rows ?? []) as { net_usdc: number | null; withdrawable_at: string | null }[]) {
    const net = Number(r.net_usdc ?? 0);
    const clearsAt = r.withdrawable_at ? new Date(r.withdrawable_at).getTime() : 0;
    if (clearsAt <= now) clearedNet += net;
    else pendingNet += net;
  }

  const withdrawn = Number((creator as { total_withdrawn_usdc?: number } | null)?.total_withdrawn_usdc ?? 0);
  const lifetime = Number((creator as { total_earned_usdc?: number } | null)?.total_earned_usdc ?? 0);
  // Withdrawals draw from cleared escrow first, so they only reduce `available`.
  const available = Math.max(0, roundUsdc(clearedNet - withdrawn));
  const pending = roundUsdc(pendingNet);
  return { available, pending, total: roundUsdc(available + pending), lifetime: roundUsdc(lifetime) };
}

export interface Reconciliation {
  totalDeposits: number;
  readerFloat: number;
  creatorUnpaid: number;
  platformRevenue: number;
  totalWithdrawn: number;
  /** totalDeposits − (readerFloat + creatorUnpaid + platformRevenue + totalWithdrawn); ~0 when solvent */
  residual: number;
  balanced: boolean;
}

/** Run the treasury solvency invariant across the whole ledger. */
export async function reconcile(): Promise<Reconciliation> {
  const db = supabaseService();
  const [users, creators, settledPays, deposits] = await Promise.all([
    db.from("users").select("balance_usd").limit(100000),
    db.from("creators").select("balance_usd, total_withdrawn_usdc").limit(100000),
    db.from("payments").select("fee_usdc").eq("status", "settled").limit(100000),
    db.from("ledger").select("amount_usd").eq("kind", "deposit").limit(100000),
  ]);

  const sum = <T>(rows: T[] | null, pick: (r: T) => number) => (rows ?? []).reduce((s, r) => s + pick(r), 0);

  const readerFloat = sum(users.data as { balance_usd: number }[], (r) => Number(r.balance_usd));
  const creatorUnpaid = sum(creators.data as { balance_usd: number }[], (r) => Number(r.balance_usd));
  const totalWithdrawn = sum(creators.data as { total_withdrawn_usdc: number }[], (r) => Number(r.total_withdrawn_usdc));
  const platformRevenue = sum(settledPays.data as { fee_usdc: number }[], (r) => Number(r.fee_usdc));
  const totalDeposits = sum(deposits.data as { amount_usd: number }[], (r) => Number(r.amount_usd));

  const residual = roundUsdc(totalDeposits - (readerFloat + creatorUnpaid + platformRevenue + totalWithdrawn));
  return {
    totalDeposits: roundUsdc(totalDeposits),
    readerFloat: roundUsdc(readerFloat),
    creatorUnpaid: roundUsdc(creatorUnpaid),
    platformRevenue: roundUsdc(platformRevenue),
    totalWithdrawn: roundUsdc(totalWithdrawn),
    residual,
    balanced: Math.abs(residual) < 0.000001,
  };
}
