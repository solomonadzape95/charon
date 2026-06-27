import { NextRequest, NextResponse } from "next/server";
import { getUserById } from "@/lib/db";
import { supabaseService } from "@/lib/supabase";

export const runtime = "nodejs";

/**
 * A reader's library — series they follow + series they've read.
 *   GET /api/me/library?userId=<uuid>
 */
export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId");
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });
  const user = await getUserById(userId);
  if (!user) return NextResponse.json({ error: "not found" }, { status: 404 });
  const db = supabaseService();

  const { data: follows } = await db
    .from("follows")
    .select("mode, series ( id, title, genre, status )")
    .eq("user_id", userId);

  const { data: sessions } = await db
    .from("sessions")
    .select("created_at, chapters ( series ( id, title ) )")
    .eq("user_id", userId)
    .not("ended_at", "is", null)
    .order("created_at", { ascending: false })
    .limit(200);

  // Group reading history by series.
  const hist = new Map<string, { id: string; title: string; chaptersRead: number; lastReadAt: string }>();
  for (const s of sessions ?? []) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ser = (s as any).chapters?.series;
    if (!ser?.id) continue;
    const cur = hist.get(ser.id) ?? { id: ser.id, title: ser.title, chaptersRead: 0, lastReadAt: (s as { created_at: string }).created_at };
    cur.chaptersRead += 1;
    hist.set(ser.id, cur);
  }

  return NextResponse.json({
    follows: (follows ?? []).map((f) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ser = (f as any).series;
      return { id: ser?.id, title: ser?.title, genre: ser?.genre, status: ser?.status, mode: (f as { mode: string }).mode };
    }).filter((f) => f.id),
    history: [...hist.values()],
  });
}
