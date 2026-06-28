import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { supabaseService } from "@/lib/supabase";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const status = req.nextUrl.searchParams.get("status"); // settled | pending | failed
  const limit = Math.min(200, Number(req.nextUrl.searchParams.get("limit")) || 60);
  const db = supabaseService();

  let q = db
    .from("payments")
    .select("id, amount_usdc, status, arc_tx_hash, created_at, creator_id, chapter_id")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (status === "settled" || status === "pending" || status === "failed") q = q.eq("status", status);

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const rows = (data ?? []) as Record<string, unknown>[];

  const creatorIds = [...new Set(rows.map((r) => r.creator_id as string).filter(Boolean))];
  const chapterIds = [...new Set(rows.map((r) => r.chapter_id as string).filter(Boolean))];
  const [{ data: creators }, { data: chapters }] = await Promise.all([
    creatorIds.length ? db.from("creators").select("id, name").in("id", creatorIds) : Promise.resolve({ data: [] }),
    chapterIds.length ? db.from("chapters").select("id, title, chapter_number").in("id", chapterIds) : Promise.resolve({ data: [] }),
  ]);
  const cName = new Map((creators ?? []).map((c) => [(c as { id: string }).id, (c as { name: string | null }).name]));
  const chTitle = new Map(
    (chapters ?? []).map((c) => {
      const r = c as { id: string; title: string | null; chapter_number: number };
      return [r.id, r.title ?? `Chapter ${r.chapter_number}`];
    }),
  );

  return NextResponse.json({
    payments: rows.map((r) => ({
      id: r.id,
      amount: Number(r.amount_usdc),
      status: r.status,
      tx: r.arc_tx_hash,
      created_at: r.created_at,
      creator: cName.get(r.creator_id as string) ?? null,
      chapter: chTitle.get(r.chapter_id as string) ?? null,
    })),
  });
}
