import { NextRequest, NextResponse } from "next/server";
import { createCreator, getCreatorByEmail, getCreatorById } from "@/lib/db";

export const runtime = "nodejs";

/**
 * Creator signup / lookup.
 *   POST /api/creators { email, name?, walletAddress? }  → create or return creator
 *   GET  /api/creators?id=<uuid>                          → creator state
 */
export async function POST(req: NextRequest) {
  let body: { email?: string; name?: string; walletAddress?: string } = {};
  try {
    body = await req.json();
  } catch {
    /* ignore */
  }
  const email = body.email?.trim().toLowerCase();
  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "valid email required" }, { status: 400 });
  }
  const existing = await getCreatorByEmail(email);
  const creator =
    existing ??
    (await createCreator({ email, name: body.name ?? null, walletAddress: body.walletAddress ?? null }));
  return NextResponse.json({ creator });
}

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const creator = await getCreatorById(id);
  if (!creator) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ creator });
}
