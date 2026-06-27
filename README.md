# Charon

### Read freely. Pay for what it's worth. Creators earn every chapter.

A nanopayment reading platform where AI agents settle what every chapter was truly
worth. Readers deposit USDC once and read webnovels and manga with no paywalls;
after each session a reading-intelligence agent values the session by genuine
engagement and settles a fair nanopayment to the creator on **Arc** via **x402**.

> *Charon — the ferryman took one coin per crossing. Every chapter is a crossing. The coin is automatic.*

Built for the Lepton Agents Hackathon (Canteen × Circle × Arc) ·
RFB 06 Creator Monetization + RFB 01 Autonomous Paying Agents.

---

## The four agents

| Agent | Fires | What it does |
|---|---|---|
| **1 · Reading Intelligence** (`lib/agents/reading.ts`) | after every session | Scores engagement (time vs expected read, completion, scroll-back re-reads, binge depth, loyalty, reader comment), reasons a fair value, and settles USDC to the creator. |
| **2 · Creator Pricing** (`lib/agents/pricing.ts`) | on chapter upload | Sets a base price from word count, genre benchmarks, series following + momentum. Creator can override. |
| **3 · Dynamic Repricing** (`lib/agents/repricing.ts`) | hourly cron | Adjusts each chapter's price from demand, time decay, momentum, completion + re-read signals — capped at ±20%/day, never below floor. |
| **4 · Budget Allocation** (`lib/agents/budget.ts`) | reader dashboard + daily cron | Tracks reading pace, warns on low balance, suggests a calibrated top-up, and flags series where pre-release mode fits. |

Every agent makes a single structured-JSON decision (Claude via OpenRouter) over
deterministically-gathered signals, with a deterministic fallback so the loop
always completes. **All money math is enforced in code** (`lib/pricing.ts`) — the
model only chooses direction, magnitude, and the one-sentence reasoning shown in
the UI.

## Payment modes

1. **Post-reading settlement** (default) — read first, the agent settles fair value after.
2. **Pre-release** — subscribers are auto-charged and unlocked the instant a chapter drops.
3. **Series unlock** — one discounted payment unlocks a completed series; sessions stop charging.

## Architecture

```
Reader ──reads──▶ Chapter UI ──tracks──▶ /api/session/end
   │                (time, scroll, re-reads, binge)     │
   │                                                     ▼
   │                                        Agent 1 (Reading Intelligence)
   │                                                     │ fair amount + reasoning
   ▼                                                     ▼
 ledger (Supabase) ◀── debit ──────────────  settleSession()  ── x402 ──▶ /api/settle
                                                     │                  (treasury pays)
                                                     ▼                        │
                                          payments + loyalty           Arc testnet ──▶ creator wallet
                                                     │                        │  (or escrow → Circle PW)
                                                     ▼                        ▼
                                       Creator dashboard (realtime balance ticks up)
```

- **Reader balances** are a Supabase ledger over a pooled Arc **treasury** wallet.
- **Settlement** is the proven x402 path: the treasury pays the gated `/api/settle`
  endpoint, moving USDC to the creator's Arc address (`lib/arc.ts`, `lib/payer.ts`).
- **Escrow / offramp**: creators without a wallet accrue escrow + get a **Circle
  Programmable Wallet** (`lib/circle.ts`); they withdraw to wallet or bank.

## Stack

Next.js 16 (App Router) · Tailwind 4 · Supabase (Postgres) · Claude via OpenRouter ·
Circle Programmable Wallets · Arc nanopayments + x402 · Vercel.

## Run it

```bash
npm install
cp .env.example .env.local            # fill in keys

# 1. Apply the schema — paste supabase/schema.sql into the Supabase SQL editor
# 2. Create + fund the Arc treasury wallet
npm run generate-wallets              # writes TREASURY_WALLET_* (then faucet.circle.com → Arc testnet)
npm run dev

# 3. Verify the rail, then seed demo content
npm run settle-smoke                  # treasury settles $0.01 on Arc, prints a tx hash
npm run seed                          # demo creator + "Iron Ascension" / "The Lantern Court" + funded reader
```

Then open `/read`, sign up a reader in `/dashboard` (deposit a balance), read a
chapter, and watch the session summary + the creator dashboard balance tick up live.

### Scripts
- `npm run generate-wallets` — create the Arc treasury wallet
- `npm run fund-gateway` — top up the treasury's x402 Gateway deposit
- `npm run settle-smoke` — prove the Arc settlement rail end-to-end
- `npm run seed` — seed demo creator, series, chapters, and a funded reader

### Cron (Vercel)
`vercel.json` schedules Agent 3 (`/api/cron/reprice`, hourly) and Agent 4
(`/api/cron/budget`, daily). Set `CRON_SECRET` in Vercel; trigger Agent 3 locally
with `/api/cron/reprice?key=$CRON_SECRET`.

## Routes

`/` landing · `/read` browse · `/series/[id]` · `/chapter/[id]` reader ·
`/dashboard` reader wallet · `/creator` upload hub · `/creator/dashboard`
live earnings · `/stats` public live stats.
