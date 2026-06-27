import { NextRequest } from "next/server";
import { analyzeTip } from "@/lib/agent";
import { detectPlatform } from "@/lib/identity";
import { executeTip } from "@/lib/payments";
import { notifyUser } from "@/lib/telegram";
import { corsJson, preflight } from "@/lib/cors";
import { getCreatorById, getUserById, listTipsForUser, upsertCreatorByIdentities } from "@/lib/db";

export const runtime = "nodejs";
export const maxDuration = 60;

export function OPTIONS() {
  return preflight();
}

/** GET /api/tip?userId=<uuid> → that reader's recent tips (dashboard history). */
export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId");
  if (!userId) return corsJson({ error: "userId required" }, { status: 400 });
  const tips = await listTipsForUser(userId, 25);
  return corsJson({ tips });
}

/**
 * Shared tip entrypoint for the web (and a future browser extension).
 *   POST /api/tip { userId, url, amount?, comment? }
 *        → { proposal, creatorId }   (analyze only; reader confirms)
 *   POST /api/tip { userId, url, creatorId, amount, confidence, execute: true }
 *        → { result }                (execute a confirmed tip)
 */
export async function POST(req: NextRequest) {
  let body: {
    userId?: string;
    url?: string;
    amount?: number;
    comment?: string;
    creatorId?: string;
    confidence?: number;
    reasoning?: string;
    execute?: boolean;
  } = {};
  try {
    body = await req.json();
  } catch {
    /* ignore */
  }
  if (!body.userId || !body.url) {
    return corsJson({ error: "userId and url required" }, { status: 400 });
  }
  const user = await getUserById(body.userId);
  if (!user) return corsJson({ error: "user not found" }, { status: 404 });

  // ── execute a confirmed tip ──
  if (body.execute && body.creatorId) {
    const creator = await getCreatorById(body.creatorId);
    if (!creator) return corsJson({ error: "creator not found" }, { status: 404 });
    const result = await executeTip({
      userId: user.id,
      creator,
      url: body.url,
      platform: detectPlatform(body.url),
      amountUsd: Number(body.amount),
      confidence: Number(body.confidence ?? 0),
      agentReasoning: body.reasoning ?? null,
    });

    // Mirror the tip into the reader's Telegram DM (extension flow).
    if (user.telegram_id && (result.status === "sent" || result.status === "escrowed")) {
      const who = creator.name ?? creator.wallet_address ?? "the creator";
      const line =
        result.status === "sent"
          ? `✅ Tipped $${Number(body.amount).toFixed(2)} to ${who} on Arc.`
          : `📩 $${Number(body.amount).toFixed(2)} to ${who} is held in escrow — we've sent them a claim link.`;
      await notifyUser(user.telegram_id, line);
    }
    return corsJson({ result });
  }

  // ── analyze + propose ──
  const proposal = await analyzeTip(body.url, body.amount, body.comment);
  if (proposal.action === "ask" || (!proposal.bestWallet && !proposal.bestEmail)) {
    return corsJson({ proposal, creatorId: null });
  }
  const creator = await upsertCreatorByIdentities({
    name: proposal.creatorName,
    email: proposal.bestEmail,
    walletAddress: proposal.bestWallet,
    identities: proposal.identities.map((i) => ({
      platform: i.source,
      handle: i.handle,
      address: i.address,
      confidence: i.confidence,
    })),
  });
  return corsJson({ proposal, creatorId: creator.id });
}
