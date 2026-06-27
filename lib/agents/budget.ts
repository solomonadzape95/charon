/**
 * Agent 4 — Budget Allocation.
 *
 * Watches a reader's balance and reading patterns across the series they follow.
 * Detects low balance before a heavy session, suggests a top-up calibrated to
 * their pace, and flags series where pre-release mode would suit them.
 *
 * Core metrics are deterministic; the model writes the human-facing nudges.
 */
import { callModel, extractJson, clamp, num, str, agentEnabled } from "@/lib/agents/shared";

export interface ReadingPattern {
  avgChaptersPerWeek: number;
  avgSpendPerChapter: number;
  estimatedWeeklySpend: number;
  daysRemainingAtPace: number;
}

export interface ModeSwitchSuggestion {
  seriesId: string;
  seriesTitle: string;
  reasoning: string;
}

export interface BudgetAdvice {
  pattern: ReadingPattern;
  lowBalance: boolean;
  suggestedTopup: number;
  topupMessage: string;
  modeSwitches: ModeSwitchSuggestion[];
}

export interface SessionLite {
  created_at: string;
  amount: number;
}
export interface SeriesReadStat {
  seriesId: string;
  seriesTitle: string;
  reads: number;
  fastReadsAfterRelease: number; // chapters opened within ~1h of release
  mode: string;
}

/** Compute reading pace + spend from recent sessions. */
export function readingPattern(sessions: SessionLite[], balance: number, now: number): ReadingPattern {
  const settled = sessions.filter((s) => s.amount > 0);
  const span = settled.length
    ? Math.max(1, (now - new Date(settled[settled.length - 1].created_at).getTime()) / 86_400_000)
    : 7;
  const weeks = Math.max(1 / 7, span / 7);
  const avgChaptersPerWeek = settled.length / weeks;
  const totalSpend = settled.reduce((s, x) => s + x.amount, 0);
  const avgSpendPerChapter = settled.length ? totalSpend / settled.length : 0.04;
  const estimatedWeeklySpend = avgChaptersPerWeek * avgSpendPerChapter;
  const daysRemainingAtPace = estimatedWeeklySpend > 0 ? (balance / estimatedWeeklySpend) * 7 : Infinity;
  return {
    avgChaptersPerWeek: round1(avgChaptersPerWeek),
    avgSpendPerChapter: round2(avgSpendPerChapter),
    estimatedWeeklySpend: round2(estimatedWeeklySpend),
    daysRemainingAtPace: Number.isFinite(daysRemainingAtPace) ? Math.round(daysRemainingAtPace) : 999,
  };
}

const SYSTEM = `You are Charon's Budget Allocation agent. You help a reader keep enough balance to read
without friction and spot when a different reading mode would serve them. Reply with ONLY JSON (no fences):

{
  "suggested_topup_usdc": number,   // a round, friendly amount that lasts ~2 weeks at their pace
  "topup_message": string,          // ONE short sentence, warm, concrete ("$3 lasts about 2 weeks at your pace")
  "mode_switch_reasonings": { "seriesId": string, "reasoning": string }[]  // only for genuinely good candidates
}`;

export async function adviseBudget(args: {
  balance: number;
  pattern: ReadingPattern;
  seriesStats: SeriesReadStat[];
}): Promise<Pick<BudgetAdvice, "lowBalance" | "suggestedTopup" | "topupMessage" | "modeSwitches">> {
  const { balance, pattern } = args;
  const lowBalance = pattern.daysRemainingAtPace < 3;

  // Pre-release candidates: reads most new chapters fast, not already pre_release.
  const candidates = args.seriesStats.filter(
    (s) => s.mode !== "pre_release" && s.reads >= 3 && s.fastReadsAfterRelease / Math.max(1, s.reads) >= 0.6,
  );

  // Deterministic defaults.
  let suggestedTopup = roundUpFriendly(Math.max(3, pattern.estimatedWeeklySpend * 2));
  let topupMessage = `$${suggestedTopup.toFixed(2)} lasts about 2 weeks at your current pace.`;
  let modeSwitches: ModeSwitchSuggestion[] = candidates.map((c) => ({
    seriesId: c.seriesId,
    seriesTitle: c.seriesTitle,
    reasoning: `You read new ${c.seriesTitle} chapters right after they drop — pre-release mode unlocks them instantly.`,
  }));

  if (agentEnabled() && (lowBalance || candidates.length)) {
    try {
      const user = [
        `Balance: $${balance.toFixed(2)}`,
        `Avg chapters/week: ${pattern.avgChaptersPerWeek}`,
        `Avg spend/chapter: $${pattern.avgSpendPerChapter.toFixed(2)}`,
        `Estimated weekly spend: $${pattern.estimatedWeeklySpend.toFixed(2)}`,
        `Days of reading left at this pace: ${pattern.daysRemainingAtPace}`,
        `Pre-release candidate series: ${
          candidates.map((c) => `${c.seriesTitle} (${c.seriesId})`).join(", ") || "none"
        }`,
      ].join("\n");
      const raw = await callModel(SYSTEM, user);
      const parsed = extractJson<{
        suggested_topup_usdc: number;
        topup_message: string;
        mode_switch_reasonings: { seriesId: string; reasoning: string }[];
      }>(raw);
      if (parsed) {
        suggestedTopup = roundUpFriendly(clamp(num(parsed.suggested_topup_usdc, suggestedTopup), 1, 100));
        topupMessage = str(parsed.topup_message) || topupMessage;
        if (Array.isArray(parsed.mode_switch_reasonings)) {
          const byId = new Map(candidates.map((c) => [c.seriesId, c.seriesTitle]));
          modeSwitches = parsed.mode_switch_reasonings
            .filter((m) => byId.has(m.seriesId))
            .map((m) => ({ seriesId: m.seriesId, seriesTitle: byId.get(m.seriesId)!, reasoning: str(m.reasoning) }));
        }
      }
    } catch {
      /* keep deterministic defaults */
    }
  }

  return { lowBalance, suggestedTopup, topupMessage, modeSwitches };
}

function round1(n: number) {
  return Math.round(n * 10) / 10;
}
function round2(n: number) {
  return Math.round(n * 100) / 100;
}
function roundUpFriendly(n: number): number {
  if (n <= 3) return 3;
  if (n <= 5) return 5;
  if (n <= 10) return 10;
  return Math.ceil(n / 5) * 5;
}
