# Charon — setup & verification

Follow in order. Steps marked **(you)** need your accounts/keys or a faucet UI.

## 1. Install
```bash
npm install
cp .env.example .env.local
```

## 2. Environment **(you)**
Fill in `.env.local`:
- **Supabase** — `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
  `SUPABASE_SERVICE_ROLE_KEY` (Project Settings → API).
- **Agent** — `OPENROUTER_API_KEY` (`OPENROUTER_MODEL` defaults to a free model).
- **Telegram** — `TELEGRAM_BOT_TOKEN` + `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME` from @BotFather;
  pick any `TELEGRAM_WEBHOOK_SECRET`.
- **Optional** — `CIRCLE_API_KEY` / `CIRCLE_ENTITY_SECRET` / `CIRCLE_WALLET_SET_ID`
  (real Programmable-Wallet escrow), `RESEND_API_KEY` (claim emails),
  `GITHUB_TOKEN`, `NEYNAR_API_KEY`.

## 3. Treasury wallet
```bash
npm run generate-wallets        # prints a fresh keypair
```
Put it in `.env.local` as `TREASURY_WALLET_PK` / `TREASURY_WALLET_ADDRESS`.
**(you)** Fund the address at <https://faucet.circle.com> → **Arc Testnet** (~20 USDC, every 2h), then:
```bash
npm run fund-gateway            # deposits a standing balance into the Gateway Wallet
```
(The funded v1 demo wallet is already wired in as the treasury — you can skip this if reusing it.)

## 4. Database **(you)**
Open the Supabase SQL editor and run [`supabase/schema.sql`](./supabase/schema.sql).
⚠️ This DROPs the v1 pay-per-article tables.

## 5. Run
```bash
npm run dev                     # web app
npm run bot                     # Telegram bot — long polling (local dev)
```

## 6. Verify end-to-end

**Settlement rail** (treasury → creator on Arc):
```bash
npm run spike                   # expect: status 200, 0.01 USDC, a settlement id
```

**Agent** (proposal only, no payment):
```bash
npm run agent-test              # Mirror URL (direct path) + blog URL (escrow path)
```

**Full flow:** `/dashboard` → sign up → deposit → **Connect Telegram** → in the bot
`/tip https://mirror.xyz/<author>/<post>` → tap **Confirm**. A high-confidence Mirror
match routes directly (tx on `testnet.arcscan.app`); a plain blog escrows and emails
a claim link (`/claim/<token>`). Watch `/stats` update live.

## 7. Deploy (Vercel)
```bash
npx vercel && npx vercel --prod
```
Add every `.env.local` value to the Vercel project, set `NEXT_PUBLIC_BASE_URL` to the
deployed URL, then register the Telegram webhook:
```bash
NEXT_PUBLIC_BASE_URL=https://your.app npm run set-webhook
```
