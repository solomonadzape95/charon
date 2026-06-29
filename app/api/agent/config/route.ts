import { NextRequest, NextResponse } from "next/server";
import { addAgentMessage, getAgentConfig, getUserById, upsertAgentConfig } from "@/lib/db";
import { buildTasteProfile } from "@/lib/agents/reader-agent";
import { circleEnabled, createCreatorWallet } from "@/lib/circle";

export const runtime = "nodejs";
export const maxDuration = 60;

function shape(config: Awaited<ReturnType<typeof getAgentConfig>>) {
  if (!config) return null;
  const limit = Number(config.weekly_limit_usdc);
  const spent = Number(config.weekly_spent_usdc);
  return {
    configured: true,
    paused: config.paused,
    tasteProfile: config.taste_profile,
    weeklyLimit: limit,
    weeklySpent: spent,
    remaining: Math.max(0, limit - spent),
    walletAddress: config.agent_wallet_address,
  };
}

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId");
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });
  const config = await getAgentConfig(userId);
  return NextResponse.json({ config: shape(config) });
}

/** Set up (or reconfigure) the agent. */
export async function POST(req: NextRequest) {
  let body: { userId?: string; loved?: string[]; avoids?: string[]; weeklyLimit?: number } = {};
  try {
    body = await req.json();
  } catch {
    /* ignore */
  }
  const { userId } = body;
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });
  const user = await getUserById(userId);
  if (!user) return NextResponse.json({ error: "user not found" }, { status: 404 });

  const loved = (body.loved ?? []).map((s) => String(s).trim()).filter(Boolean).slice(0, 8);
  const avoids = (body.avoids ?? []).map((s) => String(s).trim()).filter(Boolean).slice(0, 8);
  const weeklyLimit = Math.max(1, Math.min(20, Number(body.weeklyLimit) || 3));

  const existing = await getAgentConfig(userId);
  const taste = await buildTasteProfile(loved, avoids);

  // Provision the agent's own Circle wallet (optional — non-blocking on testnet).
  let walletId: string | null = existing?.agent_wallet_id ?? null;
  let walletAddress: string | null = existing?.agent_wallet_address ?? null;
  if (circleEnabled() && !walletId) {
    try {
      const w = await createCreatorWallet(`agent:${userId}`);
      walletId = w.walletId;
      walletAddress = w.address;
    } catch (e) {
      console.warn("[charon] agent wallet provision failed:", (e as Error).message);
    }
  }

  const config = await upsertAgentConfig({
    userId,
    tasteProfile: taste,
    weeklyLimitUsdc: weeklyLimit,
    agentWalletId: walletId,
    agentWalletAddress: walletAddress,
  });

  if (!existing) {
    await addAgentMessage({
      userId,
      sender: "agent",
      kind: "summary",
      content: `Got it — ${taste.summary} I'll work within $${weeklyLimit.toFixed(2)}/week and tell you everything I find. Hit "Run now" or I'll start on my next cycle.`,
    });
  }

  return NextResponse.json({ config: shape(config) });
}
