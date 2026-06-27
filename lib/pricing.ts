/**
 * Deterministic pricing math. The agents choose direction + magnitude within
 * these bounds and produce reasoning; this module enforces the hard invariants
 * (floor, 20% daily cap) and computes reader-specific modifiers. Pure, testable.
 */
import type { Chapter, LoyaltyTier } from "@/lib/supabase";

export const ABS_FLOOR = 0.01; // a chapter can never settle below $0.01
export const DAILY_CAP = 0.2; // Agent 3 may move a price ≤20% per 24h
export const WORDS_PER_MINUTE = 250;

// Per-genre base-price benchmarks (USDC per chapter) and ceiling.
export interface GenreBenchmark {
  floor: number;
  base: number;
  ceiling: number;
}
const GENRE_BENCHMARKS: Record<string, GenreBenchmark> = {
  fantasy: { floor: 0.01, base: 0.04, ceiling: 0.25 },
  litrpg: { floor: 0.01, base: 0.05, ceiling: 0.3 },
  romance: { floor: 0.01, base: 0.03, ceiling: 0.2 },
  scifi: { floor: 0.01, base: 0.04, ceiling: 0.25 },
  manga: { floor: 0.01, base: 0.05, ceiling: 0.3 },
  manhwa: { floor: 0.01, base: 0.06, ceiling: 0.35 },
  action: { floor: 0.01, base: 0.04, ceiling: 0.25 },
  mystery: { floor: 0.01, base: 0.04, ceiling: 0.25 },
  horror: { floor: 0.01, base: 0.04, ceiling: 0.25 },
  default: { floor: 0.01, base: 0.03, ceiling: 0.2 },
};

export function genreBenchmark(genre?: string | null): GenreBenchmark {
  const key = (genre ?? "").toLowerCase().replace(/[^a-z]/g, "");
  return GENRE_BENCHMARKS[key] ?? GENRE_BENCHMARKS.default;
}

export function estimatedReadMinutes(wordCount: number): number {
  return Math.max(1, Math.round(wordCount / WORDS_PER_MINUTE));
}

/** Round to whole cents (smallest unit the rail settles). */
export function cents(usd: number): number {
  return Math.round(usd * 100) / 100;
}

/**
 * Word-count → floor price. Longer chapters carry a marginally higher floor,
 * but never below the absolute floor.
 */
export function floorFor(wordCount: number, genre?: string | null): number {
  const bench = genreBenchmark(genre);
  const byLength = 0.01 + Math.min(0.04, (wordCount / 1000) * 0.005);
  return Math.max(ABS_FLOOR, bench.floor, cents(byLength));
}

/**
 * Clamp a proposed new price so it respects the floor, the genre ceiling, and
 * the ±20% daily change cap relative to the current price.
 */
export function clampPriceChange(
  proposed: number,
  current: number,
  floor: number,
  genre?: string | null,
): number {
  const ceiling = genreBenchmark(genre).ceiling;
  const maxUp = current * (1 + DAILY_CAP);
  const maxDown = current * (1 - DAILY_CAP);
  let p = proposed;
  if (p > maxUp) p = maxUp;
  if (p < maxDown) p = maxDown;
  p = Math.min(p, ceiling);
  p = Math.max(p, floor, ABS_FLOOR);
  return cents(p);
}

export interface ReaderModifiers {
  loyaltyTier: LoyaltyTier;
  bingeDepth: number; // nth chapter this sitting (1-based)
  chaptersReadInSeries: number; // prior chapters read in this series
}

export interface ReaderPrice {
  readerPrice: number;
  loyaltyDiscount: number; // absolute USDC discount applied
  bingeDiscount: number;
  discoveryDiscount: number;
  label: string; // short reason for the price badge
}

const LOYALTY_DISCOUNT_PCT: Record<LoyaltyTier, number> = {
  new: 0,
  reader: 0.05,
  loyal: 0.1,
  devotee: 0.15,
};

/**
 * Apply reader-specific modifiers to a chapter's current price.
 *  - loyalty: tiered % discount
 *  - binge: −3% per chapter beyond the 3rd in one sitting (capped at −15%)
 *  - discovery: −30% on a new reader's first 3 chapters of a series
 */
export function applyReaderModifiers(currentPrice: number, m: ReaderModifiers, floor: number): ReaderPrice {
  let price = currentPrice;
  const loyaltyPct = LOYALTY_DISCOUNT_PCT[m.loyaltyTier] ?? 0;
  const loyaltyDiscount = price * loyaltyPct;
  price -= loyaltyDiscount;

  const bingePct = m.bingeDepth > 3 ? Math.min(0.15, (m.bingeDepth - 3) * 0.03) : 0;
  const bingeDiscount = currentPrice * bingePct;
  price -= bingeDiscount;

  const discoveryPct = m.chaptersReadInSeries < 3 ? 0.3 : 0;
  const discoveryDiscount = currentPrice * discoveryPct;
  price -= discoveryDiscount;

  price = Math.max(price, floor, ABS_FLOOR);

  let label = "standard";
  if (discoveryPct) label = "discovery discount";
  else if (bingePct && loyaltyPct) label = "loyalty + binge discount";
  else if (bingePct) label = "binge discount";
  else if (loyaltyPct) label = "loyalty discount";

  return {
    readerPrice: cents(price),
    loyaltyDiscount: cents(loyaltyDiscount),
    bingeDiscount: cents(bingeDiscount),
    discoveryDiscount: cents(discoveryDiscount),
    label,
  };
}

/** Bundle price for a completed-series unlock: total current prices, 30% off. */
export function bundlePrice(chapters: Pick<Chapter, "current_price_usdc">[]): number {
  const total = chapters.reduce((s, c) => s + Number(c.current_price_usdc), 0);
  return Math.max(ABS_FLOOR, cents(total * 0.7));
}

export function ageDays(publicReleaseAt: string, now: number): number {
  return Math.max(0, (now - new Date(publicReleaseAt).getTime()) / 86_400_000);
}
