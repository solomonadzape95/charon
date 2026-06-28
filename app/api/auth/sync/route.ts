import { NextResponse } from "next/server";
import { supabaseServerAuth } from "@/lib/supabase-server";
import { createUser, getUserByEmail, getCreatorByEmail } from "@/lib/db";

export const runtime = "nodejs";

/**
 * Bridge the Supabase auth session to the app's domain rows.
 * Reads the trusted session (cookies), get-or-creates the public.users row by
 * email, and reports whether this email already has a creator profile.
 *   POST /api/auth/sync
 */
export async function POST() {
  const supabase = await supabaseServerAuth();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return NextResponse.json({ error: "not authenticated" }, { status: 401 });

  const email = user.email.trim().toLowerCase();
  const existing = await getUserByEmail(email);
  const appUser = existing ?? (await createUser(email));
  const creator = await getCreatorByEmail(email);

  // Prefer the OAuth display name / handle for the username default.
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const username =
    (meta.user_name as string) || (meta.name as string) || (meta.full_name as string) || email.split("@")[0];

  return NextResponse.json({
    userId: appUser.id,
    email,
    username,
    creatorId: creator?.id ?? null,
    created: !existing,
  });
}
