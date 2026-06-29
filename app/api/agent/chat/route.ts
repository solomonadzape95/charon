import { NextRequest, NextResponse } from "next/server";
import { addAgentMessage } from "@/lib/db";
import { chatWithAgent } from "@/lib/agents/reader-agent";

export const runtime = "nodejs";
export const maxDuration = 60;

/** Reader → agent message; returns the agent's reply. POST /api/agent/chat { userId, message } */
export async function POST(req: NextRequest) {
  let body: { userId?: string; message?: string } = {};
  try {
    body = await req.json();
  } catch {
    /* ignore */
  }
  const { userId } = body;
  const message = (body.message ?? "").trim();
  if (!userId || !message) return NextResponse.json({ error: "userId and message required" }, { status: 400 });

  await addAgentMessage({ userId, sender: "reader", kind: "message", content: message.slice(0, 1000) });
  const reply = await chatWithAgent(userId, message);
  const saved = await addAgentMessage({ userId, sender: "agent", kind: "message", content: reply });
  return NextResponse.json({ reply: saved.content });
}
