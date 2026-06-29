import { NextRequest, NextResponse } from "next/server";
import mammoth from "mammoth";
import { sanitizePastedContent } from "@/lib/sanitize-html";

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * Convert an uploaded .docx to clean chapter HTML (mammoth extracts semantic
 * formatting; the sanitizer drops Word's styles).
 *   POST /api/import/docx  (multipart form-data, field "file")
 */
export async function POST(req: NextRequest) {
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "no file provided" }, { status: 400 });
  if (file.size > 12 * 1024 * 1024) return NextResponse.json({ error: ".docx must be under 12MB" }, { status: 400 });

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const { value } = await mammoth.convertToHtml({ buffer });
    return NextResponse.json({ html: sanitizePastedContent(value) });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message || "could not read .docx" }, { status: 400 });
  }
}
