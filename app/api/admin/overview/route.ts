import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { supabaseService } from "@/lib/supabase";
import { reconcile } from "@/lib/treasury";
import { roundUsdc } from "@/lib/money";

export const runtime = "nodejs";

const DAY = 86_400_000;
const TREND_DAYS = 14;

/** UTC YYYY-MM-DD for a timestamp. */
function dayKey(ts: string | number | Date): string {
  return new Date(ts).toISOString().slice(0, 10);
}

export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;
  const db = supabaseService();

  const [
    usersC,
    users,
    creators,
    seriesC,
    series,
    chaptersC,
    chapters,
    payments,
    deposits,
    sessions,
    agents,
    recentPays,
    recentSess,
    recon,
    recentDeposits,
  ] = await Promise.all([
    db.from("users").select("id", { count: "exact", head: true }),
    db.from("users").select("created_at, balance_usd").limit(20000),
    db.from("creators").select("name, slug, balance_usd, total_earned_usdc, total_withdrawn_usdc, claimed").limit(10000),
    db.from("series").select("id", { count: "exact", head: true }),
    db.from("series").select("id, title, follower_count").limit(10000),
    db.from("chapters").select("id", { count: "exact", head: true }),
    db.from("chapters").select("series_id, read_count").limit(20000),
    db.from("payments").select("amount_usdc, fee_usdc, net_usdc, status, caller_type, created_at").limit(20000),
    db.from("ledger").select("amount_usd, created_at").eq("kind", "deposit").limit(20000),
    db.from("sessions").select("user_id, completion_rate, time_spent_seconds, amount_settled_usdc, created_at").limit(20000),
    db.from("agent_config").select("paused, weekly_spent_usdc, wallet_balance_usdc").limit(10000),
    db.from("payments").select("id, amount_usdc, status, created_at").order("created_at", { ascending: false }).limit(8),
    db.from("sessions").select("amount_settled_usdc, agent_reasoning, created_at").not("amount_settled_usdc", "is", null).order("created_at", { ascending: false }).limit(8),
    reconcile(),
    db.from("deposits").select("id, amount_usd, method, tx_hash, created_at").order("created_at", { ascending: false }).limit(8),
  ]);

  const userRows = (users.data ?? []) as { created_at: string; balance_usd: number }[];
  const creatorRows = (creators.data ?? []) as {
    name: string | null; slug: string | null; balance_usd: number; total_earned_usdc: number; total_withdrawn_usdc: number; claimed: boolean;
  }[];
  const seriesRows = (series.data ?? []) as { id: string; title: string; follower_count: number }[];
  const chapterRows = (chapters.data ?? []) as { series_id: string; read_count: number }[];
  const payRows = (payments.data ?? []) as { amount_usdc: number; fee_usdc: number; net_usdc: number | null; status: string; caller_type: string; created_at: string }[];
  const depositRows = (deposits.data ?? []) as { amount_usd: number; created_at: string }[];
  const sessionRows = (sessions.data ?? []) as { user_id: string | null; completion_rate: number; time_spent_seconds: number; amount_settled_usdc: number | null; created_at: string }[];
  const agentRows = (agents.data ?? []) as { paused: boolean; weekly_spent_usdc: number; wallet_balance_usdc: number }[];

  const settled = payRows.filter((p) => p.status === "settled");
  const sumSince = (ms: number) => settled.filter((p) => +new Date(p.created_at) >= Date.now() - ms).reduce((s, p) => s + Number(p.amount_usdc), 0);
  const totalSettled = settled.reduce((s, p) => s + Number(p.amount_usdc), 0);
  const platformFee = roundUsdc(settled.reduce((s, p) => s + Number(p.fee_usdc), 0));
  const escrow = creatorRows.reduce((s, c) => s + Number(c.balance_usd), 0);
  const lifetimeEarned = creatorRows.reduce((s, c) => s + Number(c.total_earned_usdc), 0);
  const totalDeposits = depositRows.reduce((s, d) => s + Number(d.amount_usd), 0);

  // ── 14-day trend (settled volume + count, deposits, new readers) ──
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const days = Array.from({ length: TREND_DAYS }, (_, i) => {
    const d = new Date(today);
    d.setUTCDate(today.getUTCDate() - (TREND_DAYS - 1 - i));
    return dayKey(d);
  });
  const dayIndex = new Map(days.map((k, i) => [k, i]));
  const trend = days.map((date) => ({ date, settledVolume: 0, settledCount: 0, deposits: 0, newReaders: 0 }));
  for (const p of settled) {
    const i = dayIndex.get(dayKey(p.created_at));
    if (i !== undefined) { trend[i].settledVolume += Number(p.amount_usdc); trend[i].settledCount += 1; }
  }
  for (const d of depositRows) {
    const i = dayIndex.get(dayKey(d.created_at));
    if (i !== undefined) trend[i].deposits += Number(d.amount_usd);
  }
  for (const u of userRows) {
    const i = dayIndex.get(dayKey(u.created_at));
    if (i !== undefined) trend[i].newReaders += 1;
  }
  for (const t of trend) { t.settledVolume = roundUsdc(t.settledVolume); t.deposits = roundUsdc(t.deposits); }

  // ── Engagement ──
  const completed = sessionRows.filter((s) => Number(s.completion_rate) > 0);
  const activeReaders7d = new Set(
    sessionRows.filter((s) => s.user_id && +new Date(s.created_at) >= Date.now() - 7 * DAY).map((s) => s.user_id),
  ).size;
  const engagement = {
    totalSessions: sessionRows.length,
    paidReads: sessionRows.filter((s) => Number(s.amount_settled_usdc) > 0).length,
    readingHours: Math.round(sessionRows.reduce((s, r) => s + Number(r.time_spent_seconds || 0), 0) / 3600),
    avgCompletion: completed.length ? Math.round((completed.reduce((s, r) => s + Number(r.completion_rate), 0) / completed.length) * 100) : 0,
    activeReaders7d,
    avgReaderBalance: userRows.length ? roundUsdc(userRows.reduce((s, u) => s + Number(u.balance_usd), 0) / userRows.length) : 0,
    agentsTotal: agentRows.length,
    agentsActive: agentRows.filter((a) => !a.paused).length,
    agentWalletFunds: roundUsdc(agentRows.reduce((s, a) => s + Number(a.wallet_balance_usdc || 0), 0)),
  };

  // ── Human vs agent settlement split ──
  const agentVol = settled.filter((p) => p.caller_type === "agent").reduce((s, p) => s + Number(p.amount_usdc), 0);
  const callerSplit = {
    humanVolume: roundUsdc(totalSettled - agentVol),
    agentVolume: roundUsdc(agentVol),
    humanCount: settled.filter((p) => p.caller_type !== "agent").length,
    agentCount: settled.filter((p) => p.caller_type === "agent").length,
  };

  // ── Leaderboards ──
  const topCreators = [...creatorRows]
    .sort((a, b) => Number(b.total_earned_usdc) - Number(a.total_earned_usdc))
    .slice(0, 6)
    .map((c) => ({
      name: c.name ?? "Unclaimed creator",
      slug: c.slug,
      earned: roundUsdc(Number(c.total_earned_usdc)),
      escrow: roundUsdc(Number(c.balance_usd)),
      withdrawn: roundUsdc(Number(c.total_withdrawn_usdc)),
      claimed: c.claimed,
    }));

  const readsBySeries = new Map<string, number>();
  for (const ch of chapterRows) readsBySeries.set(ch.series_id, (readsBySeries.get(ch.series_id) ?? 0) + Number(ch.read_count || 0));
  const topSeries = seriesRows
    .map((s) => ({ title: s.title, followers: Number(s.follower_count || 0), reads: readsBySeries.get(s.id) ?? 0 }))
    .sort((a, b) => b.reads - a.reads)
    .slice(0, 6);

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
    trend,
    engagement,
    callerSplit,
    topCreators,
    topSeries,
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
