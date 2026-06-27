import { NextRequest, NextResponse } from "next/server";
import { createSession, getChapterById, getUserById } from "@/lib/db";

export const runtime = "nodejs";

/**
 * Begin a reading session when a chapter opens.
 *   POST /api/session/start { userId, chapterId, bingeDepth }
 * Returns the session id the client reports back on session end.
 */
export async function POST(req: NextRequest) {
  let body: { userId?: string; chapterId?: string; bingeDepth?: number } = {};
  try {
    body = await req.json();
  } catch {
    /* ignore */
  }
  const { userId, chapterId } = body;
  if (!userId || !chapterId) {
    return NextResponse.json({ error: "userId and chapterId required" }, { status: 400 });
  }
  const [user, chapter] = await Promise.all([getUserById(userId), getChapterById(chapterId)]);
  if (!user) return NextResponse.json({ error: "user not found" }, { status: 404 });
  if (!chapter) return NextResponse.json({ error: "chapter not found" }, { status: 404 });

  const bingeDepth = Math.max(1, Math.min(50, Number(body.bingeDepth) || 1));
  const session = await createSession({ userId, chapterId, bingeDepth });
  return NextResponse.json({ sessionId: session.id });
}
