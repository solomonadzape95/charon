/**
 * Agent 1 — Reading Intelligence.
 *
 * Fires after every reading session. Looks at real engagement signals (time vs
 * expected read time, completion, scroll-backs/re-reads, binge depth, series
 * loyalty) and reasons a fair settlement amount for the session — then the
 * caller settles it to the creator on Arc.
 *
 * The model produces an engagement score, a value multiplier, and ONE sentence
 * of reasoning shown to the reader. All money math (reader modifiers, clamping
 * to floor / session cap / balance) is deterministic in code — see lib/pricing.
 */
import { callModel, extractJson, clamp, num, str, agentEnabled } from "@/lib/agents/shared";
import {
  applyReaderModifiers,
  estimatedReadMinutes,
  cents,
  ABS_FLOOR,
  type ReaderModifiers,
} from "@/lib/pricing";

export interface SessionSignals {
  timeSpentSeconds: number;
  completionRate: number; // 0..1
  scrollBackCount: number;
  bingeDepth: number; // nth chapter this sitting
  readerComment?: string | null;
  isReread: boolean;
}

export interface ChapterContext {
  title: string;
  wordCount: number;
  currentPrice: number;
  floorPrice: number;
}

export interface ReadingValuation {
  amountUsd: number;
  engagementScore: number; // 0..100
  valueMultiplier: number; // 0.4..1.6
  reasoning: string;
  loyaltyDiscount: number;
  bingeDiscount: number;
}

const SYSTEM = `You are Charon's Reading Intelligence agent. A reader just finished a reading session.
Judge how deeply they engaged and how much the session was worth, then reply with ONLY a JSON object (no prose, no fences):

{
  "engagement_score": number,   // 0-100. Deep, attentive, re-reading = high. Quick skim / early drop-off = low.
  "value_multiplier": number,   // 0.4-1.6. How much of the chapter's list price this session is worth.
                                //   ~0.4-0.7 quick skim or partial read
                                //   ~0.8-1.0 a normal full read
                                //   ~1.1-1.6 deep read, re-reads, strong comment, deep in a binge
  "reasoning": string           // ONE warm, human sentence the reader sees. Mention concrete behavior
                                // (re-read a scene, binged N chapters, finished it, loyal reader). No jargon.
}

Weigh: time spent vs expected read time, completion rate, scroll-backs (re-reading is strong positive engagement),
binge depth, and any reader comment (weight comments heavily — "this chapter broke me" pushes value up).`;

/**
 * Reason a fair settlement amount for a finished session.
 * @param sessionCap hard ceiling for one session (reader's session_cap_usd)
 * @param balance    reader's current balance (final amount is clamped to it)
 */
export async function valueSession(
  signals: SessionSignals,
  chapter: ChapterContext,
  modifiers: ReaderModifiers,
  sessionCap: number,
  balance: number,
): Promise<ReadingValuation> {
  const expectedMin = estimatedReadMinutes(chapter.wordCount);
  const actualMin = signals.timeSpentSeconds / 60;

  // Reader-specific list price (loyalty / binge / discovery discounts applied).
  const rm = applyReaderModifiers(chapter.currentPrice, modifiers, chapter.floorPrice);

  let engagementScore: number;
  let multiplier: number;
  let reasoning: string;

  if (agentEnabled()) {
    try {
      const user = [
        `Chapter: "${chapter.title}" (${chapter.wordCount} words, ~${expectedMin} min expected read)`,
        `Time spent: ${actualMin.toFixed(1)} min`,
        `Completion: ${(signals.completionRate * 100).toFixed(0)}%`,
        `Scroll-backs (re-reads of sections): ${signals.scrollBackCount}`,
        `Binge depth: chapter ${signals.bingeDepth} of this sitting`,
        `Re-reading this chapter: ${signals.isReread ? "yes" : "no"}`,
        `Reader loyalty: ${modifiers.loyaltyTier} (${modifiers.chaptersReadInSeries} chapters into this series)`,
        signals.readerComment ? `Reader comment: "${signals.readerComment}"` : "",
        `Chapter list price for this reader: $${rm.readerPrice.toFixed(2)}`,
      ]
        .filter(Boolean)
        .join("\n");
      const raw = await callModel(SYSTEM, user);
      const parsed = extractJson(raw);
      if (!parsed) throw new Error("no parseable decision");
      engagementScore = clamp(num(parsed.engagement_score), 0, 100);
      multiplier = clamp(num(parsed.value_multiplier, 1), 0.4, 1.6);
      reasoning = str(parsed.reasoning) || fallbackReasoning(signals, modifiers, rm.label);
    } catch {
      ({ engagementScore, multiplier, reasoning } = heuristic(signals, chapter, expectedMin, rm.label, modifiers));
    }
  } else {
    ({ engagementScore, multiplier, reasoning } = heuristic(signals, chapter, expectedMin, rm.label, modifiers));
  }

  // Final amount: reader list price × engagement multiplier, clamped to floor,
  // session cap, and the reader's available balance.
  let amount = cents(rm.readerPrice * multiplier);
  amount = Math.max(amount, ABS_FLOOR);
  amount = Math.min(amount, sessionCap, Math.max(0, balance));
  amount = cents(amount);

  return {
    amountUsd: amount,
    engagementScore,
    valueMultiplier: multiplier,
    reasoning,
    loyaltyDiscount: rm.loyaltyDiscount,
    bingeDiscount: rm.bingeDiscount,
  };
}

/** Deterministic engagement estimate when the model is unavailable. */
function heuristic(
  signals: SessionSignals,
  chapter: ChapterContext,
  expectedMin: number,
  priceLabel: string,
  modifiers: ReaderModifiers,
): { engagementScore: number; multiplier: number; reasoning: string } {
  const actualMin = signals.timeSpentSeconds / 60;
  const timeRatio = clamp(actualMin / Math.max(0.5, expectedMin), 0, 2);
  // Completion (40%), time-on-page (35%), re-reading (25%).
  const rereadSignal = clamp(signals.scrollBackCount / 4, 0, 1);
  const score = clamp(
    signals.completionRate * 40 + clamp(timeRatio, 0, 1) * 35 + rereadSignal * 25,
    0,
    100,
  );
  const multiplier = clamp(0.5 + score / 100, 0.4, 1.6);
  return {
    engagementScore: Math.round(score),
    multiplier,
    reasoning: fallbackReasoning(signals, modifiers, priceLabel),
  };
}

function fallbackReasoning(signals: SessionSignals, modifiers: ReaderModifiers, priceLabel: string): string {
  const bits: string[] = [];
  if (signals.completionRate >= 0.95) bits.push("you finished the chapter");
  else if (signals.completionRate >= 0.5) bits.push(`you read ${Math.round(signals.completionRate * 100)}% of it`);
  else bits.push("you started this chapter");
  if (signals.scrollBackCount >= 2) bits.push(`re-read sections ${signals.scrollBackCount} times`);
  if (signals.bingeDepth >= 4) bits.push(`${signals.bingeDepth} chapters deep in one sitting`);
  if (modifiers.loyaltyTier === "loyal" || modifiers.loyaltyTier === "devotee") bits.push("a loyal reader");
  const tail = priceLabel !== "standard" ? ` (${priceLabel})` : "";
  return `You ${bits.join(", ")}.${tail}`.replace(", a loyal reader", " — a loyal reader");
}
