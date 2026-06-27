/**
 * Shared agent plumbing for Charon's reading agents, via OpenRouter
 * (OpenAI-compatible). Lifted from the original tipping agent.
 *
 * Design for resilient demos: data-gathering is deterministic (done by each
 * agent against Supabase), the model makes a SINGLE structured-JSON decision
 * over that evidence, and the caller clamps/validates every number in code —
 * the model never decides money directly, only direction + magnitude + a
 * one-sentence reasoning string for the UI. Every agent ships a deterministic
 * fallback so the loop completes even if the model is unavailable.
 */
const PRIMARY =
  process.env.OPENROUTER_MODEL ??
  process.env.OPENROUTER_DEFAULT_MODEL ??
  "anthropic/claude-sonnet-4";
// Fallback chain for transient failures — distinct providers.
const MODELS = [
  ...new Set([PRIMARY, "anthropic/claude-3.5-sonnet", "meta-llama/llama-3.3-70b-instruct:free"]),
];
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function agentEnabled(): boolean {
  return Boolean(process.env.OPENROUTER_API_KEY);
}

/** Call OpenRouter with a system + user prompt, returning the raw completion text. */
export async function callModel(system: string, user: string): Promise<string> {
  if (!process.env.OPENROUTER_API_KEY) throw new Error("OPENROUTER_API_KEY not set");
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
          max_tokens: 1000,
          messages: [
            { role: "system", content: system },
            { role: "user", content: user },
          ],
        }),
      });
      if (res.ok) {
        const json = await res.json();
        const content = json?.choices?.[0]?.message?.content ?? "";
        if (content) return content;
        lastErr = "empty completion";
        break;
      }
      const body = await res.text().catch(() => "");
      lastErr = `${model} → ${res.status}: ${body.slice(0, 140)}`;
      if (res.status === 429 || res.status >= 500) {
        await sleep(700 * (attempt + 1));
        continue;
      }
      break;
    }
  }
  throw new Error(`all models failed (${lastErr})`);
}

/** Pull the first JSON object out of a model reply (handles fences + <think> blocks). */
export function extractJson<T = Record<string, unknown>>(text: string): T | null {
  const cleaned = text.replace(/<think>[\s\S]*?<\/think>/gi, "");
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end <= start) return null;
  try {
    return JSON.parse(cleaned.slice(start, end + 1)) as T;
  } catch {
    return null;
  }
}

export function clamp(n: number, lo: number, hi: number): number {
  if (Number.isNaN(n)) return lo;
  return Math.min(hi, Math.max(lo, n));
}

export function num(v: unknown, fallback = 0): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}

/** Round a USDC amount to whole cents (avoids sub-cent dust the rail can't settle). */
export function toCents(usd: number): number {
  return Math.round(usd * 100) / 100;
}
