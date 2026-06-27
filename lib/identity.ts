/**
 * Creator identity resolution — the data layer behind the agent's fetch_url and
 * search_identity tools. Tier 1 platforms: any blog (OpenGraph/schema.org),
 * Mirror.xyz (on-chain author), GitHub (profile bio), ENS (viem mainnet).
 * Farcaster is best-effort via Neynar when NEYNAR_API_KEY is set.
 */
import { createPublicClient, http, isAddress } from "viem";
import { mainnet } from "viem/chains";
import { normalize } from "viem/ens";
import type { IdentityPlatform } from "@/lib/supabase";
import { lookupVerifiedIdentity } from "@/lib/db";

// ENS resolution. viem's default public endpoint hangs in many environments,
// so default to a reliable public RPC; override with ETH_RPC_URL (Alchemy/Infura).
const ens = createPublicClient({
  chain: mainnet,
  transport: http(process.env.ETH_RPC_URL ?? "https://ethereum-rpc.publicnode.com", { timeout: 8000 }),
});

export interface PageContent {
  url: string;
  domain: string;
  platform: string;
  title: string | null;
  author: string | null;
  text: string;
}

export interface IdentitySignal {
  source: IdentityPlatform;
  handle: string;
  address: string | null;
  confidence: number;
}

export function detectPlatform(url: string): string {
  const h = safeHost(url);
  if (h.includes("mirror.xyz")) return "mirror";
  if (h.includes("substack.com")) return "substack";
  if (h.includes("github.com") || h.includes("github.io")) return "github";
  if (h.includes("arxiv.org")) return "arxiv";
  if (h.includes("youtube.com") || h.includes("youtu.be")) return "youtube";
  if (h.includes("reddit.com")) return "reddit";
  if (h === "x.com" || h.includes("twitter.com")) return "x";
  return "web";
}

export function safeHost(url: string): string {
  try {
    return new URL(url).host.toLowerCase().replace(/^www\./, "");
  } catch {
    return "";
  }
}

/**
 * The platform-native identifier used as the registry key for a URL. Must be
 * normalized identically on the write path (registration) and the read path
 * (searchIdentity) so lookups match. Returns null for platforms we don't key on.
 */
export function canonicalHandle(
  url: string,
  platform: string,
  author?: string | null,
): string | null {
  try {
    const u = new URL(url);
    const seg = u.pathname.split("/").filter(Boolean);
    switch (platform) {
      case "x": {
        // x.com/<handle>[/status/...] — ignore reserved non-profile paths.
        const h = seg[0]?.replace(/^@/, "").toLowerCase();
        if (!h || ["i", "home", "search", "hashtag", "explore"].includes(h)) return null;
        return h;
      }
      case "youtube": {
        if (seg[0]?.startsWith("@")) return seg[0].toLowerCase(); // @handle
        if (seg[0] === "channel" && seg[1]) return `channel/${seg[1]}`; // channel/UC...
        if ((seg[0] === "c" || seg[0] === "user") && seg[1]) return seg[1].toLowerCase();
        return null;
      }
      case "substack": {
        const sub = u.host.toLowerCase().replace(/^www\./, "").replace(/\.substack\.com$/, "");
        return sub && sub !== "substack.com" ? sub : null;
      }
      case "github":
        return seg[0]?.toLowerCase() ?? null;
      case "mirror":
        return seg[0]?.toLowerCase() ?? null;
      default:
        return null;
    }
  } catch {
    return null;
  }
}

function meta(html: string, names: string[]): string | null {
  for (const n of names) {
    const re = new RegExp(
      `<meta[^>]+(?:property|name)=["']${n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["'][^>]*>`,
      "i",
    );
    const tag = html.match(re)?.[0];
    const content = tag?.match(/content=["']([^"']*)["']/i)?.[1];
    if (content) return decodeEntities(content.trim());
  }
  return null;
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function jsonLdAuthor(html: string): string | null {
  const blocks = html.match(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi) ?? [];
  for (const b of blocks) {
    const body = b.replace(/<[^>]+>/g, "");
    try {
      const data = JSON.parse(body);
      const nodes = Array.isArray(data) ? data : [data, ...(data["@graph"] ?? [])];
      for (const node of nodes) {
        const a = node?.author;
        if (typeof a === "string") return a;
        if (a?.name) return a.name;
        if (Array.isArray(a) && a[0]?.name) return a[0].name;
      }
    } catch {
      /* ignore malformed JSON-LD */
    }
  }
  return null;
}

/** Fetch a URL and extract title, author, and readable text. */
export async function fetchUrlContent(url: string): Promise<PageContent> {
  const platform = detectPlatform(url);
  const domain = safeHost(url);
  let html = "";
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "CharonBot/1.0 (+https://charon.app)", Accept: "text/html,*/*" },
      redirect: "follow",
    });
    html = await res.text();
  } catch (e) {
    return { url, domain, platform, title: null, author: null, text: `fetch failed: ${(e as Error).message}` };
  }

  const title = meta(html, ["og:title", "twitter:title"]) ?? html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]?.trim() ?? null;
  const author =
    meta(html, [
      "author",
      "article:author",
      "og:article:author",
      "twitter:creator",
      "citation_author", // arXiv, academic
      "dc.creator",
      "dcterms.creator",
      "parsely-author",
      "sailthru.author",
    ]) ?? jsonLdAuthor(html);

  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 6000);

  return { url, domain, platform, title, author: author ? decodeEntities(author) : null, text };
}

async function resolveEns(name: string): Promise<string | null> {
  try {
    const addr = await ens.getEnsAddress({ name: normalize(name) });
    return addr ?? null;
  } catch {
    return null;
  }
}

/** Extract an `.eth` ENS name from an ENS-hosted domain, if any. */
function ensNameFromDomain(domain: string): string | null {
  const d = domain.toLowerCase().replace(/^www\./, "");
  // eth.limo / eth.link gateways: <name>.eth.limo → <name>.eth
  const gw = d.match(/^(.+\.eth)\.(?:limo|link)$/);
  if (gw) return gw[1];
  // bare ENS host
  if (d.endsWith(".eth")) return d;
  return null;
}

function extractEthish(s: string | null | undefined): { ens?: string; address?: string } {
  if (!s) return {};
  const addr = s.match(/0x[a-fA-F0-9]{40}/)?.[0];
  const ensName = s.match(/[a-z0-9-]+\.eth/i)?.[0];
  return { address: addr, ens: ensName };
}

/**
 * Search for a creator's wallet across ENS, Mirror (on-chain), and GitHub bio.
 * Returns ranked signals; the agent decides what to do with them.
 */
export async function searchIdentity(args: {
  url: string;
  author?: string | null;
  domain?: string | null;
}): Promise<IdentitySignal[]> {
  const platform = detectPlatform(args.url);
  const signals: IdentitySignal[] = [];
  const domain = args.domain ?? safeHost(args.url);

  // ── Registry first: a verified, self-registered creator beats any guess ──
  // Identity becomes a DB lookup, so web2 creators (x, youtube, substack, …)
  // route directly to their attached wallet with no escrow / claim friction.
  const handle = canonicalHandle(args.url, platform, args.author);
  if (handle) {
    try {
      const row = await lookupVerifiedIdentity(platform as IdentityPlatform, handle);
      if (row?.address) {
        signals.push({ source: platform as IdentityPlatform, handle, address: row.address, confidence: 99 });
      }
    } catch {
      /* registry unavailable — fall through to live probes */
    }
  }

  // ── ENS-hosted site: the domain itself is the identity ──
  // vitalik.eth.limo / vitalik.eth.link (eth gateways), or a bare *.eth host.
  const ensName = ensNameFromDomain(domain);
  if (ensName) {
    let addr = await resolveEns(ensName);
    // Subdomain host (foo.vitalik.eth) may not resolve — fall back to the 2LD.
    if (!addr) {
      const labels = ensName.split(".");
      if (labels.length > 2) addr = await resolveEns(labels.slice(-2).join("."));
    }
    if (addr) {
      // Their own ENS-hosted site is strong evidence they're the creator.
      signals.push({ source: "ens", handle: ensName, address: addr, confidence: 95 });
    }
  }

  // ── Mirror.xyz: author lives in the first path segment (ENS or 0x) ──
  if (platform === "mirror") {
    try {
      const seg = new URL(args.url).pathname.split("/").filter(Boolean)[0];
      if (seg) {
        if (isAddress(seg)) {
          signals.push({ source: "mirror", handle: seg, address: seg, confidence: 97 });
        } else if (/\.eth$/i.test(seg)) {
          const addr = await resolveEns(seg);
          signals.push({ source: "mirror", handle: seg, address: addr, confidence: addr ? 96 : 70 });
          if (addr) signals.push({ source: "ens", handle: seg, address: addr, confidence: 95 });
        }
      }
    } catch {
      /* ignore */
    }
  }

  // ── GitHub: resolve repo/user owner, inspect profile bio/blog/twitter ──
  if (platform === "github") {
    try {
      const owner = new URL(args.url).pathname.split("/").filter(Boolean)[0];
      if (owner) {
        const headers: Record<string, string> = { Accept: "application/vnd.github+json" };
        if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
        const r = await fetch(`https://api.github.com/users/${owner}`, { headers });
        if (r.ok) {
          const u = await r.json();
          const found = extractEthish(`${u.bio ?? ""} ${u.blog ?? ""} ${u.name ?? ""}`);
          if (found.address) {
            signals.push({ source: "github", handle: owner, address: found.address, confidence: 80 });
          } else if (found.ens) {
            const addr = await resolveEns(found.ens);
            signals.push({ source: "github", handle: owner, address: addr, confidence: addr ? 85 : 55 });
          } else {
            signals.push({ source: "github", handle: owner, address: null, confidence: 40 });
          }
          if (u.email) signals.push({ source: "email", handle: u.email, address: null, confidence: 60 });
        }
      }
    } catch {
      /* ignore */
    }
  }

  // ── Direct ENS guess from the author name (e.g. "vitalik.eth" byline) ──
  const fromAuthor = extractEthish(args.author);
  if (fromAuthor.address) {
    signals.push({ source: "ens", handle: fromAuthor.address, address: fromAuthor.address, confidence: 75 });
  } else if (fromAuthor.ens) {
    const addr = await resolveEns(fromAuthor.ens);
    if (addr) signals.push({ source: "ens", handle: fromAuthor.ens, address: addr, confidence: 90 });
  }

  // ── Farcaster (best effort) ──
  if (process.env.NEYNAR_API_KEY && args.author) {
    try {
      const r = await fetch(
        `https://api.neynar.com/v2/farcaster/user/search?q=${encodeURIComponent(args.author)}&limit=1`,
        { headers: { api_key: process.env.NEYNAR_API_KEY, "x-api-key": process.env.NEYNAR_API_KEY } },
      );
      if (r.ok) {
        const j = await r.json();
        const user = j?.result?.users?.[0];
        const addr = user?.verified_addresses?.eth_addresses?.[0] ?? user?.custody_address;
        if (addr) signals.push({ source: "farcaster", handle: user.username, address: addr, confidence: 88 });
      }
    } catch {
      /* ignore */
    }
  }

  // De-dupe by (source, handle), keep highest confidence.
  const best = new Map<string, IdentitySignal>();
  for (const s of signals) {
    const k = `${s.source}:${s.handle}`;
    if (!best.has(k) || best.get(k)!.confidence < s.confidence) best.set(k, s);
  }
  return [...best.values()].sort((a, b) => b.confidence - a.confidence);
}
