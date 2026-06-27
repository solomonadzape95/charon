import { NextRequest, NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase";

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * Agent 4 — daily budget pass. Surfaces low-balance readers for proactive nudges.
 * (Per-reader advice is computed live by /api/me/budget; this is the scheduled sweep.)
 *   GET /api/cron/budget   (Vercel Cron sends Authorization: Bearer $CRON_SECRET)
 */
export async function GET(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  // Readers with a non-trivial balance that may be running low — candidates for a nudge.
  const { data: lowBalance } = await supabaseService()
    .from("users")
    .select("id, email, balance_usd")
    .lt("balance_usd", 0.5);

  return NextResponse.json({ ok: true, lowBalanceReaders: lowBalance?.length ?? 0 });
}

function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  const header = req.headers.get("authorization");
  if (header === `Bearer ${secret}`) return true;
  return req.nextUrl.searchParams.get("key") === secret;
}
