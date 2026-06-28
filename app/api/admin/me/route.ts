import { NextResponse } from "next/server";
import { getAdminEmail } from "@/lib/admin";

export const runtime = "nodejs";

/** Is the current session an admin? Used by the admin UI guard. */
export async function GET() {
  const email = await getAdminEmail();
  return NextResponse.json({ isAdmin: !!email, email });
}
