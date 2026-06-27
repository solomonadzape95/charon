import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import fs from "node:fs";
import path from "node:path";

const envPath = path.resolve(".env.local");

const dim = (s: string) => `\x1b[2m${s}\x1b[22m`;
const bold = (s: string) => `\x1b[1m${s}\x1b[22m`;
const cyan = (s: string) => `\x1b[36m${s}\x1b[39m`;
const green = (s: string) => `\x1b[32m${s}\x1b[39m`;

function mint(label: string) {
  const privateKey = generatePrivateKey();
  const { address } = privateKeyToAccount(privateKey);
  console.log(`\n${bold(label)}`);
  console.log(`  ${dim("Address:    ")} ${cyan(address)}`);
  console.log(`  ${dim("Private key:")} ${cyan(privateKey)}`);
  return { address, privateKey };
}

const demo = mint("Demo wallet (pays for humans without MetaMask)");
const agent = mint("Agent wallet (autonomous research spend)");

const lines: Record<string, string> = {
  DEMO_WALLET_ADDRESS: demo.address,
  DEMO_WALLET_PK: demo.privateKey,
  AGENT_WALLET_ADDRESS: agent.address,
  AGENT_WALLET_PK: agent.privateKey,
};

let content = fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf-8") : "";
for (const [key, value] of Object.entries(lines)) {
  const line = `${key}=${value}`;
  const re = new RegExp(`^${key}=.*$`, "m");
  content = re.test(content)
    ? content.replace(re, line)
    : content.trimEnd() + "\n" + line;
}
fs.writeFileSync(envPath, content.trimEnd() + "\n");

console.log(`\n${green("Written to")} ${envPath}`);
console.log(`
${bold("Next:")}
  1. Fund BOTH addresses with testnet USDC at ${cyan("https://faucet.circle.com")} (select "Arc Testnet").
  2. Deposit into the Gateway Wallet:  ${cyan("npm run fund-gateway")}
  3. Prove settlement end-to-end:      ${cyan("npm run dev")} then ${cyan("npm run spike")}
`);
