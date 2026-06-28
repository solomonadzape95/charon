import { NextResponse } from "next/server";
import { ADMIN_COOKIE } from "@/lib/admin";

export const runtime = "nodejs";

/** Clear the ops-admin cookie. POST /api/admin/logout */
export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
  return res;
}
