import { NextRequest, NextResponse } from "next/server";
import { claimCreatorByToken, getCreatorByClaimToken } from "@/lib/db";
import { supabaseServerAuth } from "@/lib/supabase-server";

export const runtime = "nodejs";

/**
 * Look up a claimable creator profile by its claim token (for the claim page).
 *   GET /api/creator/claim?token=<token>
 */
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) return NextResponse.json({ error: "token required" }, { status: 400 });
  const creator = await getCreatorByClaimToken(token);
  if (!creator) return NextResponse.json({ error: "invalid claim link" }, { status: 404 });
  return NextResponse.json({
    creator: {
      id: creator.id,
      name: creator.name,
      slug: creator.slug,
      bio: creator.bio,
      claimed: creator.claimed,
      // surfaced so the UI can warn if it's bound to a different email
      boundEmail: creator.email,
    },
  });
}

/**
 * Claim a creator profile: bind it to the signed-in email. Requires an
 * authenticated session — the email comes from the trusted session, not the body.
 *   POST /api/creator/claim { token }
 */
export async function POST(req: NextRequest) {
  let body: { token?: string } = {};
  try {
    body = await req.json();
  } catch {
    /* ignore */
  }
  const { token } = body;
  if (!token) return NextResponse.json({ error: "token required" }, { status: 400 });

  const supabase = await supabaseServerAuth();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) {
    return NextResponse.json({ error: "sign in to claim this profile" }, { status: 401 });
  }

  const result = await claimCreatorByToken(token, user.email);
  if (!result.ok) return NextResponse.json({ error: result.reason }, { status: 409 });
  return NextResponse.json({
    ok: true,
    creatorId: result.creator!.id,
    alreadyYours: result.alreadyYours ?? false,
  });
}
