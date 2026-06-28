import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE, adminCookieValue, checkAdminCredentials, envAdminConfigured } from "@/lib/admin";

export const runtime = "nodejs";

/**
 * Ops-admin login with the ADMIN_USERNAME / ADMIN_PASSWORD env credentials.
 * On success, sets a signed httpOnly cookie that requireAdmin() trusts.
 *   POST /api/admin/login { username, password }
 */
export async function POST(req: NextRequest) {
  if (!envAdminConfigured()) {
    return NextResponse.json({ error: "env admin login is not configured" }, { status: 501 });
  }
  let body: { username?: string; password?: string } = {};
  try {
    body = await req.json();
  } catch {
    /* ignore */
  }
  if (!checkAdminCredentials(body.username ?? "", body.password ?? "")) {
    return NextResponse.json({ error: "invalid credentials" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, adminCookieValue(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12, // 12h session
  });
  return res;
}
