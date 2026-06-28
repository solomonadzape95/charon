import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { supabaseService } from "@/lib/supabase";
import { reconcile } from "@/lib/treasury";
import { roundUsdc } from "@/lib/money";

export const runtime = "nodejs";

const DAY = 86_400_000;

export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;
  const db = supabaseService();

  const [usersC, creators, seriesC, chaptersC, payments, deposits, recentPays, recentSess, recon, recentDeposits] = await Promise.all([
    db.from("users").select("id", { count: "exact", head: true }),
    db.from("creators").select("balance_usd, total_earned_usdc, claimed"),
    db.from("series").select("id", { count: "exact", head: true }),
    db.from("chapters").select("id", { count: "exact", head: true }),
    db.from("payments").select("amount_usdc, fee_usdc, net_usdc, status, created_at").limit(10000),
    db.from("ledger").select("amount_usd, kind").eq("kind", "deposit").limit(10000),
    db.from("payments").select("id, amount_usdc, fee_usdc, net_usdc, status, created_at, creator_id, chapter_id").order("created_at", { ascending: false }).limit(8),
    db.from("sessions").select("amount_settled_usdc, agent_reasoning, created_at").not("amount_settled_usdc", "is", null).order("created_at", { ascending: false }).limit(8),
    reconcile(),
    db.from("deposits").select("id, amount_usd, method, tx_hash, created_at").order("created_at", { ascending: false }).limit(8),
  ]);

  const creatorRows = creators.data ?? [];
  const payRows = (payments.data ?? []) as { amount_usdc: number; fee_usdc: number; net_usdc: number | null; status: string; created_at: string }[];
  const settled = payRows.filter((p) => p.status === "settled");
  const sumSince = (ms: number) => settled.filter((p) => +new Date(p.created_at) >= Date.now() - ms).reduce((s, p) => s + Number(p.amount_usdc), 0);
  const totalSettled = settled.reduce((s, p) => s + Number(p.amount_usdc), 0);
  const platformFee = roundUsdc(settled.reduce((s, p) => s + Number(p.fee_usdc), 0));
  const escrow = creatorRows.reduce((s, c) => s + Number(c.balance_usd), 0);
  const lifetimeEarned = creatorRows.reduce((s, c) => s + Number(c.total_earned_usdc), 0);
  const totalDeposits = (deposits.data ?? []).reduce((s, d) => s + Number((d as { amount_usd: number }).amount_usd), 0);

  return NextResponse.json({
    counts: {
      users: usersC.count ?? 0,
      creators: creatorRows.length,
      claimedCreators: creatorRows.filter((c) => c.claimed).length,
      unclaimedCreators: creatorRows.filter((c) => !c.claimed).length,
      series: seriesC.count ?? 0,
      chapters: chaptersC.count ?? 0,
    },
    money: {
      totalSettled: roundUsdc(totalSettled),
      settledToday: roundUsdc(sumSince(DAY)),
      settledWeek: roundUsdc(sumSince(7 * DAY)),
      platformFee,
      escrowHeld: roundUsdc(escrow),
      lifetimeEarned: roundUsdc(lifetimeEarned),
      totalDeposits: roundUsdc(totalDeposits),
      paymentsSettled: settled.length,
      paymentsFailed: payRows.filter((p) => p.status === "failed").length,
      paymentsPending: payRows.filter((p) => p.status === "pending").length,
    },
    reconciliation: recon,
    recentPayments: (recentPays.data ?? []).map((p) => ({
      id: (p as { id: string }).id,
      amount: Number((p as { amount_usdc: number }).amount_usdc),
      status: (p as { status: string }).status,
      created_at: (p as { created_at: string }).created_at,
    })),
    recentSessions: (recentSess.data ?? []).map((s) => ({
      amount: Number((s as { amount_settled_usdc: number }).amount_settled_usdc),
      reasoning: (s as { agent_reasoning: string | null }).agent_reasoning,
      created_at: (s as { created_at: string }).created_at,
    })),
    recentDeposits: (recentDeposits.data ?? []).map((d) => ({
      id: (d as { id: string }).id,
      amount: Number((d as { amount_usd: number }).amount_usd),
      method: (d as { method: string }).method,
      tx: (d as { tx_hash: string | null }).tx_hash,
      created_at: (d as { created_at: string }).created_at,
    })),
  });
}
