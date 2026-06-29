/**
 * Real on-chain funding for the autonomous reader agent (v3).
 *
 * The agent's wallet is a real Arc address (a viem keypair). Here we move actual
 * native USDC between the pooled treasury and that address, so the agent wallet
 * genuinely holds USDC you can scan on the explorer — funded weekly, returned at
 * week reset. Native USDC (18-decimal value token, also the gas token) is used so
 * the balance shows as the account's main balance on arcscan.
 *
 * Every call here is best-effort: the agent's ledger accounting is the source of
 * truth, and a failed transfer (unfunded treasury, RPC hiccup) never blocks a run.
 */
import { createPublicClient, createWalletClient, http, parseEther, formatEther, defineChain } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { ARC_TESTNET_RPC } from "@/lib/arc";

const arc = defineChain({
  id: 5042002,
  name: "Arc Testnet",
  nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 },
  rpcUrls: { default: { http: [ARC_TESTNET_RPC] } },
});

function pub() {
  return createPublicClient({ chain: arc, transport: http(ARC_TESTNET_RPC) });
}
function wallet(pk: string) {
  return createWalletClient({ account: privateKeyToAccount(pk as `0x${string}`), chain: arc, transport: http(ARC_TESTNET_RPC) });
}

/** Native USDC balance of an address (what you see when you scan it). */
export async function getOnchainUsdc(address: string): Promise<number> {
  const bal = await pub().getBalance({ address: address as `0x${string}` });
  return Number(formatEther(bal));
}

/** Treasury → agent wallet. Returns the tx hash. */
export async function fundAgentWalletOnchain(toAddress: string, amountUsd: number): Promise<string> {
  const pk = process.env.TREASURY_WALLET_PK;
  if (!pk) throw new Error("TREASURY_WALLET_PK not set");
  const w = wallet(pk);
  return w.sendTransaction({ to: toAddress as `0x${string}`, value: parseEther(amountUsd.toFixed(6)) });
}

/** Agent wallet → treasury (returns the unspent, leaving a little for gas). */
export async function returnAgentWalletOnchain(agentPk: string, toAddress: string, amountUsd: number): Promise<string> {
  const send = Math.max(0, amountUsd - 0.002); // gas headroom
  if (send <= 0) throw new Error("nothing to return");
  const w = wallet(agentPk);
  return w.sendTransaction({ to: toAddress as `0x${string}`, value: parseEther(send.toFixed(6)) });
}
