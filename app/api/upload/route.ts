import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
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

  // Optimize: manga panels → 800px wide (Webtoon spec), covers → 900px, both JPEG
  // q88. Never upscale. If Sharp can't process it (e.g. animated/exotic), keep it.
  const original = Buffer.from(await file.arrayBuffer());
  let buffer: Uint8Array = original;
  let contentType = file.type;
  let ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  try {
    const width = folder.startsWith("chapters") ? 800 : 900;
    buffer = await sharp(original).rotate().resize(width, null, { withoutEnlargement: true }).jpeg({ quality: 88 }).toBuffer();
    contentType = "image/jpeg";
    ext = "jpg";
  } catch {
    /* keep the original buffer */
  }

  const path = `${folder}/${randomUUID()}.${ext}`;
  const db = supabaseService();
  const { error } = await db.storage.from(BUCKET).upload(path, buffer, { contentType, upsert: false });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  const { data } = db.storage.from(BUCKET).getPublicUrl(path);
  return NextResponse.json({ url: data.publicUrl, path });
}
