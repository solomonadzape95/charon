# Charon

### Read freely. Pay for what it's worth. Creators earn every chapter.

A nanopayment reading platform for webnovels and manga. Readers deposit USDC once
and read without hitting a paywall; when you finish a chapter, Charon settles its current
(engagement-adjusted) price to the creator on **Arc** via **x402** — pay once per
chapter, re-reads free. You can also hand the reading to an **autonomous agent**
that learns your taste, holds a weekly budget, and discovers and pays for chapters
on your behalf.

> *Charon — the ferryman took one coin per crossing. Every chapter is a crossing. The coin is automatic.*

Built for the Lepton Agents Hackathon (Canteen × Circle × Arc) ·
RFB 06 Creator Monetization + RFB 01 Autonomous Paying Agents.

![Charon landing](public/screenshots/hero.png)

---

## The agents

Charon runs a handful of agents. Each makes a single structured-JSON decision
(Claude via OpenRouter) over deterministically-gathered signals, with a
**deterministic fallback** so the loop always completes. **All money math is
enforced in code** (`lib/pricing.ts`) — the model only chooses direction,
magnitude, and the one-sentence reasoning shown in the UI.

| Agent | Fires | What it does |
|---|---|---|
| **Creator Pricing** (`lib/agents/pricing.ts`) | on chapter upload | Sets a base price from word count, genre benchmarks, series following + momentum. Creator can override. |
| **Dynamic Repricing** (`lib/agents/repricing.ts`) | hourly cron (`/api/cron/reprice`) | Adjusts each chapter's price from demand, time decay, momentum, completion + re-read signals — capped at ±20%/day, never below floor. |
| **Budget Allocation** (`lib/agents/budget.ts`) | reader dashboard (`/api/me/budget`) + daily cron (`/api/cron/budget`) | Tracks reading pace, warns on low balance, suggests a calibrated top-up, and flags series where pre-release mode fits. |
| **Autonomous Reader Agent** (`lib/agents/reader-agent.ts`) | `/agent` "Run now" + fleet cron (`/api/cron/agent`) | Holds a learned taste profile + weekly budget and discovers, evaluates, and **pays** for chapters on the reader's behalf — within budget, over the same Arc / x402 rail (tagged `caller_type = 'agent'`, 7% fee that funds the agent itself). |

The reader agent gets its **own real on-chain wallet** (`lib/agent-wallet.ts`): a
real Arc keypair funded each week from the reader's balance with native USDC on
Arc testnet (scannable on arcscan), with unspent budget returned at week reset.
It exposes chat, a live activity feed, "Run now", and pause via `/api/agent/*`.

> **Note on session pricing:** the per-read charge is **deterministic** — the
> chapter's current price (set by the pricing agents above) minus the reader's
> loyalty / binge / discovery discounts, capped by the session cap + balance
> (`app/api/session/end`). There is no per-session AI valuation.

## Payment modes

1. **Pay-per-read** (default) — read first; on finishing, you're charged the
   chapter's current price minus your discounts. Pay once per chapter; re-reads free.
2. **Pre-release** — subscribers are auto-charged and unlocked the instant a chapter drops.
3. **Series Pass** — one discounted payment (85% of full cost) unlocks a series; sessions stop charging.

## Architecture

```
Reader ──reads──▶ Chapter UI ──tracks──▶ /api/session/end
   │                (time, scroll, re-reads, binge)     │
   │                                  deterministic price (lib/pricing.ts):
   │                                  chapter price − loyalty/binge/discovery
   ▼                                                     ▼
 ledger (Supabase) ◀── debit ──────────────  settleSession()  ── x402 ──▶ /api/settle
                                                     │                  (treasury pays)
                                                     ▼                        │
                                          payments + loyalty           Arc testnet ──▶ creator wallet
                                                     │                        │  (or escrow → Circle PW)
                                                     ▼                        ▼
                                       Creator dashboard (realtime balance ticks up)

Autonomous agent:  /api/cron/agent ─▶ runAgent() ─▶ fund agent wallet (real USDC on Arc)
                                          │            ─▶ discover + evaluate (taste profile)
                                          └─▶ settleSession() at 7% fee ─▶ creators
```

- **Reader balances** are a Supabase ledger over a pooled Arc **treasury** wallet.
- **Settlement** is the proven x402 path: the treasury pays the gated `/api/settle`
  endpoint, moving USDC to the creator's Arc address (`lib/arc.ts`, `lib/payer.ts`).
- **Escrow / offramp**: creators without a wallet accrue escrow + get a **Circle
  Programmable Wallet** (`lib/circle.ts`); they withdraw to wallet or bank. Guarded —
  if Circle keys are unset, escrow is ledger-only and the app still works.

## Stack

Next.js 16 (App Router) · Tailwind 4 · Supabase (Postgres) · Claude via OpenRouter ·
Circle Programmable Wallets · Arc nanopayments + x402 (`@circle-fin/x402-batching`) ·
viem (agent on-chain wallet) · Vercel.

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

Then open `/read`, onboard a reader in `/onboarding` (deposit a balance), read a
chapter and watch the creator balance tick up live — or open `/agent`, set a taste
profile + weekly budget, and hit "Run now" to watch it buy chapters itself.

### Scripts
- `npm run generate-wallets` — create the Arc treasury wallet
- `npm run fund-gateway` — top up the treasury's x402 Gateway deposit
- `npm run settle-smoke` — prove the Arc settlement rail end-to-end
- `npm run seed` — seed demo creator, series, chapters, and a funded reader (idempotent)
- `npm run demo-pricing` — simulate demand on a chapter and watch Dynamic Repricing move its price (capped at ±20%)
- `npm run import-asterion` — import the bundled demo series

### Cron (Vercel)
Three cron routes, each authed with `CRON_SECRET` (Vercel Cron sends it as a
bearer token; append `?key=$CRON_SECRET` to trigger manually):

- `/api/cron/agent` — run every active reader's autonomous agent
- `/api/cron/reprice` — hourly Dynamic Repricing across all chapters
- `/api/cron/budget` — daily low-balance sweep

A `vercel.json` is **not** committed — add one (or configure crons in the Vercel
dashboard) to schedule them:

```json
{
  "crons": [
    { "path": "/api/cron/agent",   "schedule": "0 * * * *" },
    { "path": "/api/cron/reprice", "schedule": "0 * * * *" },
    { "path": "/api/cron/budget",  "schedule": "0 8 * * *" }
  ]
}
```

## Routes

**Reader** — `/` landing · `/read` browse/discover · `/series/[id]` ·
`/series/[id]/[chapter]` · `/chapter/[id]` reader · `/onboarding` · `/dashboard` ·
`/wallet` · `/library` · `/profile` · `/agent` autonomous agent · `/join`.

**Creator** — `/creator/studio` · `/creator/dashboard` · `/creator/[seriesId]`
(+ `/upload`, `/edit/[chapterId]`) · `/creator/analytics` · `/creator/audience` ·
`/creator/onboarding` · `/creator/claim` · `/creator/withdraw` · `/author/[slug]`
public profile.

**Admin** — `/admin` overview · `/admin/login` · `/admin/content` ·
`/admin/creators` · `/admin/users` · `/admin/payments` (email allowlist or
ops-admin login; `/api/admin/*`).

**Public** — `/stats` live stats.

## Screens

| | |
|---|---|
| ![Discover](public/screenshots/discover.png) | ![Reader](public/screenshots/reader.png) |
| ![Creator studio](public/screenshots/studio.png) | ![Earnings](public/screenshots/earnings.png) |
| ![Reader agent](public/screenshots/agent.png) | ![Live stats](public/screenshots/stats.png) |

> Screenshots live in [`public/screenshots/`](public/screenshots/README.md) —
> see that folder's README for the shot list and a capture guide.

---

## Roadmap

Tracked against the Lepton Agents Hackathon scoring (agentic sophistication ·
traction · Circle tool usage · innovation). Checked = shipped.

### Shipped
- [x] **Autonomous Reader Agent** — taste profile (Claude), weekly budget cap, x402 auto-buy at 7% (`caller_type=agent`), live chat + activity feed, "Run now" + scheduled fleet cron (`/api/cron/agent`)
- [x] **Real on-chain agent wallet (v3)** — each agent funded with real native USDC on Arc weekly (scannable), unspent returned at week reset (`lib/agent-wallet.ts`)
- [x] Pay-per-read nanopayments — engagement-adjusted price, settled on Arc via `@circle-fin/x402-batching` (Gateway, EIP-3009, batched)
- [x] Pricing agents — Creator Pricing (upload), Dynamic Repricing (hourly), Budget (daily) — Claude with deterministic fallbacks
- [x] Dynamic pricing — demand × quality multipliers, loyalty / binge / discovery discounts, pay-once
- [x] Series Pass (85%) + pre-release — persisted, creator-set, editable
- [x] Creator escrow via Circle Programmable Wallets; on-chain settle at withdrawal (USDC + bank offramp)
- [x] Owner protection — a creator is never charged to read their own work
- [x] Reader ↔ Studio mode separation (one account, two surfaces)
- [x] Cross-post (Royal Road / ScribbleHub / Wattpad / WebNovel)
- [x] Add-to-library, gift transfer (debits giver), chapter tips (100% to creator), author announcements
- [x] Public creator profiles · cover/genre editing · Discover pagination + real stats · loading skeletons + client cache
- [x] Admin ops panel — content, creators, users, payments, overview, reset

### Next
- [ ] **Real seed stats** — back every catalog number with a real DB row (defends the traction score)
- [ ] **Gift / tips via Circle App Kit `Send`** — real wallet-to-wallet USDC transfers
- [ ] **Revenue-split contract** — deploy one Arc contract for co-author / editor splits
- [ ] Threaded comments + real (paid-gated) ratings
- [ ] Profile pictures (avatar upload)
- [ ] AI reading guide ("Ask Charon") that can hand off to the reader-agent
- [ ] Per-second streaming reads (RFB 4)

### Manga
- [ ] Real manga content + dedicated panel reader
- [ ] Panel-viewport payment valuation (replaces scroll velocity for image chapters)
