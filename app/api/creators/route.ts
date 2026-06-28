import { NextRequest, NextResponse } from "next/server";
import { createCreator, getCreatorByEmail, getCreatorById } from "@/lib/db";
import { supabaseService } from "@/lib/supabase";

export const runtime = "nodejs";

/**
 * Creator signup / lookup / profile + payout update.
 *   POST  /api/creators { email, name?, walletAddress? }  → create or return creator
 *   GET   /api/creators?id=<uuid>                          → creator state
 *   PATCH /api/creators { id, name?, bio?, walletAddress?, payoutPreference? }
 */
export async function PATCH(req: NextRequest) {
  let body: {
    id?: string;
    name?: string;
    bio?: string;
    walletAddress?: string;
    payoutPreference?: "usdc_wallet" | "bank";
  } = {};
  try {
    body = await req.json();
  } catch {
    /* ignore */
  }
  const { id } = body;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  if (body.walletAddress && !/^0x[a-fA-F0-9]{40}$/.test(body.walletAddress)) {
    return NextResponse.json({ error: "valid 0x walletAddress required" }, { status: 400 });
  }
  const creator = await getCreatorById(id);
  if (!creator) return NextResponse.json({ error: "not found" }, { status: 404 });

  const patch: Record<string, unknown> = {};
  if (body.name != null) patch.name = body.name;
  if (body.bio != null) patch.bio = body.bio;
  if (body.walletAddress) patch.wallet_address = body.walletAddress;
  if (body.payoutPreference) patch.payout_preference = body.payoutPreference;
  if (Object.keys(patch).length) await supabaseService().from("creators").update(patch).eq("id", id);

  return NextResponse.json({ creator: { ...creator, ...patch } });
}
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
  return NextResponse.json({ creator, created: !existing });
}

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  const email = req.nextUrl.searchParams.get("email")?.trim().toLowerCase();
  if (!id && !email) return NextResponse.json({ error: "id or email required" }, { status: 400 });
  const creator = id ? await getCreatorById(id) : await getCreatorByEmail(email!);
  if (!creator) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ creator });
}
