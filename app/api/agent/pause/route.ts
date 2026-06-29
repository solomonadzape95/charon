import { NextRequest, NextResponse } from "next/server";
import { addAgentMessage, getAgentConfig, updateAgentConfig } from "@/lib/db";

export const runtime = "nodejs";

/** Pause / resume the agent. POST /api/agent/pause { userId, paused } */
export async function POST(req: NextRequest) {
  let body: { userId?: string; paused?: boolean } = {};
  try {
    body = await req.json();
  } catch {
    /* ignore */
  }
  const { userId } = body;
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });
  const config = await getAgentConfig(userId);
  if (!config) return NextResponse.json({ error: "no agent configured" }, { status: 404 });

  const paused = !!body.paused;
  await updateAgentConfig(userId, { paused });
  await addAgentMessage({
    userId,
    sender: "agent",
    kind: "summary",
    content: paused
      ? `Paused. Your budget is safe — resume whenever you want.`
      : `Back on. I'll pick up where I left off.`,
  });
  return NextResponse.json({ ok: true, paused });
}
