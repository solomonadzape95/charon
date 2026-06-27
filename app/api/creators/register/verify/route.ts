import { NextRequest } from "next/server";
import { codePresent, fetchProofText } from "@/lib/verify";
import { corsJson, preflight } from "@/lib/cors";
import { getCreatorByClaimToken, getIdentity, markIdentityVerified } from "@/lib/db";
import type { IdentityPlatform } from "@/lib/supabase";

export const runtime = "nodejs";
export const maxDuration = 30;

export function OPTIONS() {
  return preflight();
}

/**
 * Step 2 of self-registration. We fetch the creator's public profile (or proof
 * URL) and confirm the one-time code is present, then flip the identity to verified
 * and promote the wallet to the creator's payout address.
 *   POST { claimToken, platform, handle, proofUrl? }
 *   → { ok, verified, slug, walletAddress, pendingBalanceUsd, claimUrl? }
 */
export async function POST(req: NextRequest) {
  let body: { claimToken?: string; platform?: string; handle?: string; proofUrl?: string } = {};
  try {
    body = await req.json();
  } catch {
    /* ignore */
  }

  if (!body.claimToken || !body.platform || !body.handle) {
    return corsJson({ error: "claimToken, platform and handle required" }, { status: 400 });
  }

  const creator = await getCreatorByClaimToken(body.claimToken);
  if (!creator) return corsJson({ error: "unknown claimToken" }, { status: 404 });

  const platform = body.platform as IdentityPlatform;
  const identity = await getIdentity(platform, body.handle);
  if (!identity || identity.creator_id !== creator.id) {
    return corsJson({ error: "no pending registration for this handle on this account" }, { status: 404 });
  }
  if (identity.verified) {
    return corsJson({ ok: true, verified: true, slug: creator.slug, walletAddress: identity.address });
  }
  if (!identity.verify_code || !identity.address) {
    return corsJson({ error: "registration is missing its code or wallet — restart" }, { status: 400 });
  }

  const text = await fetchProofText({ platform, handle: body.handle, proofUrl: body.proofUrl });
  if (!codePresent(text, identity.verify_code)) {
    return corsJson(
      {
        ok: false,
        verified: false,
        error:
          platform === "x" && !body.proofUrl
            ? "X needs a proofUrl — paste the URL of a public tweet containing your code"
            : "code not found on your profile yet — add it and try again (changes can take a minute to appear)",
      },
      { status: 400 },
    );
  }

  await markIdentityVerified({ creatorId: creator.id, platform, handle: body.handle, address: identity.address });

  const pendingBalanceUsd = Number(creator.balance_usd) || 0;
  return corsJson({
    ok: true,
    verified: true,
    slug: creator.slug,
    walletAddress: identity.address,
    pendingBalanceUsd,
    // If tips were escrowed before they registered, they can sweep them now.
    claimUrl: pendingBalanceUsd > 0 ? `/claim/${creator.claim_token}` : undefined,
  });
}
