import { NextRequest, NextResponse } from "next/server";
import { runAgent } from "@/lib/agents/reader-agent";

export const runtime = "nodejs";
export const maxDuration = 120;

/** Trigger one agent run. POST /api/agent/run { userId } */
export async function POST(req: NextRequest) {
  let body: { userId?: string } = {};
  try {
    body = await req.json();
  } catch {
    /* ignore */
  }
  if (!body.userId) return NextResponse.json({ error: "userId required" }, { status: 400 });
  const result = await runAgent(body.userId);
  return NextResponse.json(result);
}
