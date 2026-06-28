import { NextResponse } from "next/server";
import { supabaseServerAuth } from "@/lib/supabase-server";

/**
 * Admin allowlist. Set ADMIN_EMAILS (comma-separated) in the environment.
 * A couple of sensible defaults are included so the section is reachable in dev.
 */
const DEFAULTS = ["ejioforcelestine77@gmail.com", "demo-creator@paywithcharon.xyz"];

export function adminEmails(): string[] {
  const fromEnv = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return [...new Set([...DEFAULTS, ...fromEnv])];
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return adminEmails().includes(email.trim().toLowerCase());
}

/** Returns the admin's email from the trusted session, or null. */
export async function getAdminEmail(): Promise<string | null> {
  const supabase = await supabaseServerAuth();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const email = user?.email?.toLowerCase() ?? null;
  return isAdminEmail(email) ? email : null;
}

/** Guard for admin API routes. Returns null when authorized, or a 403 response. */
export async function requireAdmin(): Promise<NextResponse | null> {
  const email = await getAdminEmail();
  if (!email) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  return null;
}
