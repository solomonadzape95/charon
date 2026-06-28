import { NextResponse } from "next/server";
import { ARC_TESTNET_RPC, ARC_TESTNET_USDC, ARC_EXPLORER } from "@/lib/arc";
import { ARC_CHAIN_ID } from "@/lib/arc-verify";

export const runtime = "nodejs";

/**
 * Public deposit config for the client deposit panel (treasury address + chain).
 *   GET /api/deposit/info
 */
export async function GET() {
  const treasuryAddress = process.env.TREASURY_WALLET_ADDRESS ?? null;
  return NextResponse.json({
    treasuryAddress,
    usdcAddress: ARC_TESTNET_USDC,
    chainId: ARC_CHAIN_ID,
    chainIdHex: "0x" + ARC_CHAIN_ID.toString(16),
    rpcUrl: ARC_TESTNET_RPC,
    explorer: ARC_EXPLORER,
    network: "Arc Testnet",
  });
}
