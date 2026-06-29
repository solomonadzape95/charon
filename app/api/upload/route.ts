import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { supabaseService } from "@/lib/supabase";

export const runtime = "nodejs";
export const maxDuration = 30;

const BUCKET = "covers";
const MAX_BYTES = 8 * 1024 * 1024; // 8MB

/**
 * Upload an image to the `covers` Supabase Storage bucket and return its public
 * URL. Uses the service-role client, so it works regardless of bucket RLS — the
 * bucket only needs to be public for the returned URL to be readable.
 *   POST /api/upload?folder=covers   (multipart form-data, field "file")
 */
export async function POST(req: NextRequest) {
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "no file provided" }, { status: 400 });
  }
  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "only image files are allowed" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "image must be under 8MB" }, { status: 400 });
  }

  const folder = (req.nextUrl.searchParams.get("folder") || "uploads").replace(/[^a-z0-9/_-]/gi, "") || "uploads";
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  const path = `${folder}/${randomUUID()}.${ext}`;

  const buffer = Buffer.from(await file.arrayBuffer());
  const db = supabaseService();
  const { error } = await db.storage.from(BUCKET).upload(path, buffer, {
    contentType: file.type,
    upsert: false,
  });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  const { data } = db.storage.from(BUCKET).getPublicUrl(path);
  return NextResponse.json({ url: data.publicUrl, path });
}
