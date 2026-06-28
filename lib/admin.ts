import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { supabaseServerAuth } from "@/lib/supabase-server";

/**
 * Admin access has two paths:
 *  1. Email allowlist — set ADMIN_EMAILS (comma-separated); any Supabase-authed
 *     session with a matching email is an admin.
 *  2. Env credentials — set ADMIN_USERNAME + ADMIN_PASSWORD; the operator signs
 *     in at /admin/login and gets a signed, httpOnly cookie. No Supabase account
 *     needed. This is the "ops admin" login.
 */
const DEFAULTS = ["ejioforcelestine77@gmail.com", "demo-creator@paywithcharon.xyz"];

export const ADMIN_COOKIE = "charon_admin";

export function adminEmails(): string[] {
  const fromEnv = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return [...new Set([...DEFAULTS, ...fromEnv])];
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return adminEmails().includes(email.trim().toLowerCase());
}

// ── env-credential path ────────────────────────────────────
export function envAdminConfigured(): boolean {
  return Boolean(process.env.ADMIN_USERNAME && process.env.ADMIN_PASSWORD);
}

function signingSecret(): string {
  // Prefer a dedicated secret; fall back to the password so the cookie can't be
  // forged without knowing it.
  return process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_PASSWORD || "charon-admin";
}

/** The expected cookie value for the configured admin, or null if env auth is off. */
export function expectedAdminToken(): string | null {
  if (!envAdminConfigured()) return null;
  return createHmac("sha256", signingSecret()).update(`admin:${process.env.ADMIN_USERNAME}`).digest("hex");
}

/** Validate a submitted username/password against the env credentials (timing-safe). */
export function checkAdminCredentials(username: string, password: string): boolean {
  if (!envAdminConfigured()) return false;
  return safeEqual(username, process.env.ADMIN_USERNAME!) && safeEqual(password, process.env.ADMIN_PASSWORD!);
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

/** Mint the signed cookie value for the configured admin. */
export function adminCookieValue(): string {
  const token = expectedAdminToken();
  if (!token) throw new Error("env admin not configured");
  return token;
}

async function hasValidAdminCookie(): Promise<boolean> {
  const expected = expectedAdminToken();
  if (!expected) return false;
  const got = (await cookies()).get(ADMIN_COOKIE)?.value;
  return Boolean(got) && safeEqual(got!, expected);
}

// ── unified resolution ─────────────────────────────────────
/** Returns the admin's email from the trusted Supabase session, or null. */
export async function getAdminEmail(): Promise<string | null> {
  const supabase = await supabaseServerAuth();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const email = user?.email?.toLowerCase() ?? null;
  return isAdminEmail(email) ? email : null;
}

/** Resolve the current admin identity from either path, or null. */
export async function getAdminIdentity(): Promise<{ label: string; via: "email" | "cookie" } | null> {
  const email = await getAdminEmail();
  if (email) return { label: email, via: "email" };
  if (await hasValidAdminCookie()) return { label: process.env.ADMIN_USERNAME ?? "admin", via: "cookie" };
  return null;
}

/** Guard for admin API routes. Returns null when authorized, or a 403 response. */
export async function requireAdmin(): Promise<NextResponse | null> {
  const identity = await getAdminIdentity();
  if (!identity) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  return null;
}
