/**
 * Circle Programmable Wallets (developer-controlled) — creator escrow vault.
 *
 * Role in the hybrid model: reader balances are a ledger over the Arc treasury
 * (see lib/payments.ts). When a tip can't be routed directly (creator has no
 * known wallet / low confidence), we provision a *real* Circle Programmable
 * Wallet for that creator as their managed escrow + claim wallet, and the
 * creator later withdraws from it.
 *
 * GUARDED: if CIRCLE_API_KEY / CIRCLE_ENTITY_SECRET / CIRCLE_WALLET_SET_ID are
 * unset, `circleEnabled()` is false and the payments layer falls back to a
 * pure-ledger escrow (funds tracked in creators.balance_usd, held in the Arc
 * treasury). This is the documented safety net — the app works either way.
 *
 * Cross-chain note (testnet): the Arc treasury and Circle sandbox PWs may live
 * on different testnets. On testnet we treat them as parallel rails — the app
 * ledger is the source of truth for "how much is owed"; the Circle PW is the
 * authentic managed-wallet artifact for the claim/withdraw demo.
 */
import {
  initiateDeveloperControlledWalletsClient,
  type Blockchain,
} from "@circle-fin/developer-controlled-wallets";

export function circleEnabled(): boolean {
  return Boolean(
    process.env.CIRCLE_API_KEY &&
      process.env.CIRCLE_ENTITY_SECRET &&
      process.env.CIRCLE_WALLET_SET_ID,
  );
}

const BLOCKCHAIN = (process.env.CIRCLE_WALLET_BLOCKCHAIN ?? "ARB-SEPOLIA") as Blockchain;

type CircleClient = ReturnType<typeof initiateDeveloperControlledWalletsClient>;
let client: CircleClient | null = null;

function getClient(): CircleClient {
  if (!circleEnabled()) throw new Error("Circle Programmable Wallets not configured");
  if (!client) {
    client = initiateDeveloperControlledWalletsClient({
      apiKey: process.env.CIRCLE_API_KEY!,
      entitySecret: process.env.CIRCLE_ENTITY_SECRET!,
    });
  }
  return client;
}

export interface NewWallet {
  walletId: string;
  address: string;
}

/** Provision a fresh Programmable Wallet for a creator's escrow. */
export async function createCreatorWallet(refId: string): Promise<NewWallet> {
  const res = await getClient().createWallets({
    walletSetId: process.env.CIRCLE_WALLET_SET_ID!,
    blockchains: [BLOCKCHAIN],
    count: 1,
    accountType: "SCA",
    metadata: [{ refId }],
  });
  const w = res.data?.wallets?.[0];
  if (!w) throw new Error("Circle createWallets returned no wallet");
  return { walletId: w.id, address: w.address };
}

/** Read the USDC balance of a wallet, as a decimal number. */
export async function getUsdcBalance(walletId: string): Promise<number> {
  const res = await getClient().getWalletTokenBalance({ id: walletId });
  const usdc = res.data?.tokenBalances?.find(
    (t) => t.token?.symbol?.toUpperCase().includes("USDC"),
  );
  return usdc ? Number(usdc.amount) : 0;
}

/** Find the USDC token id held by a wallet (needed to build a transfer). */
async function usdcTokenId(walletId: string): Promise<string | null> {
  const res = await getClient().getWalletTokenBalance({ id: walletId });
  const usdc = res.data?.tokenBalances?.find(
    (t) => t.token?.symbol?.toUpperCase().includes("USDC"),
  );
  return usdc?.token?.id ?? null;
}

export interface WithdrawResult {
  txId: string;
  state: string;
}

/** Withdraw USDC from a creator's escrow wallet to an external address. */
export async function withdraw(
  walletId: string,
  destinationAddress: string,
  amountUsd: number,
): Promise<WithdrawResult> {
  const tokenId = await usdcTokenId(walletId);
  if (!tokenId) throw new Error("no USDC token balance to withdraw");
  const res = await getClient().createTransaction({
    walletId,
    tokenId,
    destinationAddress,
    amount: [amountUsd.toFixed(6)],
    fee: { type: "level", config: { feeLevel: "MEDIUM" } },
  });
  return { txId: res.data?.id ?? "", state: res.data?.state ?? "unknown" };
}
