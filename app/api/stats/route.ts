import { NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase";

export const runtime = "nodejs";

/**
 * Global live stats for the public stats page.
 *   GET /api/stats → chapters read, USDC settled on Arc, creators earning, top earners
 */
export async function GET() {
  const db = supabaseService();
  const [
    { data: payments },
    { count: creatorCount },
    { count: userCount },
    { count: seriesCount },
    { count: chapterCount },
    { data: topCreators },
    { data: recentSessions },
  ] = await Promise.all([
    db.from("payments").select("amount_usdc, status, creator_id, created_at"),
    db.from("creators").select("*", { count: "exact", head: true }),
    db.from("users").select("*", { count: "exact", head: true }),
    db.from("series").select("*", { count: "exact", head: true }),
    db.from("chapters").select("*", { count: "exact", head: true }),
    db.from("creators").select("name, slug, total_earned_usdc").order("total_earned_usdc", { ascending: false }).limit(8),
    db
      .from("sessions")
      .select("agent_reasoning, amount_settled_usdc, created_at")
      .not("amount_settled_usdc", "is", null)
      .order("created_at", { ascending: false })
      .limit(12),
  ]);

  const p = payments ?? [];
  const settled = p.filter((x) => x.status === "settled");
  const totalUsdc = settled.reduce((s, x) => s + Number(x.amount_usdc), 0);
  const earningCreators = new Set(settled.map((x) => x.creator_id).filter(Boolean));

  return NextResponse.json({
    chaptersRead: settled.length,
    totalUsdc,
    creators: creatorCount ?? 0,
    earningCreators: earningCreators.size,
    readers: userCount ?? 0,
    series: seriesCount ?? 0,
    chapters: chapterCount ?? 0,
    topCreators: (topCreators ?? []).map((c) => ({
      name: c.name,
      slug: c.slug,
      earned: Number(c.total_earned_usdc),
    })),
    recent: (recentSessions ?? []).map((s) => ({
      reasoning: s.agent_reasoning,
      amount: Number(s.amount_settled_usdc),
      created_at: s.created_at,
    })),
  }, { headers: { "Cache-Control": "public, max-age=10, stale-while-revalidate=60" } });
}
