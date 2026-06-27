/**
 * Server-side x402 payer. Wraps GatewayClient so the demo (human-fallback)
 * wallet and the agent wallet can autonomously pay our gated endpoints.
 *
 * Both wallets are funded once from the Circle faucet and keep a standing
 * balance deposited in the Gateway Wallet (see scripts/fund-gateway.mts).
 */
import { GatewayClient } from "@circle-fin/x402-batching/client";

export type PayResult = {
  status: number;
  data: unknown;
  /** USDC paid, as a decimal string, e.g. "0.05" */
  amount: string;
  transaction?: string;
};

const clients = new Map<string, GatewayClient>();

function clientFor(privateKey: string): GatewayClient {
  let c = clients.get(privateKey);
  if (!c) {
    c = new GatewayClient({
      chain: "arcTestnet",
      privateKey: privateKey as `0x${string}`,
    });
    clients.set(privateKey, c);
  }
  return c;
}

/** Pay an x402-gated URL. The GatewayClient handles 402 detection + EIP-712 signing + retry. */
export async function payUrl(
  privateKey: string,
  url: string,
  opts: { method?: "GET" | "POST"; body?: unknown } = {},
): Promise<PayResult> {
  const client = clientFor(privateKey);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const res: any = await client.pay(url, {
    method: opts.method ?? "GET",
    body: opts.body,
  });
  const amount: string =
    res.formattedAmount ??
    (res.amount ? (Number(res.amount) / 1e6).toString() : "0");
  return {
    status: res.status ?? 200,
    data: res.data,
    amount,
    transaction: res.transaction ?? res.settlementId,
  };
}

/** Ensure the wallet has a standing Gateway deposit; tops up if below threshold. */
export async function ensureGatewayBalance(
  privateKey: string,
  depositUsdc = "1",
  thresholdAtomic = 500_000n,
): Promise<{ available: string }> {
  const client = clientFor(privateKey);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const balances: any = await client.getBalances();
  if (balances.gateway.available < thresholdAtomic) {
    await client.deposit(depositUsdc);
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updated: any = await client.getBalances();
  return { available: updated.gateway.formattedAvailable };
}
