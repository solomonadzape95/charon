import { NextRequest, NextResponse } from "next/server";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { addAgentMessage, getAgentConfig, getAgentSpendStats, getUserById, upsertAgentConfig } from "@/lib/db";
import { buildTasteProfile } from "@/lib/agents/reader-agent";
import { getOnchainUsdc } from "@/lib/agent-wallet";

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
    walletAddress: config.agent_wallet_address, // public — the private key is never returned
    walletBalance: Number(config.wallet_balance_usdc),
    weekFunded: Number(config.week_funded_usdc),
  };
}

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId");
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });
  const config = await getAgentConfig(userId);
  const base = shape(config);
  if (!base) return NextResponse.json({ config: null });
  const stats = await getAgentSpendStats(userId);

  // Real native-USDC balance held by the agent's wallet on Arc (best-effort).
  let onchainBalance: number | null = null;
  if (config!.agent_wallet_address) {
    try {
      onchainBalance = await getOnchainUsdc(config!.agent_wallet_address);
    } catch {
      /* RPC unavailable — fall back to the ledger budget in the UI */
    }
  }

  return NextResponse.json({ config: { ...base, stats, onchainBalance } });
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

  // The agent gets its OWN wallet — a real keypair it signs payments with.
  let walletPk: string | null = existing?.agent_wallet_pk ?? null;
  let walletAddress: string | null = existing?.agent_wallet_address ?? null;
  if (!walletPk) {
    const pk = generatePrivateKey();
    walletPk = pk;
    walletAddress = privateKeyToAccount(pk).address;
  }

  const config = await upsertAgentConfig({
    userId,
    tasteProfile: taste,
    weeklyLimitUsdc: weeklyLimit,
    agentWalletPk: walletPk,
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
