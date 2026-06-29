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
  const sessionIds = sessions.map((s) => s.id);
  const db = supabaseService();

  const titles: Record<string, { chapter: string; series: string }> = {};
  if (chapterIds.length) {
    const { data: chapters } = await db
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

  // Payment status + on-chain reference per session, so the UI can show whether a
  // charge settled, is still processing, or failed — and link out to verify it.
  const pay: Record<string, { status: string; tx: string | null; ref: string; wallet: string | null }> = {};
  if (sessionIds.length) {
    const { data: payments } = await db
      .from("payments")
      .select("id, session_id, status, arc_tx_hash, creator_id")
      .in("session_id", sessionIds);
    const rows = (payments ?? []) as { id: string; session_id: string | null; status: string; arc_tx_hash: string | null; creator_id: string | null }[];

    // Creator wallets — where the batched on-chain settlements ultimately land.
    const creatorIds = [...new Set(rows.map((r) => r.creator_id).filter(Boolean))] as string[];
    const wallets: Record<string, string | null> = {};
    if (creatorIds.length) {
      const { data: creators } = await db.from("creators").select("id, wallet_address").in("id", creatorIds);
      for (const c of creators ?? []) {
        const row = c as { id: string; wallet_address: string | null };
        wallets[row.id] = row.wallet_address;
      }
    }
    for (const row of rows) {
      if (row.session_id) pay[row.session_id] = { status: row.status, tx: row.arc_tx_hash, ref: row.id, wallet: row.creator_id ? wallets[row.creator_id] ?? null : null };
    }
  }

  return NextResponse.json({
    user,
    sessions: sessions.map((s) => {
      const p = pay[s.id];
      const amount = s.amount_settled_usdc;
      // Derive a clear status: paid · free (re-read / owner / pass) · processing · failed.
      let status: "paid" | "free" | "processing" | "failed" = "free";
      if (p) status = p.status === "settled" ? "paid" : p.status === "pending" ? "processing" : "failed";
      else if (amount != null && Number(amount) > 0) status = "paid";
      return {
        id: s.id,
        created_at: s.created_at,
        amount,
        reasoning: s.agent_reasoning,
        value_score: s.agent_value_score,
        chapterId: s.chapter_id,
        chapter: s.chapter_id ? titles[s.chapter_id]?.chapter : null,
        series: s.chapter_id ? titles[s.chapter_id]?.series : null,
        status,
        tx: p?.tx ?? null,
        ref: p?.ref ?? null,
        creatorWallet: p?.wallet ?? null,
      };
    }),
  });
}
