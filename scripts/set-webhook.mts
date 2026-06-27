/**
 * Register the Telegram webhook to this deployment.
 * Run: NEXT_PUBLIC_BASE_URL=https://your.app npm run set-webhook
 */
import { getBot } from "../lib/telegram.ts";

const base = process.env.NEXT_PUBLIC_BASE_URL;
if (!base || base.includes("localhost")) {
  console.error("Set NEXT_PUBLIC_BASE_URL to a public https URL first.");
  process.exit(1);
}
const bot = getBot();
const url = `${base}/api/telegram/webhook`;
await bot.api.setWebhook(url, { secret_token: process.env.TELEGRAM_WEBHOOK_SECRET });
console.log(`Webhook set → ${url}`);
