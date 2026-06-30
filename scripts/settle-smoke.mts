/**
 * Day-1 settlement smoke test: prove the Arc x402 rail still works end-to-end.
 * The treasury wallet pays the generic /api/settle endpoint to move $0.01 USDC
 * to a destination address. Set SETTLE_SMOKE_TO to settle to a specific wallet;
 * otherwise a throwaway recipient is generated each run.
 *
 * NOTE: the destination must NOT be the treasury itself — the Gateway rejects a
 * payer-pays-self transfer with `self_transfer`. That's why the default is a
 * fresh burner address, not TREASURY_WALLET_ADDRESS.
 *
 * Requires `npm run dev` running and the gateway funded (`npm run fund-gateway`).
 */
import { GatewayClient } from "@circle-fin/x402-batching/client";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";

const BASE = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
const pk = process.env.TREASURY_WALLET_PK;
if (!pk) {
  console.error("Missing TREASURY_WALLET_PK. Run `npm run generate-wallets`.");
  process.exit(1);
}
// Default to a fresh burner so we never self-transfer (Gateway: `self_transfer`).
const to = process.env.SETTLE_SMOKE_TO ?? privateKeyToAccount(generatePrivateKey()).address;
if (to.toLowerCase() === process.env.TREASURY_WALLET_ADDRESS?.toLowerCase()) {
  console.error("SETTLE_SMOKE_TO is the treasury address — that's a self-transfer the Gateway rejects. Use a different address.");
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
