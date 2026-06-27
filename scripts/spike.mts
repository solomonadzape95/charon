/**
 * Day-1 settlement spike: pay our own $0.01 gated route with the agent wallet.
 * Requires `npm run dev` running and the gateway funded (`npm run fund-gateway`).
 */
import { GatewayClient } from "@circle-fin/x402-batching/client";

const BASE = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
const pk = process.env.TREASURY_WALLET_PK;
if (!pk) {
  console.error("Missing TREASURY_WALLET_PK. Run `npm run generate-wallets`.");
  process.exit(1);
}

const client = new GatewayClient({
  chain: "arcTestnet",
  privateKey: pk as `0x${string}`,
});

const url = `${BASE}/api/spike`;
console.log(`Paying ${url} ...`);
const start = Date.now();
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const res: any = await client.pay(url);
console.log(`status:   ${res.status}`);
console.log(`amount:   ${res.formattedAmount ?? res.amount} USDC`);
console.log(`settled:  ${Date.now() - start}ms`);
console.log("data:", res.data);
console.log(
  "\n✓ If you see a 200 + settlement above, the Arc rail works end-to-end.",
);
