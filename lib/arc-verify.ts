/**
 * On-chain deposit verification on Arc testnet.
 *
 * Reads a transaction receipt via the Arc RPC and confirms it actually moved
 * USDC into the treasury. We credit the *verified on-chain amount*, never a
 * client-supplied figure — so a reader can't claim a deposit they didn't make.
 *
 * Arc has two USDC representations:
 *   - NATIVE USDC (18 decimals) at the system address 0xff..fe — this is the gas
 *     token and what plain wallet sends / the faucet use. Native transfers emit a
 *     Transfer event from that system contract.
 *   - ERC-20 USDC (6 decimals) at 0x3600..00 — the x402 Gateway/batching rail.
 * Readers deposit with native USDC, so that's the primary path; we accept both.
 */
import { createPublicClient, http, getAddress } from "viem";
import { ARC_TESTNET_RPC, ARC_TESTNET_USDC } from "@/lib/arc";

export const ARC_CHAIN_ID = 5042002; // eip155:5042002

// keccak256("Transfer(address,address,uint256)")
const TRANSFER_TOPIC = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

// Native USDC (gas token) system contract — emits Transfer on plain value sends.
const NATIVE_USDC = "0xfffffffffffffffffffffffffffffffffffffffe";
const NATIVE_DECIMALS = 18n;
const ERC20_DECIMALS = 6n;

const arcChain = {
  id: ARC_CHAIN_ID,
  name: "Arc Testnet",
  nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 },
  rpcUrls: { default: { http: [ARC_TESTNET_RPC] } },
} as const;

let client: ReturnType<typeof createPublicClient> | null = null;
function rpc() {
  if (!client) client = createPublicClient({ chain: arcChain, transport: http(ARC_TESTNET_RPC) });
  return client;
}

function addressTopic(addr: string): string {
  return ("0x" + "0".repeat(24) + addr.toLowerCase().replace(/^0x/, "")).toLowerCase();
}

/** Scale an integer token amount to a USD number given its decimals. */
function toUsd(amount: bigint, decimals: bigint): number {
  // Preserve 6 dp of precision regardless of token decimals.
  const micros = decimals >= 6n ? amount / 10n ** (decimals - 6n) : amount * 10n ** (6n - decimals);
  return Number(micros) / 1_000_000;
}

export interface DepositVerification {
  ok: boolean;
  amountUsd?: number;
  from?: string;
  reason?: string;
}

/**
 * Verify that `txHash` is a confirmed, successful tx that transferred USDC
 * (native or ERC-20) to `treasury`. Returns the total USDC credited.
 */
export async function verifyUsdcDeposit(txHash: string, treasury: string): Promise<DepositVerification> {
  if (!/^0x[0-9a-fA-F]{64}$/.test(txHash)) return { ok: false, reason: "invalid transaction hash" };
  if (!treasury) return { ok: false, reason: "treasury address not configured" };
  const treasuryLc = treasury.toLowerCase();

  let receipt;
  try {
    receipt = await rpc().getTransactionReceipt({ hash: txHash as `0x${string}` });
  } catch {
    return { ok: false, reason: "transaction not found yet — wait for it to confirm and retry" };
  }
  if (!receipt) return { ok: false, reason: "transaction not found yet — wait for it to confirm and retry" };
  if (receipt.status !== "success") return { ok: false, reason: "transaction failed on-chain" };

  const erc20 = ARC_TESTNET_USDC.toLowerCase();
  const toTopic = addressTopic(treasury);
  let totalUsd = 0;
  let from: string | undefined;

  // Primary: sum USDC Transfer events (native @ 18dp or ERC-20 @ 6dp) to treasury.
  for (const log of receipt.logs) {
    const addr = log.address.toLowerCase();
    const decimals = addr === NATIVE_USDC ? NATIVE_DECIMALS : addr === erc20 ? ERC20_DECIMALS : null;
    if (decimals === null) continue;
    if ((log.topics[0] ?? "").toLowerCase() !== TRANSFER_TOPIC) continue;
    if ((log.topics[2] ?? "").toLowerCase() !== toTopic) continue;
    totalUsd += toUsd(BigInt(log.data), decimals);
    if (!from && log.topics[1]) {
      try {
        from = getAddress("0x" + log.topics[1].slice(-40));
      } catch {
        /* ignore */
      }
    }
  }

  // Fallback: a plain native value transfer straight to the treasury.
  if (totalUsd === 0) {
    try {
      const tx = await rpc().getTransaction({ hash: txHash as `0x${string}` });
      if (tx && tx.to && tx.to.toLowerCase() === treasuryLc && tx.value > 0n) {
        totalUsd = toUsd(tx.value, NATIVE_DECIMALS);
        from = tx.from;
      }
    } catch {
      /* ignore */
    }
  }

  if (totalUsd === 0) {
    return { ok: false, reason: "no USDC transfer to the treasury found in this transaction" };
  }
  return { ok: true, amountUsd: totalUsd, from };
}
