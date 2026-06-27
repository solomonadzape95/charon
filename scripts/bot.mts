/**
 * Local dev: run the Telegram bot in long-polling mode (no public webhook needed).
 * Requires `npm run dev` running so the agent/payment libs hit the local API.
 * Run: npm run bot
 */
import { getBot } from "../lib/telegram.ts";

const bot = getBot();
await bot.api.deleteWebhook();
console.log("Charon bot started (long polling). Press Ctrl+C to stop.");
await bot.start({ onStart: (me) => console.log(`@${me.username} listening…`) });
