/**
 * Bio-code ownership verification. A creator places a one-time code where only
 * the handle's owner could — their profile bio, channel description, or a public
 * post — and we fetch that surface server-side and confirm the code is present.
 *
 * Most platforms expose a fetchable profile. X/Twitter blocks server scrapes, so
 * the creator posts a public tweet with the code and passes that tweet URL as a
 * proofUrl; we read it via the public syndication endpoint.
 */
import { randomUUID } from "node:crypto";
import { fetchUrlContent, safeHost } from "@/lib/identity";
import type { IdentityPlatform } from "@/lib/supabase";

export function buildVerifyCode(): string {
  return `charon-verify-${randomUUID().replace(/-/g, "").slice(0, 8)}`;
}

export function codePresent(text: string | null | undefined, code: string): boolean {
  if (!text) return false;
  return text.toLowerCase().includes(code.toLowerCase());
}

/** A human instruction telling the creator exactly where to place the code. */
export function placementHint(platform: IdentityPlatform, code: string): string {
  switch (platform) {
    case "github":
      return `Add "${code}" anywhere in your GitHub profile bio, then verify.`;
    case "substack":
      return `Add "${code}" to your Substack About page, then verify.`;
    case "youtube":
      return `Add "${code}" to your YouTube channel description (About tab), then verify.`;
    case "x":
      return `Post a public tweet containing "${code}", then paste that tweet's URL as the proof link.`;
    default:
      return `Add "${code}" to the page at this handle (or paste a public URL containing it), then verify.`;
  }
}

/** Extract a tweet's text via Twitter's public syndication JSON (no auth). */
async function fetchTweetText(proofUrl: string): Promise<string> {
  try {
    const id = new URL(proofUrl).pathname.match(/status(?:es)?\/(\d+)/)?.[1];
    if (!id) return "";
    // The syndication endpoint is unauthenticated; the token param is not validated.
    const r = await fetch(
      `https://cdn.syndication.twimg.com/tweet-result?id=${id}&lang=en&token=a`,
      { headers: { "User-Agent": "CharonBot/1.0" } },
    );
    if (!r.ok) return "";
    const j = await r.json();
    return [j?.text, j?.user?.name, j?.user?.screen_name].filter(Boolean).join(" ");
  } catch {
    return "";
  }
}

async function fetchGithubBio(handle: string): Promise<string> {
  try {
    const headers: Record<string, string> = { Accept: "application/vnd.github+json" };
    if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
    const r = await fetch(`https://api.github.com/users/${handle}`, { headers });
    if (!r.ok) return "";
    const u = await r.json();
    return [u.bio, u.name, u.blog, u.login].filter(Boolean).join(" ");
  } catch {
    return "";
  }
}

/** YouTube channel "About" URL for a normalized handle (@name, channel/ID, or name). */
function youtubeAboutUrl(handle: string): string {
  if (handle.startsWith("@")) return `https://www.youtube.com/${handle}/about`;
  if (handle.startsWith("channel/")) return `https://www.youtube.com/${handle}/about`;
  return `https://www.youtube.com/c/${handle}/about`;
}

/**
 * Fetch the text we should scan for the verify code. If a proofUrl is given it
 * takes precedence (required for X). Otherwise we fetch the platform's profile.
 */
export async function fetchProofText(args: {
  platform: IdentityPlatform;
  handle: string;
  proofUrl?: string | null;
}): Promise<string> {
  if (args.proofUrl) {
    const host = safeHost(args.proofUrl);
    if (host === "x.com" || host.includes("twitter.com")) return fetchTweetText(args.proofUrl);
    return (await fetchUrlContent(args.proofUrl)).text;
  }
  switch (args.platform) {
    case "github":
      return fetchGithubBio(args.handle);
    case "substack":
      return (await fetchUrlContent(`https://${args.handle}.substack.com/about`)).text;
    case "youtube":
      return (await fetchUrlContent(youtubeAboutUrl(args.handle))).text;
    case "mirror":
      return (await fetchUrlContent(`https://mirror.xyz/${args.handle}`)).text;
    default:
      return ""; // x with no proofUrl, or unsupported — caller asks for a proof link
  }
}
