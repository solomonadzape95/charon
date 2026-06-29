import { NextRequest, NextResponse } from "next/server";
import { listActiveAgentUserIds } from "@/lib/db";
import { runAgent } from "@/lib/agents/reader-agent";

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * Scheduled fleet run — every active reader agent reads + pays autonomously.
 *   GET /api/cron/agent           (Vercel Cron: Authorization: Bearer $CRON_SECRET)
 *   GET /api/cron/agent?key=...   (manual trigger)
 */
export async function GET(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const userIds = await listActiveAgentUserIds(200);
  const runs: { userId: string; chaptersRead: number; spent: number }[] = [];
  // Sequential to stay within model rate limits and keep settlement ordering clean.
  for (const userId of userIds) {
    try {
      const r = await runAgent(userId);
      runs.push({ userId, chaptersRead: r.chaptersRead, spent: r.spent });
    } catch (e) {
      console.warn("[charon] agent run failed for", userId, (e as Error).message);
    }
  }
  const totalChapters = runs.reduce((s, r) => s + r.chaptersRead, 0);
  const totalSpent = runs.reduce((s, r) => s + r.spent, 0);
  return NextResponse.json({ agents: userIds.length, totalChapters, totalSpent, runs });
}

function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  const header = req.headers.get("authorization");
  if (header === `Bearer ${secret}`) return true;
  return req.nextUrl.searchParams.get("key") === secret;
}
