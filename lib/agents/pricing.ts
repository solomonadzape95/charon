/**
 * Agent 2 — Creator Pricing.
 *
 * Fires on every chapter upload. Sets a fair base price from word count /
 * estimated read time, genre benchmarks, series following + momentum, and the
 * chapter's position in the series. The creator can override; most won't.
 *
 * The model suggests a price within [floor, ceiling] + reasoning; code clamps.
 */
import { callModel, extractJson, clamp, num, str, agentEnabled } from "@/lib/agents/shared";
import { floorFor, genreBenchmark, estimatedReadMinutes, cents } from "@/lib/pricing";

export interface PriceChapterInput {
  wordCount: number;
  contentType: "text" | "images";
  genre?: string | null;
  seriesFollowers: number;
  seriesMomentum: number;
  chapterNumber: number;
  override?: number;
}

export interface ChapterPricing {
  floorPrice: number;
  basePrice: number;
  earlyAccessPrice: number;
  reasoning: string;
}

const SYSTEM = `You are Charon's Creator Pricing agent. A creator just uploaded a chapter.
Set a fair per-chapter base price in USDC. Reply with ONLY a JSON object (no prose, no fences):

{
  "base_price_usdc": number,   // within the provided floor..ceiling range
  "reasoning": string          // ONE short sentence explaining the price (length, genre, demand)
}

Pricing intuition: longer, denser chapters and series with strong following/momentum justify more.
A brand-new series with no audience should price near the floor to attract readers.`;

export async function priceChapter(input: PriceChapterInput): Promise<ChapterPricing> {
  const bench = genreBenchmark(input.genre);
  const floor = floorFor(input.wordCount, input.genre);
  const ceiling = bench.ceiling;

  // Override path — creator set the price explicitly.
  if (typeof input.override === "number" && Number.isFinite(input.override)) {
    const base = cents(clamp(input.override, floor, ceiling));
    return { floorPrice: floor, basePrice: base, earlyAccessPrice: cents(base * 1.5), reasoning: "Price set by the creator." };
  }

  const readMin = estimatedReadMinutes(input.wordCount);

  let base: number;
  let reasoning: string;

  if (agentEnabled()) {
    try {
      const user = [
        `Content type: ${input.contentType}`,
        input.contentType === "text"
          ? `Word count: ${input.wordCount} (~${readMin} min read)`
          : `Panels/pages: ${input.wordCount}`,
        `Genre: ${input.genre ?? "unspecified"}`,
        `Series followers: ${input.seriesFollowers}`,
        `Series momentum score: ${input.seriesMomentum}`,
        `Chapter number: ${input.chapterNumber}`,
        `Allowed price range: $${floor.toFixed(2)} (floor) to $${ceiling.toFixed(2)} (ceiling)`,
        `Genre typical base: $${bench.base.toFixed(2)}`,
      ].join("\n");
      const raw = await callModel(SYSTEM, user);
      const parsed = extractJson(raw);
      if (!parsed) throw new Error("no parseable decision");
      base = clamp(num(parsed.base_price_usdc, bench.base), floor, ceiling);
      reasoning = str(parsed.reasoning) || deterministicReason(input, bench.base);
    } catch {
      ({ base, reasoning } = deterministic(input, floor, ceiling, bench.base));
    }
  } else {
    ({ base, reasoning } = deterministic(input, floor, ceiling, bench.base));
  }

  base = cents(base);
  return { floorPrice: floor, basePrice: base, earlyAccessPrice: cents(base * 1.5), reasoning };
}

function deterministic(
  input: PriceChapterInput,
  floor: number,
  ceiling: number,
  genreBase: number,
): { base: number; reasoning: string } {
  // Scale genre base by length and by a gentle following/momentum multiplier.
  const lengthFactor =
    input.contentType === "text" ? clamp(input.wordCount / 2500, 0.6, 1.6) : clamp(input.wordCount / 30, 0.6, 1.6);
  const audienceFactor = clamp(1 + input.seriesFollowers / 500 + input.seriesMomentum / 50, 1, 1.8);
  const base = clamp(genreBase * lengthFactor * audienceFactor, floor, ceiling);
  return { base, reasoning: deterministicReason(input, base) };
}

function deterministicReason(input: PriceChapterInput, base: number): string {
  const bits: string[] = [];
  if (input.contentType === "text") bits.push(`${input.wordCount.toLocaleString()} words`);
  else bits.push(`${input.wordCount} panels`);
  if (input.seriesFollowers > 0) bits.push(`${input.seriesFollowers} followers`);
  else bits.push("a new series");
  return `Priced at $${base.toFixed(2)} based on ${bits.join(" and ")}.`;
}
