/**
 * Agent 3 — Dynamic Repricing.
 *
 * Runs continuously (hourly cron). Revisits each chapter's current price from
 * live signals — demand, time decay, series momentum, and chapter-quality
 * signals (completion, re-reads). The model proposes a target price + reasoning;
 * code enforces the floor, genre ceiling, and the ±20% daily change cap
 * (lib/pricing.clampPriceChange). Reader-specific modifiers are applied
 * separately at read time (applyReaderModifiers).
 */
import { callModel, extractJson, clamp, num, str, agentEnabled } from "@/lib/agents/shared";
import { clampPriceChange, ABS_FLOOR } from "@/lib/pricing";

export interface ChapterSignals {
  currentPrice: number;
  basePrice: number;
  floorPrice: number;
  genre?: string | null;
  ageDays: number;
  readVolume24h: number;
  completionRate: number; // 0..1
  rereadRate: number; // 0..1
  seriesMomentum: number;
}

export interface RepriceResult {
  newPrice: number;
  changed: boolean;
  reason: string;
  signals: Record<string, unknown>;
}

const SYSTEM = `You are Charon's Dynamic Repricing agent. Given live signals for ONE chapter,
propose its new price in USDC. Reply with ONLY a JSON object (no prose, no fences):

{
  "target_price_usdc": number,  // your ideal price before daily-change limits
  "reasoning": string           // ONE short sentence on what's driving the move
}

Direction guide:
  high reads last 24h ............ nudge up (small)
  just released (age < 2 days) ... small release premium
  older than 30 days ............. decay gradually toward the floor
  high completion rate .......... up (small)
  high re-read rate ............. up (moderate) — readers re-reading = valuable
  low completion rate ........... down (small)
  series momentum high/low ...... up / down (moderate)
Keep moves gentle. The platform caps any single change at ±20%/day regardless.`;

export async function repriceChapter(s: ChapterSignals): Promise<RepriceResult> {
  const signals = {
    age_days: Math.round(s.ageDays),
    read_volume_24h: s.readVolume24h,
    completion_rate: round2(s.completionRate),
    reread_rate: round2(s.rereadRate),
    series_momentum: s.seriesMomentum,
    current_price: s.currentPrice,
  };

  let target: number;
  let reason: string;

  if (agentEnabled()) {
    try {
      const user = [
        `Current price: $${s.currentPrice.toFixed(2)} (base $${s.basePrice.toFixed(2)}, floor $${s.floorPrice.toFixed(2)})`,
        `Genre: ${s.genre ?? "unspecified"}`,
        `Age: ${Math.round(s.ageDays)} days`,
        `Reads in last 24h: ${s.readVolume24h}`,
        `Completion rate: ${(s.completionRate * 100).toFixed(0)}%`,
        `Re-read rate: ${(s.rereadRate * 100).toFixed(0)}%`,
        `Series momentum score: ${s.seriesMomentum}`,
      ].join("\n");
      const raw = await callModel(SYSTEM, user);
      const parsed = extractJson(raw);
      if (!parsed) throw new Error("no parseable decision");
      target = clamp(num(parsed.target_price_usdc, s.currentPrice), ABS_FLOOR, 100);
      reason = str(parsed.reasoning) || deterministicReason(s);
    } catch {
      ({ target, reason } = deterministic(s));
    }
  } else {
    ({ target, reason } = deterministic(s));
  }

  const newPrice = clampPriceChange(target, s.currentPrice, s.floorPrice, s.genre);
  return {
    newPrice,
    changed: Math.abs(newPrice - s.currentPrice) >= 0.01,
    reason,
    signals,
  };
}

/** Deterministic target from a weighted sum of signal nudges. */
function deterministic(s: ChapterSignals): { target: number; reason: string } {
  let mult = 1;
  if (s.ageDays < 2) mult += 0.1; // release premium
  if (s.ageDays > 30) mult -= 0.15; // decay
  if (s.readVolume24h >= 5) mult += 0.08;
  if (s.completionRate >= 0.8) mult += 0.05;
  if (s.completionRate > 0 && s.completionRate < 0.4) mult -= 0.05;
  if (s.rereadRate >= 0.3) mult += 0.1;
  if (s.seriesMomentum >= 10) mult += 0.08;
  const target = Math.max(ABS_FLOOR, s.currentPrice * mult);
  return { target, reason: deterministicReason(s) };
}

function deterministicReason(s: ChapterSignals): string {
  if (s.rereadRate >= 0.3) return "Readers are re-reading this chapter — value nudged up.";
  if (s.readVolume24h >= 5) return "Trending this week — gentle demand-driven increase.";
  if (s.ageDays > 30) return "Aging chapter — price easing toward the floor.";
  if (s.ageDays < 2) return "Fresh release — small early-reader premium.";
  if (s.completionRate > 0 && s.completionRate < 0.4) return "Lower completion — price eased to attract readers.";
  return "Stable demand — price held.";
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
