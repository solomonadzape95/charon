/**
 * Money core — integer micro-USDC arithmetic.
 *
 * USDC settles with 6 decimals on Arc, so $0.0015 (5% of a $0.03 chapter) is a
 * real, representable amount — but only if we stop rounding money to whole cents.
 * Everything money-shaped flows through here: we compute in integer micro-USDC
 * (1 USDC = 1_000_000 µ) so a fee never silently rounds away, and convert back to
 * a 6-dp decimal only when writing the Postgres `numeric` columns.
 */

export const MICROS_PER_USDC = 1_000_000;

/** Platform settlement fee, in basis points. 500 bps = 5% (the doc's primary revenue stream). */
export const PLATFORM_FEE_BPS = 500;

/** Rolling escrow hold before a creator's earnings become withdrawable (7 days). */
export const ESCROW_HOLD_MS = 7 * 86_400_000;

/** USD decimal → integer micro-USDC (nearest µ). */
export function toMicros(usd: number): number {
  return Math.round((Number(usd) || 0) * MICROS_PER_USDC);
}

/** Integer micro-USDC → USD decimal (exact multiple of 1e-6). */
export function fromMicros(micros: number): number {
  return micros / MICROS_PER_USDC;
}

/** Snap a USD amount to the rail's 6-dp resolution. Use before persisting money. */
export function roundUsdc(usd: number): number {
  return fromMicros(toMicros(usd));
}

export interface FeeSplit {
  /** what the reader pays (unchanged by the fee — deducted from the creator's share) */
  grossUsdc: number;
  /** platform's cut */
  feeUsdc: number;
  /** what the creator actually earns */
  netUsdc: number;
}

/**
 * Split a gross reader payment into the creator's net and the platform fee.
 * Computed on integers so net + fee === gross exactly, with no sub-cent loss.
 */
export function splitFee(grossUsd: number, bps = PLATFORM_FEE_BPS): FeeSplit {
  const grossMicros = toMicros(grossUsd);
  const feeMicros = Math.round((grossMicros * bps) / 10_000);
  const netMicros = grossMicros - feeMicros;
  return {
    grossUsdc: fromMicros(grossMicros),
    feeUsdc: fromMicros(feeMicros),
    netUsdc: fromMicros(netMicros),
  };
}

/** Format a USD amount for display (2-dp by default; pass 6 to show the full rail precision). */
export function formatUsdc(usd: number, dp = 2): string {
  return (Number(usd) || 0).toFixed(dp);
}
