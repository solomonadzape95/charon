import { NextResponse } from "next/server";
import { supabaseServerAuth } from "@/lib/supabase-server";

export const runtime = "nodejs";

/** OAuth / magic-link return — exchange the code for a session cookie. */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await supabaseServerAuth();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${next}`);
  }
  return NextResponse.redirect(`${origin}/join?error=auth`);
}
