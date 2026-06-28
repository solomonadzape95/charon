import { NextResponse } from "next/server";
import { getAdminIdentity, envAdminConfigured } from "@/lib/admin";

export const runtime = "nodejs";

/** Is the current session an admin? Used by the admin UI guard. */
export async function GET() {
  const identity = await getAdminIdentity();
  return NextResponse.json({
    isAdmin: !!identity,
    email: identity?.label ?? null,
    via: identity?.via ?? null,
    envLogin: envAdminConfigured(),
  });
}
