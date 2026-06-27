import { NextRequest, NextResponse } from "next/server";
import { listSessionsForUser, getUserById } from "@/lib/db";
import { supabaseService } from "@/lib/supabase";

export const runtime = "nodejs";

/**
 * A reader's recent reading sessions, enriched with chapter + series titles.
 *   GET /api/me/sessions?userId=<uuid>
 */
export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId");
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

  const user = await getUserById(userId);
  if (!user) return NextResponse.json({ error: "not found" }, { status: 404 });

  const sessions = await listSessionsForUser(userId, 50);
  const chapterIds = [...new Set(sessions.map((s) => s.chapter_id).filter(Boolean))] as string[];

  const titles: Record<string, { chapter: string; series: string }> = {};
  if (chapterIds.length) {
    const { data: chapters } = await supabaseService()
      .from("chapters")
      .select("id, title, chapter_number, series ( title )")
      .in("id", chapterIds);
    for (const c of chapters ?? []) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const row = c as any;
      titles[row.id] = {
        chapter: row.title ?? `Chapter ${row.chapter_number}`,
        series: row.series?.title ?? "",
      };
    }
  }

  return NextResponse.json({
    user,
    sessions: sessions.map((s) => ({
      id: s.id,
      created_at: s.created_at,
      amount: s.amount_settled_usdc,
      reasoning: s.agent_reasoning,
      value_score: s.agent_value_score,
      chapter: s.chapter_id ? titles[s.chapter_id]?.chapter : null,
      series: s.chapter_id ? titles[s.chapter_id]?.series : null,
    })),
  });
}
