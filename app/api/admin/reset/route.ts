import { NextRequest, NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase";

export const runtime = "nodejs";

/**
 * Dev-only: delete specific demo accounts (by email) so `npm run seed` is
 * idempotent. Cascades remove their series/chapters/sessions. Guarded by
 * CRON_SECRET when set.
 *   POST /api/admin/reset { emails: string[] }
 */
export async function POST(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  let body: { emails?: string[] } = {};
  try {
    body = await req.json();
  } catch {
    /* ignore */
  }
  const emails = (body.emails ?? []).map((e) => e.trim().toLowerCase()).filter(Boolean);
  if (!emails.length) return NextResponse.json({ error: "emails[] required" }, { status: 400 });

  const db = supabaseService();
  await db.from("creators").delete().in("email", emails); // cascades series → chapters
  await db.from("users").delete().in("email", emails); // cascades sessions/ledger/follows/loyalty
  return NextResponse.json({ ok: true, cleared: emails });
}

function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  const header = req.headers.get("authorization");
  if (header === `Bearer ${secret}`) return true;
  return req.nextUrl.searchParams.get("key") === secret;
}
