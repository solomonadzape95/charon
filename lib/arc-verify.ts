/**
 * On-chain deposit verification on Arc testnet.
 *
 * Reads a transaction receipt via the Arc RPC and confirms it actually moved
 * USDC into the treasury, by summing ERC-20 Transfer events whose recipient is
 * the treasury address. We credit the *verified on-chain amount*, never a
 * client-supplied figure — so a reader can't claim a deposit they didn't make.
 */
import { createPublicClient, http, getAddress } from "viem";
import { ARC_TESTNET_RPC, ARC_TESTNET_USDC } from "@/lib/arc";

export const ARC_CHAIN_ID = 5042002; // eip155:5042002

// keccak256("Transfer(address,address,uint256)")
const TRANSFER_TOPIC = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

const arcChain = {
  id: ARC_CHAIN_ID,
  name: "Arc Testnet",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: [ARC_TESTNET_RPC] } },
} as const;

let client: ReturnType<typeof createPublicClient> | null = null;
function rpc() {
  if (!client) client = createPublicClient({ chain: arcChain, transport: http(ARC_TESTNET_RPC) });
  return client;
}

/** Pad a 20-byte address to a 32-byte topic (lowercase, no checksum). */
function addressTopic(addr: string): string {
  return "0x" + "0".repeat(24) + addr.toLowerCase().replace(/^0x/, "");
}

export interface DepositVerification {
  ok: boolean;
  amountUsd?: number;
  from?: string;
  reason?: string;
}

/**
 * Verify that `txHash` is a confirmed, successful tx that transferred USDC to
 * `treasury`. Returns the total USDC credited to the treasury in that tx.
 */
export async function verifyUsdcDeposit(txHash: string, treasury: string): Promise<DepositVerification> {
  if (!/^0x[0-9a-fA-F]{64}$/.test(txHash)) return { ok: false, reason: "invalid transaction hash" };
  if (!treasury) return { ok: false, reason: "treasury address not configured" };

  let receipt;
  try {
    receipt = await rpc().getTransactionReceipt({ hash: txHash as `0x${string}` });
  } catch {
    return { ok: false, reason: "transaction not found yet — wait for it to confirm and retry" };
  }
  if (!receipt) return { ok: false, reason: "transaction not found yet — wait for it to confirm and retry" };
  if (receipt.status !== "success") return { ok: false, reason: "transaction failed on-chain" };

  const usdc = ARC_TESTNET_USDC.toLowerCase();
  const toTopic = addressTopic(treasury).toLowerCase();
  let totalMicros = 0n;
  let from: string | undefined;

  for (const log of receipt.logs) {
    if (log.address.toLowerCase() !== usdc) continue;
    if ((log.topics[0] ?? "").toLowerCase() !== TRANSFER_TOPIC) continue;
    if ((log.topics[2] ?? "").toLowerCase() !== toTopic) continue;
    totalMicros += BigInt(log.data); // uint256 amount, USDC has 6 decimals
    if (!from && log.topics[1]) {
      try {
        from = getAddress("0x" + log.topics[1].slice(-40));
      } catch {
        /* ignore */
      }
    }
  }

  if (totalMicros === 0n) {
    return { ok: false, reason: "no USDC transfer to the treasury found in this transaction" };
  }
  return { ok: true, amountUsd: Number(totalMicros) / 1_000_000, from };
}
