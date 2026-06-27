import { NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase";

export const runtime = "nodejs";

/**
 * Global live stats for the dashboard.
 *   GET /api/stats → tips, USDC settled, creators paid, claim rate, recent activity
 */
export async function GET() {
  const db = supabaseService();
  const [{ data: tips }, { count: creatorCount }, { count: userCount }] = await Promise.all([
    db.from("tips").select("amount_usd, status, platform, url, creator_id, created_at").order("created_at", { ascending: false }),
    db.from("creators").select("*", { count: "exact", head: true }),
    db.from("users").select("*", { count: "exact", head: true }),
  ]);

  const t = tips ?? [];
  const settled = t.filter((x) => x.status === "sent" || x.status === "escrowed" || x.status === "claimed");
  const sent = t.filter((x) => x.status === "sent");
  const escrowed = t.filter((x) => x.status === "escrowed");
  const claimed = t.filter((x) => x.status === "claimed");
  const sum = (arr: typeof t) => arr.reduce((s, x) => s + Number(x.amount_usd), 0);

  // creators that have received at least one settled tip
  const paidCreators = new Set(settled.map((x) => x.creator_id).filter(Boolean));
  const totalEscrowOrClaimed = escrowed.length + claimed.length;
  const claimRate = totalEscrowOrClaimed ? claimed.length / totalEscrowOrClaimed : 0;

  return NextResponse.json({
    totalTips: settled.length,
    totalUsdc: sum(settled),
    creators: creatorCount ?? 0,
    readers: userCount ?? 0,
    direct: { count: sent.length, usdc: sum(sent) },
    escrow: { count: escrowed.length, usdc: sum(escrowed) },
    claimed: { count: claimed.length, usdc: sum(claimed) },
    claimRate,
    paidCreators: paidCreators.size,
    recent: settled.slice(0, 12).map((x) => ({
      amount_usd: Number(x.amount_usd),
      status: x.status,
      platform: x.platform,
      url: x.url,
      created_at: x.created_at,
    })),
  });
}
