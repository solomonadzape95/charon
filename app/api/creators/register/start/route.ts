import { NextRequest } from "next/server";
import { canonicalHandle, detectPlatform } from "@/lib/identity";
import { buildVerifyCode, placementHint } from "@/lib/verify";
import { corsJson, preflight } from "@/lib/cors";
import {
  createCreator,
  getCreatorById,
  getIdentity,
  setCreatorProfile,
  uniqueSlug,
  upsertRegistrationIdentity,
} from "@/lib/db";
import type { IdentityPlatform } from "@/lib/supabase";

export const runtime = "nodejs";

export function OPTIONS() {
  return preflight();
}

/**
 * Step 1 of self-registration. Creator submits their profile URL + payout wallet;
 * we return a one-time code to place on that profile and a claimToken to verify with.
 *   POST { platformUrl, walletAddress, name?, email?, bio? }
 *   → { creatorId, slug, claimToken, platform, handle, code, instructions, proofRequired }
 */
export async function POST(req: NextRequest) {
  let body: {
    platformUrl?: string;
    walletAddress?: string;
    name?: string;
    email?: string;
    bio?: string;
  } = {};
  try {
    body = await req.json();
  } catch {
    /* ignore */
  }

  const walletAddress = body.walletAddress?.trim();
  if (!walletAddress || !/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
    return corsJson({ error: "valid 0x walletAddress required" }, { status: 400 });
  }
  if (!body.platformUrl) {
    return corsJson({ error: "platformUrl required (your X / YouTube / Substack / GitHub profile)" }, { status: 400 });
  }

  const platform = detectPlatform(body.platformUrl) as IdentityPlatform;
  const handle = canonicalHandle(body.platformUrl, platform);
  if (!handle) {
    return corsJson(
      { error: "unsupported profile URL — use a public X, YouTube, Substack, GitHub, or Mirror profile URL" },
      { status: 400 },
    );
  }

  // Guard against hijacking an already-verified handle.
  const existing = await getIdentity(platform, handle);
  if (existing?.verified) {
    return corsJson({ error: `${platform}:${handle} is already registered and verified` }, { status: 409 });
  }

  // Reuse the creator behind a pending registration; otherwise create one.
  let creatorId = existing?.creator_id;
  if (!creatorId) {
    const creator = await createCreator({ name: body.name, email: body.email, bio: body.bio });
    creatorId = creator.id;
  } else if (body.name || body.email || body.bio) {
    await setCreatorProfile(creatorId, {
      ...(body.name ? { name: body.name } : {}),
      ...(body.email ? { email: body.email } : {}),
      ...(body.bio ? { bio: body.bio } : {}),
    });
  }

  const creator = (await getCreatorById(creatorId))!;
  if (!creator.slug) {
    const slug = await uniqueSlug(body.name || handle);
    await setCreatorProfile(creatorId, { slug });
    creator.slug = slug;
  }

  const code = buildVerifyCode();
  await upsertRegistrationIdentity({ creatorId, platform, handle, address: walletAddress, code });

  return corsJson({
    creatorId,
    slug: creator.slug,
    claimToken: creator.claim_token,
    platform,
    handle,
    code,
    instructions: placementHint(platform, code),
    proofRequired: platform === "x", // X needs a posted-tweet proof URL
  });
}
