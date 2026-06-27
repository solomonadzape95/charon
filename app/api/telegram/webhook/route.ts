import { webhookCallback } from "grammy";
import { getBot } from "@/lib/telegram";

export const runtime = "nodejs";
export const maxDuration = 60; // agent tool-loop can take a while

// Build the handler lazily so importing this route at build time (when the bot
// token may be absent) doesn't throw during page-data collection.
type Handler = (req: Request) => Promise<Response>;
let handler: Handler | null = null;

export async function POST(req: Request): Promise<Response> {
  if (!handler) {
    handler = webhookCallback(getBot(), "std/http", {
      secretToken: process.env.TELEGRAM_WEBHOOK_SECRET,
    });
  }
  return handler(req);
}
