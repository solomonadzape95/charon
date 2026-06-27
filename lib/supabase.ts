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
  telegram_id: string | null;
  link_token: string | null;
  balance_usd: number;
  session_cap_usd: number;
}

export interface Creator {
  id: string;
  created_at: string;
  name: string | null;
  email: string | null;
  wallet_address: string | null;
  circle_wallet_id: string | null;
  circle_wallet_address: string | null;
  balance_usd: number;
  claimed: boolean;
  claim_token: string;
  // registry / public profile (added in supabase/registry.sql)
  slug: string | null;
  bio: string | null;
  avatar_url: string | null;
  registered: boolean;
}

export type IdentityPlatform =
  | "ens"
  | "farcaster"
  | "github"
  | "mirror"
  | "x"
  | "youtube"
  | "substack"
  | "domain"
  | "email";

export interface CreatorIdentity {
  id: string;
  created_at: string;
  creator_id: string;
  platform: IdentityPlatform;
  handle: string;
  address: string | null;
  confidence: number;
  // registry fields (added in supabase/registry.sql)
  verified: boolean;
  verify_code: string | null;
}

export type TipStatus =
  | "pending_confirmation"
  | "sent"
  | "escrowed"
  | "claimed"
  | "returned"
  | "failed";

export interface Tip {
  id: string;
  created_at: string;
  user_id: string | null;
  creator_id: string | null;
  url: string;
  platform: string | null;
  amount_usd: number;
  status: TipStatus;
  confidence: number | null;
  agent_reasoning: string | null;
  tx_hash: string | null;
}

export interface LedgerEntry {
  id: string;
  created_at: string;
  user_id: string;
  kind: "deposit" | "tip_debit" | "refund";
  amount_usd: number;
  tip_id: string | null;
}

export interface PendingTip {
  id: string;
  created_at: string;
  telegram_id: string;
  chat_id: string;
  url: string;
  comment: string | null;
  suggested_amount: number;
  creator_id: string | null;
  confidence: number | null;
  action: string | null;
  agent_reasoning: string | null;
}
