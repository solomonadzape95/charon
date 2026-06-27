/**
 * Exercise the tipping agent end-to-end (proposal only, no payment).
 * Run: npm run agent-test -- <url> [amount] [comment]
 * Defaults to a Mirror article (direct-route path) + a plain blog (escrow path).
 */
import { analyzeTip } from "@/lib/agent";

const arg = process.argv.slice(2);
const urls = arg.length
  ? [{ url: arg[0], amount: arg[1] ? Number(arg[1]) : undefined, comment: arg.slice(2).join(" ") || undefined }]
  : [
      { url: "https://mirror.xyz/vitalik.eth", amount: undefined, comment: undefined },
      { url: "https://overreacted.io/a-complete-guide-to-useeffect/", amount: undefined, comment: "saved me hours" },
    ];

for (const { url, amount, comment } of urls) {
  console.log(`\n── ${url} ──`);
  const p = await analyzeTip(url, amount, comment);
  console.log(JSON.stringify(p, null, 2));
}
