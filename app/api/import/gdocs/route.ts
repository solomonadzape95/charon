import { NextRequest, NextResponse } from "next/server";
import { sanitizePastedContent } from "@/lib/sanitize-html";

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * Import a public Google Doc by its share link. Uses the export endpoint, which
 * works on "anyone with link can view" docs without OAuth.
 *   POST /api/import/gdocs { url }
 */
export async function POST(req: NextRequest) {
  let body: { url?: string } = {};
  try {
    body = await req.json();
  } catch {
    /* ignore */
  }
  const id = (body.url ?? "").match(/\/document\/d\/([a-zA-Z0-9_-]+)/)?.[1];
  if (!id) return NextResponse.json({ error: "paste a valid Google Docs link" }, { status: 400 });

  try {
    const res = await fetch(`https://docs.google.com/document/d/${id}/export?format=html`, { redirect: "follow" });
    if (!res.ok) {
      return NextResponse.json(
        { error: "couldn't fetch — set the doc to “Anyone with the link can view”" },
        { status: 400 },
      );
    }
    const html = await res.text();
    // The export wraps content in <body>…</body>; take that, then clean.
    const inner = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i)?.[1] ?? html;
    return NextResponse.json({ html: sanitizePastedContent(inner) });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message || "import failed" }, { status: 400 });
  }
}
