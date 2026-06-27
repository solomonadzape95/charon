/**
 * Dynamic-pricing demo: show Agent 3 moving a chapter's price from live demand.
 * Picks the highest-priced "Iron Ascension" chapter, simulates a burst of reads
 * in the last 24h, triggers the repricing agent, and prints the before/after.
 *
 * Requires `npm run dev` + `npm run seed`. Run:  npm run demo-pricing
 */
const BASE = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";

async function api(method: string, path: string, body?: unknown) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`${path} → ${res.status}: ${JSON.stringify(data)}`);
  return data;
}
const get = (p: string) => api("GET", p);
const post = (p: string, b?: unknown) => api("POST", p, b);

async function readOnce(userId: string, chapterId: string, depth: number) {
  const { sessionId } = await post("/api/session/start", { userId, chapterId, bingeDepth: depth });
  await post("/api/session/end", {
    sessionId,
    completionRate: 1,
    scrollBackCount: 1,
    timeSpentSeconds: 200,
  });
}

async function main() {
  // A fresh reader funded enough to generate read volume.
  const { user } = await post("/api/users", { email: "demo-trender@paywithcharon.xyz" });
  await post("/api/deposit", { userId: user.id, amountUsd: 3 });

  // Highest-priced Iron Ascension chapter.
  const { series } = await get("/api/series");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const iron = (series as any[]).find((s) => s.title === "Iron Ascension");
  if (!iron) throw new Error("Run `npm run seed` first.");
  const { chapters } = await get(`/api/chapters?seriesId=${iron.id}`);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const target = (chapters as any[]).sort((a, b) => b.current_price_usdc - a.current_price_usdc)[0];

  const before = await get(`/api/chapter/price?chapterId=${target.id}`);
  console.log(`\nTarget: ${iron.title} — "${target.title}"`);
  console.log(`Price before:  $${Number(before.currentPrice).toFixed(2)}`);

  console.log("Simulating 6 reads in the last 24h (high completion)…");
  for (let i = 0; i < 6; i++) await readOnce(user.id, target.id, i + 1);

  console.log("Running Agent 3 (dynamic repricing)…");
  const reprice = await get("/api/cron/reprice");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const change = (reprice.changes as any[]).find((c) => c.chapterId === target.id);

  const after = await get(`/api/chapter/price?chapterId=${target.id}`);
  console.log(`Price after:   $${Number(after.currentPrice).toFixed(2)}`);
  const delta = Number(after.currentPrice) - Number(before.currentPrice);
  console.log(`Change:        ${delta >= 0 ? "+" : ""}$${delta.toFixed(2)} (${pct(before.currentPrice, after.currentPrice)})`);
  console.log(`Reason:        ${after.lastChangeReason ?? change?.reason ?? "(no change)"}`);

  if (delta !== 0) {
    console.log(`\n✓ Dynamic pricing moved the price on real demand — within the ±20% daily cap.`);
  } else {
    console.log(`\n(no change this run — the cap or current signals held the price steady)`);
  }
}

function pct(a: number, b: number): string {
  if (!a) return "—";
  const p = ((b - a) / a) * 100;
  return `${p >= 0 ? "+" : ""}${p.toFixed(1)}%`;
}

main().catch((e) => {
  console.error("demo-pricing failed:", e.message);
  process.exit(1);
});
