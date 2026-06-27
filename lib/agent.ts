/**
 * The Charon tipping agent, via OpenRouter (OpenAI-compatible).
 *
 * Design for free/weak models: the data-gathering steps are deterministic
 * (always fetch the page, always search identities across platforms), and the
 * model makes a SINGLE structured-JSON decision over that evidence — who the
 * creator is, how confident we are, a fair amount, and route-vs-escrow. This is
 * robust on any instruct model (no fragile multi-turn tool-calling required)
 * while keeping the real agentic reasoning: identify → decide → route.
 */
import { fetchUrlContent, searchIdentity, type IdentitySignal } from "@/lib/identity";
import { MAX_TIP, MIN_TIP } from "@/lib/payments";

const PRIMARY =
  process.env.OPENROUTER_MODEL ??
  process.env.OPENROUTER_DEFAULT_MODEL ??
  "qwen/qwen3-next-80b-a3b-instruct:free";
// Fallback chain for free-tier 429s — distinct providers so they don't all
// rate-limit together. De-duped against the primary.
const MODELS = [...new Set([
  PRIMARY,
  "meta-llama/llama-3.3-70b-instruct:free",
  "qwen/qwen3-coder:free",
])];
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export type ProposalAction = "route" | "escrow" | "confirm_identity" | "ask";

export interface TipProposal {
  creatorName: string | null;
  platform: string;
  bestWallet: string | null;
  bestEmail: string | null;
  confidence: number;
  action: ProposalAction;
  suggestedAmount: number;
  reasoning: string;
  identities: IdentitySignal[];
}

const SYSTEM = `You are Charon, an agent that helps a reader tip the creator of online content.
You are given the page's content + metadata, and a list of wallet identity signals already gathered for you.
Decide, and reply with ONLY a JSON object (no prose, no markdown fences):

{
  "creatorName": string | null,
  "confidence": number,          // 0-100: how sure you are of the creator AND that a payable wallet exists
  "action": "route" | "escrow" | "confirm_identity" | "ask",
  "suggestedAmount": number,     // USD
  "reasoning": string            // ONE sentence the reader will see
}

Confidence → action:
  95-100: a wallet found with strong direct evidence (Mirror on-chain author, resolved ENS) → "route"
  60-94 : creator identified but wallet uncertain, or only an email/handle → "escrow"
  40-59 : identity ambiguous → "confirm_identity"
  0-39  : can't identify → "ask"

Amount rubric (only if the reader did NOT specify one):
  Quick/light read:               $0.01 - $0.05
  Useful, practical, saved time:  $0.05 - $0.25
  Deep, technical, thorough:      $0.25 - $1.00
  Rare/seminal/career-altering:   $1.00 - $5.00
If the reader's comment states value ("saved me 3 hours"), weight it heavily.
Never exceed $${MAX_TIP}. Reply with the JSON object only.`;

export async function analyzeTip(
  url: string,
  userAmount?: number,
  comment?: string,
): Promise<TipProposal> {
  if (!process.env.OPENROUTER_API_KEY) throw new Error("OPENROUTER_API_KEY not set");

  // ── deterministic evidence gathering ──
  const page = await fetchUrlContent(url);
  const identities = await searchIdentity({ url, author: page.author, domain: page.domain });
  const topWithAddr = identities.find((i) => i.address) ?? null;
  const bestEmail = identities.find((i) => i.source === "email")?.handle ?? null;

  const userMsg = [
    `URL: ${url}`,
    `Platform: ${page.platform}`,
    `Title: ${page.title ?? "(none)"}`,
    `Detected author: ${page.author ?? "(none)"}`,
    userAmount ? `Reader specified amount: $${userAmount} (use this, clamped to limits)` : `Reader did not specify an amount — you decide.`,
    comment ? `Reader's comment: "${comment}"` : "",
    ``,
    `Identity signals (source, handle, wallet, confidence):`,
    identities.length
      ? identities.map((i) => `- ${i.source} ${i.handle} ${i.address ?? "(no wallet)"} ${i.confidence}%`).join("\n")
      : "- none found",
    ``,
    `Content excerpt:`,
    page.text.slice(0, 3500),
  ]
    .filter(Boolean)
    .join("\n");

  let raw: string;
  try {
    raw = await callOpenRouter(userMsg);
  } catch (e) {
    // Network/model failure → deterministic fallback so a tip can still proceed.
    return fallback(url, page.platform, userAmount, topWithAddr, bestEmail, identities, `agent unavailable (${(e as Error).message})`);
  }

  const parsed = extractJson(raw);
  if (!parsed) {
    return fallback(url, page.platform, userAmount, topWithAddr, bestEmail, identities, "agent returned no parseable decision");
  }

  const amount = clamp(Number(userAmount ?? parsed.suggestedAmount), MIN_TIP, MAX_TIP);
  // Trust the gathered wallet over anything the model invents.
  const bestWallet = topWithAddr?.address ?? null;
  // Wallet-confidence is a property of the signal source (Mirror on-chain = 96,
  // resolved ENS = 95), not the model's gut — take the strongest available.
  const modelConf = clamp(Number(parsed.confidence) || 0, 0, 100);
  const confidence = bestWallet ? Math.max(modelConf, topWithAddr!.confidence) : modelConf;
  let action: ProposalAction = confidence >= 95 && bestWallet ? "route" : bestWallet || bestEmail ? "escrow" : "ask";
  // Respect an explicit lower-confidence ask from the model when identity is shaky.
  if (parsed.action === "confirm_identity" && confidence < 95) action = "confirm_identity";

  return {
    creatorName: str(parsed.creatorName) || page.author || null,
    platform: page.platform,
    bestWallet,
    bestEmail,
    confidence,
    action,
    suggestedAmount: amount,
    reasoning: str(parsed.reasoning) || "Tip proposal.",
    identities,
  };
}

async function callOpenRouter(userMsg: string): Promise<string> {
  let lastErr = "";
  for (const model of MODELS) {
    for (let attempt = 0; attempt < 2; attempt++) {
      const res = await fetch(OPENROUTER_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          "X-Title": "Charon",
        },
        body: JSON.stringify({
          model,
          temperature: 0.3,
          max_tokens: 1200,
          messages: [
            { role: "system", content: SYSTEM },
            { role: "user", content: userMsg },
          ],
        }),
      });
      if (res.ok) {
        const json = await res.json();
        const content = json?.choices?.[0]?.message?.content ?? "";
        if (content) return content;
        lastErr = "empty completion";
        break; // try next model
      }
      const body = await res.text().catch(() => "");
      lastErr = `${model} → ${res.status}: ${body.slice(0, 140)}`;
      // 429 / 5xx are transient → brief backoff then retry, else move on.
      if (res.status === 429 || res.status >= 500) {
        await sleep(800 * (attempt + 1));
        continue;
      }
      break; // 4xx other than 429 → next model won't help much, but try it
    }
  }
  throw new Error(`all models failed (${lastErr})`);
}

/** Pull the first JSON object out of a model reply (handles fences + <think> blocks). */
function extractJson(text: string): Record<string, unknown> | null {
  const cleaned = text.replace(/<think>[\s\S]*?<\/think>/gi, "");
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end <= start) return null;
  try {
    return JSON.parse(cleaned.slice(start, end + 1));
  } catch {
    return null;
  }
}

function fallback(
  url: string,
  platform: string,
  userAmount: number | undefined,
  top: IdentitySignal | null,
  bestEmail: string | null,
  identities: IdentitySignal[],
  why: string,
): TipProposal {
  const bestWallet = top?.address ?? null;
  return {
    creatorName: null,
    platform,
    bestWallet,
    bestEmail,
    confidence: top?.confidence ?? 0,
    action: bestWallet ? (top!.confidence >= 95 ? "route" : "escrow") : bestEmail ? "escrow" : "ask",
    suggestedAmount: clamp(Number(userAmount ?? 0.05), MIN_TIP, MAX_TIP),
    reasoning: `Proposal derived from identity signals (${why}).`,
    identities,
  };
}

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}
function clamp(n: number, lo: number, hi: number): number {
  if (Number.isNaN(n)) return lo;
  return Math.min(hi, Math.max(lo, n));
}
