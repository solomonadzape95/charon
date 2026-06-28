import { NextRequest, NextResponse } from "next/server";
import { createUser, getUserByEmail, getUserById } from "@/lib/db";

export const runtime = "nodejs";

/**
 * Reader signup / lookup.
 *   POST /api/users { email }   → create (or return existing) reader + link token
 *   GET  /api/users?id=<uuid>   → reader balance/state
 */
export async function POST(req: NextRequest) {
  let body: { email?: string } = {};
  try {
    body = await req.json();
  } catch {
    /* ignore */
  }
  const email = body.email?.trim().toLowerCase();
  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "valid email required" }, { status: 400 });
  }
  const existing = await getUserByEmail(email);
  const user = existing ?? (await createUser(email));
  return NextResponse.json({ user, created: !existing });
}

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const user = await getUserById(id);
  if (!user) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ user });
}
