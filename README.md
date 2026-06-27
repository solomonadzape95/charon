# ⲭ Charon

**Tip any creator on the internet, instantly — even if they've never signed up.**

Paste any URL in Telegram. Charon's agent identifies the creator, finds their
wallet across ENS / Mirror / GitHub / Farcaster, sizes a fair tip from the
content's depth, and routes a USDC nanopayment — settled in under 500ms on Arc.
If the creator has no wallet, Charon holds the funds in escrow and emails them a
claim link. The creator comes to you.

> Lepton Agents Hackathon · Canteen × Circle × Arc · Track RFB-06

## How it works

1. **Top up once** — deposit USDC into your Charon balance (prepaid, like Uber).
   Funds sit in a pooled Arc treasury; tips debit a ledger silently.
2. **Send a URL** — `/tip <url> [amount] [comment]` in Telegram. The agent runs a
   multi-step loop: fetch → identify creator → search wallets → score confidence
   → estimate value → propose. You confirm with one tap.
3. **The creator gets paid** — confidence ≥95% with a known wallet → routed
   directly on Arc. Otherwise → held in escrow (a Circle Programmable Wallet is
   provisioned for them) + a claim email is sent.

## Architecture

| Concern | Implementation |
|---|---|
| Agent | OpenRouter (default `qwen/qwen3-next-80b-a3b-instruct:free`) — `lib/agent.ts` |
| Identity | ENS (viem), Mirror (on-chain), GitHub, Farcaster — `lib/identity.ts` |
| Reader balance | Supabase ledger over a pooled Arc treasury — `lib/payments.ts` |
| Settlement | x402 + Arc via Circle's batching Facilitator — `lib/arc.ts`, `lib/payer.ts`, `app/api/settle` |
| Creator escrow | Circle Programmable Wallets (guarded; ledger-only fallback) — `lib/circle.ts` |
| Bot | grammY, webhook on Vercel / long-poll locally — `lib/telegram.ts` |
| Claim emails | Resend (digest model; no-op without a key) — `lib/email.ts` |
| Frontend | Next.js 16 App Router + Tailwind 4 |

The hybrid wallet model: **reader balances are a ledger over the Arc treasury**
(reuses the proven x402 rail); **creator escrow uses real Circle Programmable
Wallets** so the claim/withdraw flow is authentically Circle. Both rails are
testnet — the app ledger is the source of truth for amounts owed.

## Setup

1. **Install**
   ```bash
   npm install
   cp .env.example .env.local   # then fill in the keys below
   ```

2. **Apply the database schema** — open the Supabase SQL editor and run
   [`supabase/schema.sql`](supabase/schema.sql). (This DROPs the v1 tables.)

3. **Keys** (`.env.local`):
   - `OPENROUTER_API_KEY` — the agent (`OPENROUTER_MODEL` defaults to a free model).
   - `TELEGRAM_BOT_TOKEN` + `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME` — from @BotFather.
   - `TREASURY_WALLET_PK/ADDRESS` — pooled treasury. `npm run generate-wallets`,
     then fund the address at https://faucet.circle.com (Arc Testnet) and
     `npm run fund-gateway`.
   - *Optional:* `CIRCLE_API_KEY` / `CIRCLE_ENTITY_SECRET` / `CIRCLE_WALLET_SET_ID`
     (enables real Programmable-Wallet escrow; ledger-only escrow without them),
     `RESEND_API_KEY` (claim emails), `GITHUB_TOKEN`, `NEYNAR_API_KEY`.

4. **Run**
   ```bash
   npm run dev          # web app
   npm run bot          # Telegram bot (long polling, local dev)
   ```
   For production: deploy to Vercel, then `NEXT_PUBLIC_BASE_URL=https://you.app npm run set-webhook`.

## Verify

```bash
npm run spike        # proves the Arc settlement rail end-to-end
npm run agent-test   # runs the tipping agent on a Mirror + a blog URL (proposal only)
```

Then end-to-end: sign up at `/dashboard` → deposit → link Telegram → `/tip <mirror-url>`
→ confirm → the creator's balance updates and the Arc tx appears on
`testnet.arcscan.app`. A plain blog URL takes the escrow + claim path (`/claim/<token>`).

## Commands

`/tip <url> [amount] [comment]` · `/balance` · `/history` · `/topup` · `/start [linkToken]`
