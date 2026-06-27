/**
 * Day-1 settlement smoke test: prove the Arc x402 rail still works end-to-end.
 * The treasury wallet pays the generic /api/settle endpoint to move $0.01 USDC
 * to a destination address (defaults to the treasury's own address — a no-op
 * round trip that still exercises verify + settle on Arc).
 *
 * Requires `npm run dev` running and the gateway funded (`npm run fund-gateway`).
 */
import { GatewayClient } from "@circle-fin/x402-batching/client";

const BASE = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
const pk = process.env.TREASURY_WALLET_PK;
const to = process.env.SETTLE_SMOKE_TO ?? process.env.TREASURY_WALLET_ADDRESS;
if (!pk || !to) {
  console.error("Missing TREASURY_WALLET_PK / TREASURY_WALLET_ADDRESS. Run `npm run generate-wallets`.");
  process.exit(1);
}

const client = new GatewayClient({ chain: "arcTestnet", privateKey: pk as `0x${string}` });

const url = `${BASE}/api/settle?to=${encodeURIComponent(to)}&amount=0.01`;
console.log(`Settling $0.01 → ${to}\n  via ${url} ...`);
const start = Date.now();
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const res: any = await client.pay(url);
console.log(`status:   ${res.status}`);
console.log(`amount:   ${res.formattedAmount ?? res.amount} USDC`);
console.log(`settled:  ${Date.now() - start}ms`);
console.log("data:", res.data);
console.log("\n✓ A 200 + settlement above means the Arc rail works end-to-end.");
