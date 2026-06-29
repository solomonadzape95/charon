import { NextRequest, NextResponse } from "next/server";
import { listAgentMessages } from "@/lib/db";

export const runtime = "nodejs";

/** The agent's chat + activity feed. GET /api/agent/feed?userId=<uuid> */
export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId");
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });
  const messages = await listAgentMessages(userId, 80);
  return NextResponse.json({
    messages: messages.map((m) => ({
      id: m.id,
      created_at: m.created_at,
      sender: m.sender,
      kind: m.kind,
      content: m.content,
      seriesId: m.series_id,
      chapterId: m.chapter_id,
      amount: m.amount_usdc != null ? Number(m.amount_usdc) : null,
      ref: m.payment_ref,
    })),
  });
}
