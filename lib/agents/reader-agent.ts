/**
 * The Autonomous Reader Agent.
 *
 * Holds a learned taste profile + a weekly budget, and on each run it discovers,
 * evaluates, and PAYS for chapters on the reader's behalf — autonomously, within
 * budget, via the same Arc/x402 settlement rail human reads use (tagged
 * caller_type = 'agent', settled at a 7% fee that funds the agent itself).
 *
 * Every model call has a deterministic fallback so the loop always completes.
 */
import { callModel, extractJson, agentEnabled } from "@/lib/agents/shared";
import {
  addAgentMessage,
  getAgentConfig,
  getChapterById,
  getCreatorById,
  getUserById,
  listAgentMessages,
  listSeries,
  setFollowMode,
  unpaidChaptersForUser,
  updateAgentConfig,
} from "@/lib/db";
import { settleSession, unlockSeries, MIN_SETTLE } from "@/lib/payments";
import type { Series, TasteProfile } from "@/lib/supabase";

const WEEK_MS = 7 * 86_400_000;
const AGENT_FEE_BPS = 700; // 7% — the agent pays for itself
const MAX_CHAPTERS_PER_RUN = 5;

/** Build a structured taste profile from the reader's loved series + avoids. */
export async function buildTasteProfile(loved: string[], avoids: string[]): Promise<TasteProfile> {
  const fallback: TasteProfile = {
    loved_series: loved,
    summary: loved.length ? `Enjoys stories like ${loved.slice(0, 3).join(", ")}.` : "Open to a range of serialized fiction.",
    genre_affinities: [],
    hard_avoids: avoids,
  };
  if (!agentEnabled()) return fallback;
  try {
    const out = await callModel(
      `You build reading taste profiles for a webnovel platform. Return ONLY JSON:
{ "summary": string (2 sentences on what they like — pacing, emotional weight, power fantasy, stakes),
  "genre_affinities": string[] (lowercase genre tags like "litrpg","progression","romance","cultivation"),
  "pacing": "slow-burn" | "fast" | "episodic",
  "emotional_weight": "heavy" | "light" | "balanced" }`,
      `Loved series: ${loved.join(", ") || "(none given)"}\nWants to avoid: ${avoids.join(", ") || "(nothing specified)"}`,
    );
    const j = extractJson<Partial<TasteProfile>>(out);
    if (j) {
      return {
        loved_series: loved,
        summary: j.summary || fallback.summary,
        genre_affinities: Array.isArray(j.genre_affinities) ? j.genre_affinities.map((g) => String(g).toLowerCase()) : [],
        hard_avoids: avoids,
        pacing: j.pacing,
        emotional_weight: j.emotional_weight,
      };
    }
  } catch {
    /* fall through */
  }
  return fallback;
}

function genresOf(s: Series): string[] {
  return (s.genre ?? "").split(",").map((g) => g.trim().toLowerCase()).filter(Boolean);
}

interface RunResult {
  ran: boolean;
  reason?: string;
  spent: number;
  chaptersRead: number;
  remaining: number;
}

/** One agent run: discover → evaluate → pay within budget. Idempotent-ish per call. */
export async function runAgent(userId: string): Promise<RunResult> {
  const config = await getAgentConfig(userId);
  if (!config) return { ran: false, reason: "no agent configured", spent: 0, chaptersRead: 0, remaining: 0 };
  if (config.paused) return { ran: false, reason: "paused", spent: 0, chaptersRead: 0, remaining: 0 };

  // Weekly reset.
  let weeklySpent = Number(config.weekly_spent_usdc);
  const limit = Number(config.weekly_limit_usdc);
  if (Date.now() - new Date(config.week_start).getTime() > WEEK_MS) {
    weeklySpent = 0;
    await updateAgentConfig(userId, { weekly_spent_usdc: 0, week_start: new Date().toISOString() });
  }
  let remaining = Math.max(0, limit - weeklySpent);

  const user = await getUserById(userId);
  if (!user) return { ran: false, reason: "user missing", spent: 0, chaptersRead: 0, remaining };
  let balance = Number(user.balance_usd);

  if (remaining < MIN_SETTLE) {
    await addAgentMessage({ userId, sender: "agent", kind: "budget", content: `That's your $${limit.toFixed(2)} for this week. Budget resets next week — I'll pick back up then.` });
    return { ran: true, reason: "budget exhausted", spent: 0, chaptersRead: 0, remaining };
  }
  if (balance < MIN_SETTLE) {
    await addAgentMessage({ userId, sender: "agent", kind: "budget", content: `Your reading balance is empty, so I've paused. Top up and I'll keep going.` });
    return { ran: true, reason: "balance empty", spent: 0, chaptersRead: 0, remaining };
  }

  const taste = config.taste_profile;
  const affinities = new Set((taste?.genre_affinities ?? []).map((g) => g.toLowerCase()));
  const avoids = (taste?.hard_avoids ?? []).map((a) => a.toLowerCase());

  // Candidate pool: matching genres first, ranked by quality/momentum.
  const all = await listSeries(60);
  const ranked = all
    .map((s) => ({ s, match: genresOf(s).some((g) => affinities.has(g)) }))
    .sort((a, b) => (Number(b.match) - Number(a.match)) || (Number(b.s.momentum_score) - Number(a.s.momentum_score)));

  // Find a series with unread chapters the agent can commit to (try up to 4 candidates).
  let spent = 0;
  let chaptersRead = 0;
  for (const { s: series } of ranked.slice(0, 8)) {
    if (remaining < MIN_SETTLE || balance < MIN_SETTLE) break;
    const unpaid = await unpaidChaptersForUser(userId, series.id);
    if (!unpaid.length) continue;

    const creator = await getCreatorById(series.creator_id);
    if (!creator) continue;

    // Hard-avoid gate — never pay for an avoided series.
    const tags = genresOf(series);
    if (avoids.some((a) => tags.includes(a))) {
      await addAgentMessage({ userId, sender: "agent", kind: "decision", content: `Skipped “${series.title}” — it hits one of your hard avoids.`, seriesId: series.id });
      continue;
    }

    const decision = await evaluateSeries(taste, series, unpaid[0].id);
    if (decision.decision === "STOP") {
      await addAgentMessage({ userId, sender: "agent", kind: "decision", content: `Passed on “${series.title}” — ${decision.reason}`, seriesId: series.id });
      continue;
    }

    await addAgentMessage({
      userId,
      sender: "agent",
      kind: "discovery",
      content: `Starting “${series.title}” — ${decision.reason}`,
      seriesId: series.id,
    });

    // A confirmed match goes straight into the reader's library.
    const committing = decision.decision === "CONTINUE";
    if (committing) {
      try {
        await setFollowMode(userId, series.id, "standard");
      } catch {
        /* non-blocking */
      }
    }

    // Series Pass vs. chapter-by-chapter: if the pass is genuinely cheaper than
    // buying the chapters left AND it fits the budget, buy it — the reader then
    // owns the whole series and never pays for it again.
    const passPrice = series.series_pass_price_usdc != null ? Number(series.series_pass_price_usdc) : null;
    const remainingCost = unpaid.reduce((s, c) => s + Number(c.current_price_usdc), 0);
    if (
      committing &&
      passPrice != null &&
      passPrice > 0 &&
      unpaid.length >= 4 &&
      passPrice < remainingCost &&
      passPrice <= remaining + 1e-9 &&
      passPrice <= balance + 1e-9
    ) {
      const res = await unlockSeries({ userId, seriesId: series.id, creator, passPrice, feeBps: AGENT_FEE_BPS, callerType: "agent" });
      if (res.ok) {
        weeklySpent += res.amount;
        balance -= res.amount;
        remaining = Math.max(0, limit - weeklySpent);
        spent += res.amount;
        chaptersRead += unpaid.length;
        await addAgentMessage({
          userId,
          sender: "agent",
          kind: "decision",
          content: `Bought the Series Pass for “${series.title}” — $${res.amount.toFixed(2)}, cheaper than the ${unpaid.length} chapters left ($${remainingCost.toFixed(2)}). You own the whole series now and won't pay for it again.`,
          seriesId: series.id,
          amountUsd: res.amount,
        });
        break;
      }
    }

    // Otherwise read in sequence within budget: a strong match reads several,
    // a sample tries two, a weak pass tries one.
    const cap = decision.decision === "CONTINUE" ? MAX_CHAPTERS_PER_RUN : decision.decision === "SAMPLE" ? 2 : 1;
    for (const ch of unpaid.slice(0, cap)) {
      const price = Number(ch.current_price_usdc);
      if (weeklySpent + price > limit + 1e-9) break;
      if (balance < price) break;

      const res = await settleSession({
        userId,
        creator,
        chapterId: ch.id,
        amountUsd: price,
        feeBps: AGENT_FEE_BPS,
        callerType: "agent",
        debitKind: "session_debit",
      });
      if (res.status !== "settled") break;

      weeklySpent += price;
      balance -= price;
      remaining = Math.max(0, limit - weeklySpent);
      spent += price;
      chaptersRead += 1;
      await addAgentMessage({
        userId,
        sender: "agent",
        kind: "decision",
        content: `Read “${series.title}” ${ch.title ?? `Ch ${ch.chapter_number}`} — paid $${price.toFixed(2)}.`,
        seriesId: series.id,
        chapterId: ch.id,
        amountUsd: price,
        paymentRef: res.paymentId,
      });
    }

    if (chaptersRead > 0) break; // committed to one series this run
  }

  await updateAgentConfig(userId, { weekly_spent_usdc: weeklySpent });

  if (chaptersRead === 0) {
    await addAgentMessage({ userId, sender: "agent", kind: "summary", content: `Looked around but didn't find a fresh match worth your money right now. I'll keep watching for new chapters.` });
  } else {
    await addAgentMessage({
      userId,
      sender: "agent",
      kind: "summary",
      content: `Done for now — read ${chaptersRead} chapter${chaptersRead > 1 ? "s" : ""} for $${spent.toFixed(2)}. $${remaining.toFixed(2)} left in this week's budget.`,
    });
  }

  return { ran: true, spent, chaptersRead, remaining };
}

async function evaluateSeries(
  taste: TasteProfile | null,
  series: Series,
  firstChapterId: string,
): Promise<{ decision: "CONTINUE" | "SAMPLE" | "PAUSE" | "STOP"; reason: string }> {
  const ch = await getChapterById(firstChapterId);
  const excerpt = (ch?.content ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 500);
  const fallback = { decision: "CONTINUE" as const, reason: "looks like a solid match for your taste." };
  if (!agentEnabled() || !ch) return fallback;
  try {
    const out = await callModel(
      `You are a reading agent deciding whether to spend a reader's budget on a series. Return ONLY JSON:
{ "decision": "CONTINUE" | "SAMPLE" | "PAUSE" | "STOP", "reason": "one short sentence to the reader" }
CONTINUE = strong match, commit. SAMPLE = uncertain, worth one chapter. PAUSE = weak match. STOP = contains a hard avoid (never pay).`,
      `Reader taste: ${JSON.stringify(taste ?? {})}
Series: "${series.title}" (${series.genre ?? "—"}), completion ${Math.round(Number(series.avg_completion_rate) * 100)}%.
Opening excerpt: "${excerpt}"`,
    );
    const j = extractJson<{ decision?: string; reason?: string }>(out);
    const d = (j?.decision ?? "").toUpperCase();
    if (d === "CONTINUE" || d === "SAMPLE" || d === "PAUSE" || d === "STOP") {
      return { decision: d, reason: j?.reason || fallback.reason };
    }
  } catch {
    /* fall through */
  }
  return fallback;
}

/** Reactive chat — the agent answers with full awareness of its budget + history. */
export async function chatWithAgent(userId: string, message: string): Promise<string> {
  const config = await getAgentConfig(userId);
  const history = await listAgentMessages(userId, 30);
  const remaining = config ? Math.max(0, Number(config.weekly_limit_usdc) - Number(config.weekly_spent_usdc)) : 0;

  const fallback = config
    ? `I've spent $${Number(config.weekly_spent_usdc).toFixed(2)} of $${Number(config.weekly_limit_usdc).toFixed(2)} this week — $${remaining.toFixed(2)} left. Ask me to find something specific and I'll go.`
    : `Set me up first and I'll start finding things you'll love.`;

  if (!agentEnabled()) return fallback;
  try {
    const ctx = {
      taste: config?.taste_profile ?? null,
      weekly_limit: config ? Number(config.weekly_limit_usdc) : null,
      weekly_spent: config ? Number(config.weekly_spent_usdc) : null,
      remaining,
      recent_activity: history.slice(-15).map((m) => ({ from: m.sender, text: m.content })),
    };
    const out = await callModel(
      `You are the reader's autonomous reading agent on Charon. You have been discovering and paying for serialized fiction on their behalf within a weekly budget. Be specific and concise (2-4 sentences), reference real activity from the context, never invent payments. You can't execute new purchases from chat in this version — if asked, say you'll act on it on your next run.`,
      `Context: ${JSON.stringify(ctx)}\n\nReader says: ${message}`,
    );
    return out.trim() || fallback;
  } catch {
    return fallback;
  }
}
