/**
 * Data layer for Charon v2. All writes go through the service-role client.
 */
import { randomUUID } from "node:crypto";
import {
  supabaseService,
  type Creator,
  type CreatorIdentity,
  type IdentityPlatform,
  type PendingTip,
  type Tip,
  type TipStatus,
  type User,
} from "@/lib/supabase";

// ── users (readers) ────────────────────────────────────────
export async function getUserById(id: string): Promise<User | null> {
  const { data } = await supabaseService().from("users").select("*").eq("id", id).maybeSingle();
  return (data as User) ?? null;
}

export async function getUserByTelegramId(telegramId: string): Promise<User | null> {
  const { data } = await supabaseService()
    .from("users")
    .select("*")
    .eq("telegram_id", telegramId)
    .maybeSingle();
  return (data as User) ?? null;
}

export async function getUserByEmail(email: string): Promise<User | null> {
  const { data } = await supabaseService().from("users").select("*").eq("email", email).maybeSingle();
  return (data as User) ?? null;
}

export async function getUserByLinkToken(token: string): Promise<User | null> {
  const { data } = await supabaseService()
    .from("users")
    .select("*")
    .eq("link_token", token)
    .maybeSingle();
  return (data as User) ?? null;
}

/** Create a reader (dashboard signup) with a fresh one-time Telegram link token. */
export async function createUser(email: string): Promise<User> {
  const { data, error } = await supabaseService()
    .from("users")
    .insert({ email, link_token: randomUUID() })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as User;
}

export async function linkTelegram(linkToken: string, telegramId: string): Promise<User | null> {
  const { data, error } = await supabaseService()
    .from("users")
    .update({ telegram_id: telegramId, link_token: null })
    .eq("link_token", linkToken)
    .select()
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as User) ?? null;
}

// ── creators + identity graph ──────────────────────────────
export async function getCreatorById(id: string): Promise<Creator | null> {
  const { data } = await supabaseService().from("creators").select("*").eq("id", id).maybeSingle();
  return (data as Creator) ?? null;
}

export async function getCreatorByClaimToken(token: string): Promise<Creator | null> {
  const { data } = await supabaseService()
    .from("creators")
    .select("*")
    .eq("claim_token", token)
    .maybeSingle();
  return (data as Creator) ?? null;
}

/**
 * Resolve the canonical creator for a set of identity signals, or create one.
 * Looks for an existing identity row matching any (platform, handle) pair;
 * if found, returns that creator. Otherwise creates a creator + identity rows.
 */
export async function upsertCreatorByIdentities(args: {
  name?: string | null;
  email?: string | null;
  walletAddress?: string | null;
  identities: { platform: IdentityPlatform; handle: string; address?: string | null; confidence: number }[];
}): Promise<Creator> {
  const db = supabaseService();

  // 1. Try to find an existing creator via any identity (platform, handle).
  for (const id of args.identities) {
    const { data: match } = await db
      .from("creator_identities")
      .select("creator_id")
      .eq("platform", id.platform)
      .eq("handle", id.handle)
      .maybeSingle();
    if (match?.creator_id) {
      await attachIdentities(match.creator_id, args.identities);
      if (args.walletAddress) await setCreatorWallet(match.creator_id, args.walletAddress);
      return (await getCreatorById(match.creator_id))!;
    }
  }

  // 2. None matched — create a fresh creator.
  const { data: creator, error } = await db
    .from("creators")
    .insert({
      name: args.name ?? null,
      email: args.email ?? null,
      wallet_address: args.walletAddress ?? null,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  await attachIdentities((creator as Creator).id, args.identities);
  return creator as Creator;
}

export async function attachIdentities(
  creatorId: string,
  identities: { platform: IdentityPlatform; handle: string; address?: string | null; confidence: number }[],
): Promise<void> {
  if (!identities.length) return;
  await supabaseService()
    .from("creator_identities")
    .upsert(
      identities.map((i) => ({
        creator_id: creatorId,
        platform: i.platform,
        handle: i.handle,
        address: i.address ?? null,
        confidence: i.confidence,
      })),
      { onConflict: "platform,handle", ignoreDuplicates: false },
    );
}

export async function listCreatorIdentities(creatorId: string): Promise<CreatorIdentity[]> {
  const { data } = await supabaseService()
    .from("creator_identities")
    .select("*")
    .eq("creator_id", creatorId);
  return (data as CreatorIdentity[]) ?? [];
}

/**
 * Registry read: return the ownership-verified identity row for a (platform, handle),
 * if any. This is what lets the agent route directly to a self-registered web2
 * creator instead of guessing a wallet on-chain.
 */
export async function lookupVerifiedIdentity(
  platform: IdentityPlatform,
  handle: string,
): Promise<CreatorIdentity | null> {
  const { data } = await supabaseService()
    .from("creator_identities")
    .select("*")
    .eq("platform", platform)
    .eq("handle", handle)
    .eq("verified", true)
    .maybeSingle();
  return (data as CreatorIdentity) ?? null;
}

export async function setCreatorWallet(creatorId: string, walletAddress: string): Promise<void> {
  await supabaseService().from("creators").update({ wallet_address: walletAddress }).eq("id", creatorId);
}

// ── creator registry (self-registration + bio-code verification) ───────────
export async function createCreator(fields: {
  name?: string | null;
  email?: string | null;
  walletAddress?: string | null;
  bio?: string | null;
}): Promise<Creator> {
  const { data, error } = await supabaseService()
    .from("creators")
    .insert({
      name: fields.name ?? null,
      email: fields.email ?? null,
      wallet_address: fields.walletAddress ?? null,
      bio: fields.bio ?? null,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as Creator;
}

export async function getCreatorBySlug(slug: string): Promise<Creator | null> {
  const { data } = await supabaseService().from("creators").select("*").eq("slug", slug).maybeSingle();
  return (data as Creator) ?? null;
}

/** Any identity row for (platform, handle), regardless of verified state. */
export async function getIdentity(
  platform: IdentityPlatform,
  handle: string,
): Promise<CreatorIdentity | null> {
  const { data } = await supabaseService()
    .from("creator_identities")
    .select("*")
    .eq("platform", platform)
    .eq("handle", handle)
    .maybeSingle();
  return (data as CreatorIdentity) ?? null;
}

export async function setCreatorProfile(
  creatorId: string,
  patch: Partial<Pick<Creator, "slug" | "bio" | "name" | "email">>,
): Promise<void> {
  await supabaseService().from("creators").update(patch).eq("id", creatorId);
}

/** Pick an available slug derived from a base string. */
export async function uniqueSlug(base: string): Promise<string> {
  const root = (base || "creator").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 32) || "creator";
  for (let i = 0; i < 50; i++) {
    const candidate = i === 0 ? root : `${root}-${i + 1}`;
    if (!(await getCreatorBySlug(candidate))) return candidate;
  }
  return `${root}-${randomUUID().slice(0, 6)}`;
}

/** Write/refresh the pending (unverified) registration row with its bio code. */
export async function upsertRegistrationIdentity(args: {
  creatorId: string;
  platform: IdentityPlatform;
  handle: string;
  address: string;
  code: string;
}): Promise<void> {
  await supabaseService()
    .from("creator_identities")
    .upsert(
      {
        creator_id: args.creatorId,
        platform: args.platform,
        handle: args.handle,
        address: args.address,
        confidence: 99,
        verified: false,
        verify_code: args.code,
      },
      { onConflict: "platform,handle", ignoreDuplicates: false },
    );
}

/** Flip a pending registration to verified and promote it to the creator's payout wallet. */
export async function markIdentityVerified(args: {
  creatorId: string;
  platform: IdentityPlatform;
  handle: string;
  address: string;
}): Promise<void> {
  const db = supabaseService();
  await db
    .from("creator_identities")
    .update({ verified: true, verify_code: null })
    .eq("platform", args.platform)
    .eq("handle", args.handle);
  await db
    .from("creators")
    .update({ registered: true, wallet_address: args.address })
    .eq("id", args.creatorId);
}

export async function setCreatorCircleWallet(
  creatorId: string,
  circleWalletId: string,
  circleWalletAddress: string,
): Promise<void> {
  await supabaseService()
    .from("creators")
    .update({ circle_wallet_id: circleWalletId, circle_wallet_address: circleWalletAddress })
    .eq("id", creatorId);
}

export async function adjustCreatorBalance(creatorId: string, deltaUsd: number): Promise<void> {
  const c = await getCreatorById(creatorId);
  if (!c) return;
  await supabaseService()
    .from("creators")
    .update({ balance_usd: Number(c.balance_usd) + deltaUsd })
    .eq("id", creatorId);
}

export async function markCreatorClaimed(creatorId: string): Promise<void> {
  await supabaseService()
    .from("creators")
    .update({ claimed: true, balance_usd: 0 })
    .eq("id", creatorId);
}

// ── tips ───────────────────────────────────────────────────
export async function createTip(input: {
  userId: string | null;
  creatorId: string | null;
  url: string;
  platform?: string | null;
  amountUsd: number;
  status?: TipStatus;
  confidence?: number | null;
  agentReasoning?: string | null;
}): Promise<Tip> {
  const { data, error } = await supabaseService()
    .from("tips")
    .insert({
      user_id: input.userId,
      creator_id: input.creatorId,
      url: input.url,
      platform: input.platform ?? null,
      amount_usd: input.amountUsd,
      status: input.status ?? "pending_confirmation",
      confidence: input.confidence ?? null,
      agent_reasoning: input.agentReasoning ?? null,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as Tip;
}

export async function updateTip(
  id: string,
  patch: Partial<Pick<Tip, "status" | "tx_hash" | "creator_id" | "amount_usd">>,
): Promise<void> {
  await supabaseService().from("tips").update(patch).eq("id", id);
}

export async function listTipsForUser(userId: string, limit = 10): Promise<Tip[]> {
  const { data } = await supabaseService()
    .from("tips")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data as Tip[]) ?? [];
}

/** Public aggregate for a creator profile: count + total of received tips. */
export async function getCreatorPublicStats(
  creatorId: string,
): Promise<{ tipCount: number; totalUsd: number }> {
  const { data } = await supabaseService()
    .from("tips")
    .select("amount_usd, status")
    .eq("creator_id", creatorId)
    .in("status", ["sent", "escrowed", "claimed"]);
  const rows = (data as { amount_usd: number }[]) ?? [];
  return {
    tipCount: rows.length,
    totalUsd: rows.reduce((s, r) => s + Number(r.amount_usd), 0),
  };
}

export async function listTipsForCreator(creatorId: string, limit = 50): Promise<Tip[]> {
  const { data } = await supabaseService()
    .from("tips")
    .select("*")
    .eq("creator_id", creatorId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data as Tip[]) ?? [];
}

// ── ledger (reader balance) ────────────────────────────────
export async function adjustUserBalance(
  userId: string,
  deltaUsd: number,
  kind: "deposit" | "tip_debit" | "refund",
  tipId?: string | null,
): Promise<number> {
  const db = supabaseService();
  const user = await getUserById(userId);
  if (!user) throw new Error("user not found");
  const next = Number(user.balance_usd) + deltaUsd;
  if (next < 0) throw new Error("insufficient balance");
  await db.from("users").update({ balance_usd: next }).eq("id", userId);
  await db.from("ledger").insert({ user_id: userId, kind, amount_usd: deltaUsd, tip_id: tipId ?? null });
  return next;
}

// ── pending tips (Telegram confirmation state) ─────────────
export async function createPendingTip(input: {
  telegramId: string;
  chatId: string;
  url: string;
  comment?: string | null;
  suggestedAmount: number;
  creatorId?: string | null;
  confidence?: number | null;
  action?: string | null;
  agentReasoning?: string | null;
}): Promise<PendingTip> {
  const { data, error } = await supabaseService()
    .from("pending_tips")
    .insert({
      telegram_id: input.telegramId,
      chat_id: input.chatId,
      url: input.url,
      comment: input.comment ?? null,
      suggested_amount: input.suggestedAmount,
      creator_id: input.creatorId ?? null,
      confidence: input.confidence ?? null,
      action: input.action ?? null,
      agent_reasoning: input.agentReasoning ?? null,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as PendingTip;
}

export async function getPendingTip(id: string): Promise<PendingTip | null> {
  const { data } = await supabaseService().from("pending_tips").select("*").eq("id", id).maybeSingle();
  return (data as PendingTip) ?? null;
}

export async function deletePendingTip(id: string): Promise<void> {
  await supabaseService().from("pending_tips").delete().eq("id", id);
}
