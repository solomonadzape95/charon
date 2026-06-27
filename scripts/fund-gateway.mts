/**
 * Deposit a standing USDC balance into the Gateway Wallet for the pooled
 * treasury. Run after funding the address at https://faucet.circle.com.
 */
import { GatewayClient } from "@circle-fin/x402-batching/client";

const DEPOSIT = process.env.DEPOSIT_AMOUNT ?? "2";

async function fund(label: string, pk: string | undefined) {
  if (!pk) {
    console.error(`✗ ${label}: missing private key in env`);
    return;
  }
  const client = new GatewayClient({
    chain: "arcTestnet",
    privateKey: pk as `0x${string}`,
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const before: any = await client.getBalances();
  console.log(
    `${label}: wallet=${before.wallet.formattedBalance ?? before.wallet.balance} gateway=${before.gateway.formattedAvailable}`,
  );
  console.log(`  depositing ${DEPOSIT} USDC into Gateway Wallet...`);
  const res = await client.deposit(DEPOSIT);
  console.log(`  ✓ deposit tx: ${res.depositTxHash ?? res}`);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const after: any = await client.getBalances();
  console.log(`  gateway available now: ${after.gateway.formattedAvailable}`);
}

await fund("TREASURY", process.env.TREASURY_WALLET_PK);
console.log("\nDone. Treasury ready to settle tips.");
