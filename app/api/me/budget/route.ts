import { NextRequest, NextResponse } from "next/server";
import { getUserById, listFollowsForUser } from "@/lib/db";
import { supabaseService } from "@/lib/supabase";
import { adviseBudget, readingPattern, type SeriesReadStat } from "@/lib/agents/budget";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Agent 4 — live budget advice for a reader.
 *   GET /api/me/budget?userId=<uuid>
 * Returns reading pace, low-balance flag, top-up suggestion, and mode-switch tips.
 */
export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId");
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });
  const user = await getUserById(userId);
  if (!user) return NextResponse.json({ error: "not found" }, { status: 404 });

  const now = Date.now();
  const db = supabaseService();

  // Recent settled sessions, with chapter release + series title for pace + mode signals.
  const { data: rows } = await db
    .from("sessions")
    .select("created_at, amount_settled_usdc, chapters ( public_release_at, series_id, series ( id, title ) )")
    .eq("user_id", userId)
    .not("amount_settled_usdc", "is", null)
    .order("created_at", { ascending: false })
    .limit(200);

  const sessions = (rows ?? []).map((r) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const x = r as any;
    return {
      created_at: x.created_at as string,
      amount: Number(x.amount_settled_usdc) || 0,
      releaseAt: x.chapters?.public_release_at as string | undefined,
      seriesId: x.chapters?.series?.id as string | undefined,
      seriesTitle: (x.chapters?.series?.title as string | undefined) ?? "",
    };
  });

  const pattern = readingPattern(
    sessions.map((s) => ({ created_at: s.created_at, amount: s.amount })),
    Number(user.balance_usd),
    now,
  );

  // Per-series read stats + how often the reader opens chapters soon after release.
  const follows = await listFollowsForUser(userId);
  const modeBySeries = new Map(follows.map((f) => [f.series_id, f.mode]));
  const stats = new Map<string, SeriesReadStat>();
  for (const s of sessions) {
    if (!s.seriesId) continue;
    const cur =
      stats.get(s.seriesId) ??
      { seriesId: s.seriesId, seriesTitle: s.seriesTitle, reads: 0, fastReadsAfterRelease: 0, mode: modeBySeries.get(s.seriesId) ?? "standard" };
    cur.reads += 1;
    if (s.releaseAt && new Date(s.created_at).getTime() - new Date(s.releaseAt).getTime() < 3_600_000) {
      cur.fastReadsAfterRelease += 1;
    }
    stats.set(s.seriesId, cur);
  }

  const advice = await adviseBudget({
    balance: Number(user.balance_usd),
    pattern,
    seriesStats: [...stats.values()],
  });

  return NextResponse.json({ balance: Number(user.balance_usd), ...advice, pattern });
}
