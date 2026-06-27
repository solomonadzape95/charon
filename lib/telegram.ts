/**
 * Charon Telegram bot (grammY). The primary reader action surface.
 *
 * Commands: /start [linkToken] · /tip <url> [amount] [comment] · /balance · /history · /topup
 *
 * /tip runs the agent to produce a proposal, eagerly resolves+stores the creator
 * (populating the identity graph), and asks the reader to confirm via inline
 * buttons. Confirmation executes the tip through lib/payments.ts.
 */
import { Bot, InlineKeyboard } from "grammy";
import { ARC_EXPLORER } from "@/lib/arc";
import { analyzeTip } from "@/lib/agent";
import { detectPlatform } from "@/lib/identity";
import { executeTip } from "@/lib/payments";
import {
  createPendingTip,
  deletePendingTip,
  getCreatorById,
  getPendingTip,
  getUserByTelegramId,
  linkTelegram,
  listTipsForUser,
  upsertCreatorByIdentities,
} from "@/lib/db";

function baseUrl(): string {
  return process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
}

let bot: Bot | null = null;

export function getBot(): Bot {
  if (!process.env.TELEGRAM_BOT_TOKEN) throw new Error("TELEGRAM_BOT_TOKEN not set");
  if (bot) return bot;

  bot = new Bot(process.env.TELEGRAM_BOT_TOKEN);

  bot.command("start", async (ctx) => {
    const token = ctx.match?.trim();
    const tgId = String(ctx.from!.id);
    if (token) {
      const user = await linkTelegram(token, tgId);
      if (user) {
        await ctx.reply("✅ Your Telegram is linked to Charon. Send /tip <url> to tip a creator.");
        return;
      }
      await ctx.reply("That link has expired or was already used. Grab a fresh one from your dashboard.");
      return;
    }
    await ctx.reply(
      "ⲭ Welcome to Charon — tip any creator on the internet, instantly.\n\n" +
        `First, link your account: open ${baseUrl()}/dashboard, sign up, and tap “Connect Telegram”.\n\n` +
        "Then just send:\n/tip <url> [amount] [comment]\n\nOther commands: /balance · /history · /topup",
    );
  });

  bot.command("balance", async (ctx) => {
    const user = await getUserByTelegramId(String(ctx.from!.id));
    if (!user) return void (await replyLink(ctx));
    await ctx.reply(`💰 Your Charon balance: $${Number(user.balance_usd).toFixed(2)}\nSession cap: $${Number(user.session_cap_usd).toFixed(2)}`);
  });

  bot.command("history", async (ctx) => {
    const user = await getUserByTelegramId(String(ctx.from!.id));
    if (!user) return void (await replyLink(ctx));
    const tips = await listTipsForUser(user.id, 10);
    if (!tips.length) return void (await ctx.reply("No tips yet. Send /tip <url> to get started."));
    const lines = tips.map((t) => {
      const icon = t.status === "sent" ? "✅" : t.status === "escrowed" ? "📩" : t.status === "claimed" ? "🎉" : "•";
      return `${icon} $${Number(t.amount_usd).toFixed(2)} — ${t.platform ?? "web"} — ${t.url.slice(0, 48)}`;
    });
    await ctx.reply(`Last ${tips.length} tips:\n\n${lines.join("\n")}`);
  });

  bot.command("topup", async (ctx) => {
    await ctx.reply(`Top up your balance here:\n${baseUrl()}/dashboard`);
  });

  bot.command("tip", async (ctx) => {
    const tgId = String(ctx.from!.id);
    const user = await getUserByTelegramId(tgId);
    if (!user) return void (await replyLink(ctx));

    const parsed = parseTipArgs(ctx.match ?? "");
    if (!parsed.url) return void (await ctx.reply("Usage: /tip <url> [amount] [comment]"));

    const thinking = await ctx.reply("🔎 Identifying the creator and sizing the tip…");
    let proposal;
    try {
      proposal = await analyzeTip(parsed.url, parsed.amount, parsed.comment);
    } catch (e) {
      await ctx.api.editMessageText(ctx.chat!.id, thinking.message_id, `Agent error: ${(e as Error).message}`);
      return;
    }

    if (!proposal.bestWallet && !proposal.bestEmail) {
      const msg = proposal.creatorName
        ? `I identified the creator (${proposal.creatorName}), but couldn't find a wallet or contact to route a tip to.\n\n` +
          `Tipping works best on Mirror, ENS-hosted sites (name.eth), or GitHub profiles that list a wallet.`
        : `I couldn't confidently identify the creator of that page.\n\n${proposal.reasoning}\n\n` +
          `Try a Mirror article, an ENS-hosted site (name.eth.limo), or a GitHub repo.`;
      await ctx.api.editMessageText(ctx.chat!.id, thinking.message_id, msg);
      return;
    }

    // Eagerly resolve + persist the creator (identity graph) so confirm is cheap.
    const creator = await upsertCreatorByIdentities({
      name: proposal.creatorName,
      email: proposal.bestEmail,
      walletAddress: proposal.bestWallet,
      identities: proposal.identities.map((i) => ({
        platform: i.source,
        handle: i.handle,
        address: i.address,
        confidence: i.confidence,
      })),
    });

    const pending = await createPendingTip({
      telegramId: tgId,
      chatId: String(ctx.chat!.id),
      url: parsed.url,
      comment: parsed.comment,
      suggestedAmount: proposal.suggestedAmount,
      creatorId: creator.id,
      confidence: proposal.confidence,
      action: proposal.action,
      agentReasoning: proposal.reasoning,
    });

    const routeWord = proposal.confidence >= 95 && proposal.bestWallet ? "routed directly" : "held in escrow + claim email sent";
    const who = proposal.creatorName ?? creator.wallet_address ?? "the creator";
    const kb = new InlineKeyboard()
      .text(`✅ Send $${proposal.suggestedAmount.toFixed(2)}`, `confirm:${pending.id}`)
      .text("✕ Cancel", `cancel:${pending.id}`);

    await ctx.api.editMessageText(
      ctx.chat!.id,
      thinking.message_id,
      `Creator: ${who}\nVia: ${proposal.platform} · ${proposal.confidence}% confidence\n\n` +
        `💡 ${proposal.reasoning}\n\nSuggested tip: $${proposal.suggestedAmount.toFixed(2)} (will be ${routeWord}).`,
      { reply_markup: kb },
    );
  });

  bot.on("callback_query:data", async (ctx) => {
    const [kind, pendingId] = ctx.callbackQuery.data.split(":");
    const pending = await getPendingTip(pendingId);
    if (!pending) {
      await ctx.answerCallbackQuery({ text: "This request expired." });
      return;
    }

    if (kind === "cancel") {
      await deletePendingTip(pendingId);
      await ctx.answerCallbackQuery({ text: "Cancelled." });
      await ctx.editMessageText("Tip cancelled.");
      return;
    }

    if (kind === "confirm") {
      await ctx.answerCallbackQuery({ text: "Sending…" });
      const user = await getUserByTelegramId(pending.telegram_id);
      const creator = pending.creator_id ? await getCreatorById(pending.creator_id) : null;
      if (!user || !creator) {
        await ctx.editMessageText("Couldn't complete — account or creator missing.");
        return;
      }
      const result = await executeTip({
        userId: user.id,
        creator,
        url: pending.url,
        platform: detectPlatform(pending.url),
        amountUsd: Number(pending.suggested_amount),
        confidence: Number(pending.confidence ?? 0),
        agentReasoning: pending.agent_reasoning,
      });
      await deletePendingTip(pendingId);

      if (result.status === "sent") {
        const link = result.txHash ? `\n${ARC_EXPLORER}/tx/${result.txHash}` : "";
        await ctx.editMessageText(`✅ Sent $${Number(pending.suggested_amount).toFixed(2)} to the creator on Arc.${link}`);
      } else if (result.status === "escrowed") {
        await ctx.editMessageText(
          `📩 $${Number(pending.suggested_amount).toFixed(2)} is held in escrow. We've notified the creator with a claim link.`,
        );
      } else {
        await ctx.editMessageText(`Couldn't send: ${result.reason ?? "unknown error"}`);
      }
    }
  });

  return bot;
}

/**
 * Push a message to a linked reader's Telegram DM. Used by the browser extension
 * flow so a tip sent from the browser also lands as a bot confirmation. No-op if
 * the bot token isn't configured. For private chats the Telegram user id == chat id.
 */
export async function notifyUser(telegramId: string, text: string): Promise<void> {
  if (!process.env.TELEGRAM_BOT_TOKEN) return;
  try {
    await getBot().api.sendMessage(telegramId, text);
  } catch {
    /* best-effort — never block a tip on a failed notification */
  }
}

async function replyLink(ctx: { reply: (s: string) => Promise<unknown> }): Promise<void> {
  await ctx.reply(`You're not linked yet. Open ${baseUrl()}/dashboard, sign up, and tap “Connect Telegram”.`);
}

export function parseTipArgs(raw: string): { url?: string; amount?: number; comment?: string } {
  const tokens = raw.trim().split(/\s+/).filter(Boolean);
  const url = tokens.find((t) => /^https?:\/\//i.test(t));
  if (!url) return {};
  const rest = tokens.filter((t) => t !== url);
  let amount: number | undefined;
  if (rest[0]) {
    const m = rest[0].match(/^\$?(\d+(?:\.\d+)?)$/);
    if (m) {
      amount = Number(m[1]);
      rest.shift();
    }
  }
  const comment = rest.join(" ") || undefined;
  return { url, amount, comment };
}
