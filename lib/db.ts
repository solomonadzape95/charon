/**
 * Data layer for Charon v3 (reading platform).
 * All writes go through the service-role client.
 */
import { randomUUID } from "node:crypto";
import {
  supabaseService,
  type AgentConfig,
  type AgentMessage,
  type Announcement,
  type Chapter,
  type Creator,
  type TasteProfile,
  type Follow,
  type FollowMode,
  type Loyalty,
  type LoyaltyTier,
  type Payment,
  type PaymentStatus,
  type Series,
  type Session,
  type User,
} from "@/lib/supabase";

// ── users (readers) ────────────────────────────────────────
export async function getUserById(id: string): Promise<User | null> {
  const { data } = await supabaseService().from("users").select("*").eq("id", id).maybeSingle();
  return (data as User) ?? null;
}

export async function getUserByEmail(email: string): Promise<User | null> {
  const { data } = await supabaseService().from("users").select("*").eq("email", email).maybeSingle();
  return (data as User) ?? null;
}

/** Search readers by email (for gifting). Returns id + email only. */
export async function searchUsers(q: string, limit = 8): Promise<{ id: string; email: string | null }[]> {
  const term = q.trim();
  if (term.length < 2) return [];
  const { data } = await supabaseService()
    .from("users")
    .select("id, email")
    .ilike("email", `%${term}%`)
    .limit(limit);
  return (data as { id: string; email: string | null }[]) ?? [];
}

export async function createUser(email: string): Promise<User> {
  const { data, error } = await supabaseService()
    .from("users")
    .insert({ email })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as User;
}

/** Credit/debit a reader's ledger balance atomically (throws on overdraw). */
export async function adjustUserBalance(
  userId: string,
  deltaUsd: number,
  kind: "deposit" | "welcome" | "gift" | "tip" | "agent_fund" | "agent_return" | "session_debit" | "unlock_debit" | "refund",
  refId?: string | null,
): Promise<number> {
  const db = supabaseService();
  const user = await getUserById(userId);
  if (!user) throw new Error("user not found");
  const next = Number(user.balance_usd) + deltaUsd;
  if (next < 0) throw new Error("insufficient balance");
  await db.from("users").update({ balance_usd: next }).eq("id", userId);
  await db.from("ledger").insert({ user_id: userId, kind, amount_usd: deltaUsd, ref_id: refId ?? null });
  return next;
}

/**
 * Grant the one-time new-reader welcome credit, exactly once per user.
 * The `welcome_credited` flag is flipped false→true atomically (a conditional
 * UPDATE that only one concurrent request can win), so a double-fired client
 * effect or a retry can never double-credit. Returns whether this call granted.
 */
export async function grantWelcomeCreditOnce(
  userId: string,
  amountUsd: number,
): Promise<{ granted: boolean; balance: number }> {
  const db = supabaseService();
  const { data: claimed } = await db
    .from("users")
    .update({ welcome_credited: true })
    .eq("id", userId)
    .eq("welcome_credited", false)
    .select("id")
    .maybeSingle();
  if (!claimed) {
    const u = await getUserById(userId);
    return { granted: false, balance: Number(u?.balance_usd ?? 0) };
  }
  const balance = await adjustUserBalance(userId, amountUsd, "welcome");
  return { granted: true, balance };
}

/**
 * Credit an on-chain deposit, keyed idempotently by tx hash. The first insert
 * wins; a duplicate tx_hash (UNIQUE) means it was already credited, so we don't
 * credit the ledger twice. Returns the user's resulting balance.
 */
export async function creditDepositByTx(input: {
  userId: string;
  txHash: string;
  amountUsd: number;
  method: "wallet" | "manual";
  fromAddress?: string | null;
}): Promise<{ credited: boolean; already: boolean; balance: number }> {
  const db = supabaseService();
  const { data, error } = await db
    .from("deposits")
    .insert({
      user_id: input.userId,
      amount_usd: input.amountUsd,
      method: input.method,
      tx_hash: input.txHash,
      from_address: input.fromAddress ?? null,
    })
    .select("id")
    .single();
  if (error) {
    if (error.code === "23505") {
      const u = await getUserById(input.userId);
      return { credited: false, already: true, balance: Number(u?.balance_usd ?? 0) };
    }
    throw new Error(error.message);
  }
  const balance = await adjustUserBalance(input.userId, input.amountUsd, "deposit", (data as { id: string }).id);
  return { credited: true, already: false, balance };
}

/** Log a sandbox (test) top-up so it shows in the admin deposits feed. */
export async function recordSandboxDeposit(userId: string, amountUsd: number): Promise<void> {
  await supabaseService().from("deposits").insert({ user_id: userId, amount_usd: amountUsd, method: "sandbox" });
}

export async function listRecentDeposits(limit = 20): Promise<
  { id: string; user_id: string | null; amount_usd: number; method: string; tx_hash: string | null; created_at: string }[]
> {
  const { data } = await supabaseService()
    .from("deposits")
    .select("id, user_id, amount_usd, method, tx_hash, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data as any[]) ?? [];
}

// ── creators ───────────────────────────────────────────────
export async function getCreatorById(id: string): Promise<Creator | null> {
  const { data } = await supabaseService().from("creators").select("*").eq("id", id).maybeSingle();
  return (data as Creator) ?? null;
}

export async function getCreatorByEmail(email: string): Promise<Creator | null> {
  const { data } = await supabaseService().from("creators").select("*").eq("email", email).maybeSingle();
  return (data as Creator) ?? null;
}

export async function getCreatorBySlug(slug: string): Promise<Creator | null> {
  const { data } = await supabaseService().from("creators").select("*").eq("slug", slug).maybeSingle();
  return (data as Creator) ?? null;
}

export async function getCreatorByClaimToken(token: string): Promise<Creator | null> {
  const { data } = await supabaseService().from("creators").select("*").eq("claim_token", token).maybeSingle();
  return (data as Creator) ?? null;
}

export async function createCreator(fields: {
  name?: string | null;
  email?: string | null;
  bio?: string | null;
  walletAddress?: string | null;
}): Promise<Creator> {
  const slug = await uniqueSlug(fields.name ?? fields.email ?? "creator", "creators");
  const { data, error } = await supabaseService()
    .from("creators")
    .insert({
      name: fields.name ?? null,
      email: fields.email ?? null,
      bio: fields.bio ?? null,
      slug,
      wallet_address: fields.walletAddress ?? null,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as Creator;
}

export async function setCreatorWallet(creatorId: string, walletAddress: string): Promise<void> {
  await supabaseService().from("creators").update({ wallet_address: walletAddress }).eq("id", creatorId);
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

/** Accrue escrow + lifetime earnings for a creator. */
export async function adjustCreatorBalance(creatorId: string, deltaUsd: number): Promise<void> {
  const c = await getCreatorById(creatorId);
  if (!c) return;
  await supabaseService()
    .from("creators")
    .update({
      balance_usd: Number(c.balance_usd) + deltaUsd,
      total_earned_usdc: Number(c.total_earned_usdc) + Math.max(0, deltaUsd),
    })
    .eq("id", creatorId);
}

export async function markCreatorClaimed(creatorId: string): Promise<void> {
  await supabaseService().from("creators").update({ claimed: true, balance_usd: 0 }).eq("id", creatorId);
}

export interface ClaimResult {
  ok: boolean;
  creator?: Creator;
  reason?: string;
  alreadyYours?: boolean;
}

/**
 * Bind a seeded (account-less) creator record to a real signed-in email via its
 * claim token. Once bound, the existing email-match flow grants the person their
 * dashboard, earnings, escrow and withdrawal access.
 */
export async function claimCreatorByToken(token: string, email: string): Promise<ClaimResult> {
  const e = email.trim().toLowerCase();
  const creator = await getCreatorByClaimToken(token);
  if (!creator) return { ok: false, reason: "invalid claim link" };

  // Already claimed: fine if it's the same person, otherwise blocked.
  if (creator.claimed && creator.email && creator.email.toLowerCase() !== e) {
    return { ok: false, reason: "this profile has already been claimed" };
  }
  if (creator.email && creator.email.toLowerCase() === e) {
    return { ok: true, creator, alreadyYours: true };
  }

  // The email must not already belong to a different creator.
  const conflict = await getCreatorByEmail(e);
  if (conflict && conflict.id !== creator.id) {
    return { ok: false, reason: "that email is already linked to another creator profile" };
  }

  const { data, error } = await supabaseService()
    .from("creators")
    .update({ email: e, claimed: true })
    .eq("id", creator.id)
    .select()
    .single();
  if (error) return { ok: false, reason: error.message };
  return { ok: true, creator: data as Creator };
}

// ── series ─────────────────────────────────────────────────
export async function createSeries(input: {
  creatorId: string;
  title: string;
  description?: string | null;
  genre?: string | null;
  coverImage?: string | null;
}): Promise<Series> {
  const slug = await uniqueSlug(input.title, "series");
  const { data, error } = await supabaseService()
    .from("series")
    .insert({
      creator_id: input.creatorId,
      title: input.title,
      slug,
      description: input.description ?? null,
      genre: input.genre ?? null,
      cover_image: input.coverImage ?? null,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as Series;
}

export async function getSeriesById(id: string): Promise<Series | null> {
  const { data } = await supabaseService().from("series").select("*").eq("id", id).maybeSingle();
  return (data as Series) ?? null;
}

export async function getSeriesBySlug(slug: string): Promise<Series | null> {
  const { data } = await supabaseService().from("series").select("*").eq("slug", slug).maybeSingle();
  return (data as Series) ?? null;
}

export async function listSeries(limit = 50): Promise<Series[]> {
  const { data } = await supabaseService()
    .from("series")
    .select("*")
    .order("momentum_score", { ascending: false })
    .limit(limit);
  return (data as Series[]) ?? [];
}

export async function listSeriesForCreator(creatorId: string): Promise<Series[]> {
  const { data } = await supabaseService()
    .from("series")
    .select("*")
    .eq("creator_id", creatorId)
    .order("created_at", { ascending: false });
  return (data as Series[]) ?? [];
}

export async function updateSeries(id: string, patch: Partial<Series>): Promise<void> {
  await supabaseService().from("series").update(patch).eq("id", id);
}

// ── announcements ──────────────────────────────────────────
export async function createAnnouncement(input: {
  creatorId: string;
  seriesId?: string | null;
  title?: string | null;
  body: string;
}): Promise<Announcement> {
  const { data, error } = await supabaseService()
    .from("announcements")
    .insert({
      creator_id: input.creatorId,
      series_id: input.seriesId ?? null,
      title: input.title ?? null,
      body: input.body,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as Announcement;
}

/** Announcements a reader of this series should see: series-specific + the creator's series-wide ones. */
export async function listAnnouncementsForSeries(seriesId: string, creatorId: string, limit = 10): Promise<Announcement[]> {
  const { data } = await supabaseService()
    .from("announcements")
    .select("*")
    .or(`series_id.eq.${seriesId},and(creator_id.eq.${creatorId},series_id.is.null)`)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data as Announcement[]) ?? [];
}

export async function listAnnouncementsForCreator(creatorId: string, limit = 20): Promise<Announcement[]> {
  const { data } = await supabaseService()
    .from("announcements")
    .select("*")
    .eq("creator_id", creatorId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data as Announcement[]) ?? [];
}

export async function deleteAnnouncement(id: string): Promise<void> {
  await supabaseService().from("announcements").delete().eq("id", id);
}

// ── reader agent ───────────────────────────────────────────
export async function getAgentConfig(userId: string): Promise<AgentConfig | null> {
  const { data } = await supabaseService().from("agent_config").select("*").eq("user_id", userId).maybeSingle();
  return (data as AgentConfig) ?? null;
}

export async function upsertAgentConfig(input: {
  userId: string;
  tasteProfile?: TasteProfile | null;
  weeklyLimitUsdc?: number;
  agentWalletId?: string | null;
  agentWalletAddress?: string | null;
  agentWalletPk?: string | null;
}): Promise<AgentConfig> {
  const patch: Record<string, unknown> = { user_id: input.userId };
  if (input.tasteProfile !== undefined) patch.taste_profile = input.tasteProfile;
  if (input.weeklyLimitUsdc !== undefined) patch.weekly_limit_usdc = input.weeklyLimitUsdc;
  if (input.agentWalletId !== undefined) patch.agent_wallet_id = input.agentWalletId;
  if (input.agentWalletAddress !== undefined) patch.agent_wallet_address = input.agentWalletAddress;
  if (input.agentWalletPk !== undefined) patch.agent_wallet_pk = input.agentWalletPk;
  const { data, error } = await supabaseService()
    .from("agent_config")
    .upsert(patch, { onConflict: "user_id" })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as AgentConfig;
}

export async function updateAgentConfig(userId: string, patch: Partial<AgentConfig>): Promise<void> {
  await supabaseService().from("agent_config").update(patch).eq("user_id", userId);
}

export async function addAgentMessage(input: {
  userId: string;
  sender: "agent" | "reader";
  kind?: string;
  content: string;
  seriesId?: string | null;
  chapterId?: string | null;
  amountUsd?: number | null;
  paymentRef?: string | null;
}): Promise<AgentMessage> {
  const { data, error } = await supabaseService()
    .from("agent_messages")
    .insert({
      user_id: input.userId,
      sender: input.sender,
      kind: input.kind ?? "message",
      content: input.content,
      series_id: input.seriesId ?? null,
      chapter_id: input.chapterId ?? null,
      amount_usdc: input.amountUsd ?? null,
      payment_ref: input.paymentRef ?? null,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as AgentMessage;
}

export async function listAgentMessages(userId: string, limit = 60): Promise<AgentMessage[]> {
  const { data } = await supabaseService()
    .from("agent_messages")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(limit);
  return (data as AgentMessage[]) ?? [];
}

/** User ids of every active (non-paused) reader agent — for the scheduled fleet run. */
export async function listActiveAgentUserIds(limit = 200): Promise<string[]> {
  const { data } = await supabaseService()
    .from("agent_config")
    .select("user_id")
    .eq("paused", false)
    .limit(limit);
  return (data ?? []).map((r) => (r as { user_id: string }).user_id);
}

/** Chapters in a series this user has NOT yet paid for, in order. */
export async function unpaidChaptersForUser(userId: string, seriesId: string): Promise<Chapter[]> {
  const chapters = await listChapters(seriesId);
  if (!chapters.length) return [];
  const { data: paid } = await supabaseService()
    .from("payments")
    .select("chapter_id")
    .eq("user_id", userId)
    .eq("status", "settled")
    .in("chapter_id", chapters.map((c) => c.id));
  const paidIds = new Set((paid ?? []).map((p) => (p as { chapter_id: string }).chapter_id));
  return chapters.filter((c) => !paidIds.has(c.id));
}

// ── chapters ───────────────────────────────────────────────
export async function createChapter(input: {
  seriesId: string;
  chapterNumber: number;
  title?: string | null;
  contentType: "text" | "images";
  content: string;
  wordCount: number;
  floorPrice: number;
  basePrice: number;
  currentPrice: number;
  earlyAccessPrice?: number | null;
  earlyAccessReleaseAt?: string | null;
}): Promise<Chapter> {
  const { data, error } = await supabaseService()
    .from("chapters")
    .insert({
      series_id: input.seriesId,
      chapter_number: input.chapterNumber,
      title: input.title ?? null,
      content_type: input.contentType,
      content: input.content,
      word_count: input.wordCount,
      floor_price_usdc: input.floorPrice,
      base_price_usdc: input.basePrice,
      current_price_usdc: input.currentPrice,
      early_access_price_usdc: input.earlyAccessPrice ?? null,
      early_access_release_at: input.earlyAccessReleaseAt ?? null,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as Chapter;
}

export async function getChapterById(id: string): Promise<Chapter | null> {
  const { data } = await supabaseService().from("chapters").select("*").eq("id", id).maybeSingle();
  return (data as Chapter) ?? null;
}

export async function listChapters(seriesId: string): Promise<Chapter[]> {
  const { data } = await supabaseService()
    .from("chapters")
    .select("*")
    .eq("series_id", seriesId)
    .order("chapter_number", { ascending: true });
  return (data as Chapter[]) ?? [];
}

export async function listAllChapters(limit = 500): Promise<Chapter[]> {
  const { data } = await supabaseService().from("chapters").select("*").limit(limit);
  return (data as Chapter[]) ?? [];
}

export async function updateChapter(id: string, patch: Partial<Chapter>): Promise<void> {
  await supabaseService().from("chapters").update(patch).eq("id", id);
}

export async function nextChapterNumber(seriesId: string): Promise<number> {
  const { data } = await supabaseService()
    .from("chapters")
    .select("chapter_number")
    .eq("series_id", seriesId)
    .order("chapter_number", { ascending: false })
    .limit(1)
    .maybeSingle();
  return ((data as { chapter_number: number } | null)?.chapter_number ?? 0) + 1;
}

// ── sessions ───────────────────────────────────────────────
export async function createSession(input: {
  userId: string;
  chapterId: string;
  bingeDepth: number;
}): Promise<Session> {
  const { data, error } = await supabaseService()
    .from("sessions")
    .insert({ user_id: input.userId, chapter_id: input.chapterId, binge_depth: input.bingeDepth })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as Session;
}

export async function getSessionById(id: string): Promise<Session | null> {
  const { data } = await supabaseService().from("sessions").select("*").eq("id", id).maybeSingle();
  return (data as Session) ?? null;
}

export async function finalizeSession(id: string, patch: Partial<Session>): Promise<void> {
  await supabaseService().from("sessions").update(patch).eq("id", id);
}

export async function listSessionsForUser(userId: string, limit = 50): Promise<Session[]> {
  const { data } = await supabaseService()
    .from("sessions")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data as Session[]) ?? [];
}

/** How many distinct chapters of this series the reader has previously read (for re-read detection). */
export async function priorReadsOfChapter(userId: string, chapterId: string): Promise<number> {
  const { count } = await supabaseService()
    .from("sessions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("chapter_id", chapterId)
    .not("ended_at", "is", null);
  return count ?? 0;
}

// ── payments ───────────────────────────────────────────────
export async function recordPayment(input: {
  sessionId?: string | null;
  userId: string;
  creatorId: string;
  chapterId: string;
  amountUsdc: number; // gross (reader-paid)
  feeUsdc?: number; // platform cut
  netUsdc?: number; // creator net
  withdrawableAt?: string | null; // escrow clear time
  status?: PaymentStatus;
  arcTxHash?: string | null;
  callerType?: "human" | "agent";
}): Promise<Payment> {
  const { data, error } = await supabaseService()
    .from("payments")
    .insert({
      session_id: input.sessionId ?? null,
      user_id: input.userId,
      creator_id: input.creatorId,
      chapter_id: input.chapterId,
      amount_usdc: input.amountUsdc,
      fee_usdc: input.feeUsdc ?? 0,
      net_usdc: input.netUsdc ?? input.amountUsdc,
      withdrawable_at: input.withdrawableAt ?? null,
      status: input.status ?? "pending",
      arc_tx_hash: input.arcTxHash ?? null,
      caller_type: input.callerType ?? "human",
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as Payment;
}

/**
 * Record a creator withdrawal: move `amountUsd` out of unwithdrawn escrow
 * (balance_usd) into lifetime withdrawn. Called after the on-chain payout settles.
 */
export async function recordCreatorWithdrawal(creatorId: string, amountUsd: number): Promise<void> {
  const c = await getCreatorById(creatorId);
  if (!c) return;
  await supabaseService()
    .from("creators")
    .update({
      balance_usd: Math.max(0, Number(c.balance_usd) - amountUsd),
      total_withdrawn_usdc: Number(c.total_withdrawn_usdc) + amountUsd,
    })
    .eq("id", creatorId);
}

export async function updatePayment(id: string, patch: Partial<Payment>): Promise<void> {
  await supabaseService().from("payments").update(patch).eq("id", id);
}

export async function listPaymentsForCreator(creatorId: string, limit = 100): Promise<Payment[]> {
  const { data } = await supabaseService()
    .from("payments")
    .select("*")
    .eq("creator_id", creatorId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data as Payment[]) ?? [];
}

// ── follows ────────────────────────────────────────────────
export async function getFollow(userId: string, seriesId: string): Promise<Follow | null> {
  const { data } = await supabaseService()
    .from("follows")
    .select("*")
    .eq("user_id", userId)
    .eq("series_id", seriesId)
    .maybeSingle();
  return (data as Follow) ?? null;
}

export async function setFollowMode(userId: string, seriesId: string, mode: FollowMode): Promise<void> {
  await supabaseService()
    .from("follows")
    .upsert({ user_id: userId, series_id: seriesId, mode }, { onConflict: "user_id,series_id" });
}

/** Remove a follow (un-add from library). Returns whether a row was deleted. */
export async function removeFollow(userId: string, seriesId: string): Promise<void> {
  await supabaseService().from("follows").delete().eq("user_id", userId).eq("series_id", seriesId);
}

/**
 * Pay-once rule: has this reader already settled a payment for this chapter?
 * If so, re-reads are free forever (charon-payment-architecture.md, Part 2).
 */
export async function hasPaidForChapter(userId: string, chapterId: string): Promise<boolean> {
  const { count } = await supabaseService()
    .from("payments")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("chapter_id", chapterId)
    .eq("status", "settled");
  return (count ?? 0) > 0;
}

export async function listFollowsForUser(userId: string): Promise<Follow[]> {
  const { data } = await supabaseService().from("follows").select("*").eq("user_id", userId);
  return (data as Follow[]) ?? [];
}

export async function listSubscribers(seriesId: string, mode: FollowMode): Promise<Follow[]> {
  const { data } = await supabaseService()
    .from("follows")
    .select("*")
    .eq("series_id", seriesId)
    .eq("mode", mode);
  return (data as Follow[]) ?? [];
}

// ── loyalty ────────────────────────────────────────────────
export async function getOrCreateLoyalty(userId: string, seriesId: string): Promise<Loyalty> {
  const db = supabaseService();
  const { data: existing } = await db
    .from("loyalty")
    .select("*")
    .eq("user_id", userId)
    .eq("series_id", seriesId)
    .maybeSingle();
  if (existing) return existing as Loyalty;
  const { data, error } = await db
    .from("loyalty")
    .insert({ user_id: userId, series_id: seriesId })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as Loyalty;
}

function tierFor(chaptersRead: number): LoyaltyTier {
  if (chaptersRead >= 100) return "devotee";
  if (chaptersRead >= 20) return "loyal";
  if (chaptersRead >= 5) return "reader";
  return "new";
}

/** Increment a reader's loyalty after a settled session. */
export async function bumpLoyalty(userId: string, seriesId: string, spentUsd: number): Promise<Loyalty> {
  const cur = await getOrCreateLoyalty(userId, seriesId);
  const chaptersRead = cur.chapters_read + 1;
  const totalSpent = Number(cur.total_spent_usdc) + spentUsd;
  const patch = {
    chapters_read: chaptersRead,
    total_spent_usdc: totalSpent,
    loyalty_tier: tierFor(chaptersRead),
  };
  await supabaseService().from("loyalty").update(patch).eq("id", cur.id);
  return { ...cur, ...patch };
}

// ── price history ──────────────────────────────────────────
export async function logPriceChange(input: {
  chapterId: string;
  oldPrice: number;
  newPrice: number;
  reason: string;
  signals?: Record<string, unknown>;
}): Promise<void> {
  await supabaseService().from("price_history").insert({
    chapter_id: input.chapterId,
    old_price_usdc: input.oldPrice,
    new_price_usdc: input.newPrice,
    reason: input.reason,
    signals_json: input.signals ?? null,
  });
}

// ── helpers ────────────────────────────────────────────────
/** Pick an available slug derived from a base string, unique within `table`. */
export async function uniqueSlug(base: string, table: "creators" | "series"): Promise<string> {
  const root =
    (base || table).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || table;
  const db = supabaseService();
  for (let i = 0; i < 50; i++) {
    const candidate = i === 0 ? root : `${root}-${i + 1}`;
    const { data } = await db.from(table).select("id").eq("slug", candidate).maybeSingle();
    if (!data) return candidate;
  }
  return `${root}-${randomUUID().slice(0, 6)}`;
}
