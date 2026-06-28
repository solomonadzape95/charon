import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Service-role client for server-side writes (payment logging, registration).
 * Never import this into a client component.
 */
let serviceClient: SupabaseClient | null = null;
export function supabaseService(): SupabaseClient {
  if (!serviceClient) {
    serviceClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } },
    );
  }
  return serviceClient;
}

/** Anon (public-read) client — safe for read paths / client components. */
let anonClient: SupabaseClient | null = null;
export function supabaseAnon(): SupabaseClient {
  if (!anonClient) {
    anonClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false } },
    );
  }
  return anonClient;
}

// ── Row types ──
export interface User {
  id: string;
  created_at: string;
  email: string | null;
  balance_usd: number;
  session_cap_usd: number;
}

export interface Creator {
  id: string;
  created_at: string;
  name: string | null;
  email: string | null;
  bio: string | null;
  slug: string | null;
  wallet_address: string | null;
  circle_wallet_id: string | null;
  circle_wallet_address: string | null;
  payout_preference: "usdc_wallet" | "bank";
  total_earned_usdc: number;
  balance_usd: number;
  total_withdrawn_usdc: number;
  claimed: boolean;
  claim_token: string;
}

export type SeriesStatus = "ongoing" | "completed";

export interface Series {
  id: string;
  created_at: string;
  creator_id: string;
  title: string;
  slug: string | null;
  description: string | null;
  genre: string | null;
  cover_image: string | null;
  status: SeriesStatus;
  follower_count: number;
  avg_completion_rate: number;
  binge_velocity: number;
  momentum_score: number;
}

export type ContentType = "text" | "images";

export interface Chapter {
  id: string;
  created_at: string;
  series_id: string;
  chapter_number: number;
  title: string | null;
  content_type: ContentType;
  content: string | null;
  word_count: number;
  floor_price_usdc: number;
  base_price_usdc: number;
  current_price_usdc: number;
  early_access_price_usdc: number | null;
  early_access_release_at: string | null;
  public_release_at: string;
  completion_rate: number;
  reread_rate: number;
  avg_time_spent_seconds: number;
  read_count: number;
}

export interface Session {
  id: string;
  created_at: string;
  user_id: string | null;
  chapter_id: string | null;
  started_at: string;
  ended_at: string | null;
  completion_rate: number;
  scroll_back_count: number;
  time_spent_seconds: number;
  binge_depth: number;
  reader_comment: string | null;
  agent_value_score: number | null;
  amount_settled_usdc: number | null;
  agent_reasoning: string | null;
  loyalty_discount_applied: number;
  binge_discount_applied: number;
}

export type PaymentStatus = "pending" | "settled" | "failed";

export interface Payment {
  id: string;
  created_at: string;
  session_id: string | null;
  user_id: string | null;
  creator_id: string | null;
  chapter_id: string | null;
  amount_usdc: number;
  fee_usdc: number;
  net_usdc: number | null;
  withdrawable_at: string | null;
  arc_tx_hash: string | null;
  status: PaymentStatus;
}

export interface LedgerEntry {
  id: string;
  created_at: string;
  user_id: string;
  kind: "deposit" | "session_debit" | "unlock_debit" | "refund";
  amount_usd: number;
  ref_id: string | null;
}

export interface PriceHistory {
  id: string;
  created_at: string;
  chapter_id: string;
  old_price_usdc: number;
  new_price_usdc: number;
  reason: string | null;
  signals_json: Record<string, unknown> | null;
}

export type FollowMode = "standard" | "pre_release" | "series_unlock";

export interface Follow {
  id: string;
  created_at: string;
  user_id: string;
  series_id: string;
  mode: FollowMode;
}

export type LoyaltyTier = "new" | "reader" | "loyal" | "devotee";

export interface Loyalty {
  id: string;
  created_at: string;
  user_id: string;
  series_id: string;
  chapters_read: number;
  total_spent_usdc: number;
  loyalty_tier: LoyaltyTier;
}
