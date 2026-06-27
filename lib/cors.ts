import { NextResponse } from "next/server";

/**
 * Permissive CORS for the public tip/registry endpoints so the browser extension
 * (and creator pages on other origins) can call them. These endpoints are already
 * scoped by userId / claimToken, so wildcard origin is acceptable here.
 */
export const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Max-Age": "86400",
};

/** JSON response with CORS headers attached. */
export function corsJson(body: unknown, init?: { status?: number }): NextResponse {
  return NextResponse.json(body, { status: init?.status ?? 200, headers: CORS_HEADERS });
}

/** Standard preflight handler — export as `OPTIONS` from a route. */
export function preflight(): NextResponse {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}
