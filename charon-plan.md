# Charon — Full Build Plan
## Read freely. Pay for what it's worth. Creators earn every chapter.
### Lepton Agents Hackathon · Canteen × Circle × Arc

**Deadline:** July 5, 2026  
**Time remaining:** 9 days  
**Track:** RFB 06 — Creator & Publisher Monetization + RFB 01 — Autonomous Paying Agents  
**Stack:** Next.js · Circle Programmable Wallets · Arc Nanopayments · x402 · Claude API · Supabase  
**Domain:** paywithcharon.xyz  

---

## The Idea

Every reading platform today forces a binary choice: pay a flat subscription regardless of how much you love the content, or grind through ads. Creators earn fractions of a cent per view from ad revenue, or they chase Patreon subscribers manually. The reader who skims one chapter and the reader who binges 200 chapters in a weekend pay exactly the same amount. That's broken for everyone.

Charon fixes the unit. You pay for what you actually consumed, valued by how deeply you engaged with it. A reading intelligence agent watches your session — time spent, re-reads, binge depth, series loyalty — and settles a fair nanopayment to the creator after every session. No checkout. No subscription prompt. No coins to buy. No wallet required. Just read, and value flows automatically to the creator.

Chapter prices aren't fixed either. A dynamic pricing agent continuously re-evaluates what every chapter is worth based on demand, time since release, series momentum, and reader behavior signals. Early readers pay a small premium. Loyal readers get a discount. Viral chapters earn more. Abandoned ones drop in price to attract new readers. The market finds the right price automatically.

**Positioning:** *"Charon — read freely, pay fairly. A nanopayment reading platform where AI agents settle what every chapter was truly worth."*

---

## What Makes It Agentic

Four distinct agents doing real, multi-step reasoning:

### Agent 1 — Reading Intelligence Agent (fires after every session)

Analyzes each reading session and calculates what it was worth:

- Time spent vs expected read time for the chapter's word count
- Scroll-back behavior — re-reading sections is a strong engagement signal
- Completion rate — did the reader finish or drop off midway?
- Binge depth — how many chapters consumed in one sitting
- Series loyalty score — chapter 1 reader vs chapter 200 reader
- Reader comment weight — "this chapter broke me" pushes value up
- Cross-session pattern — is this reader accelerating or slowing down on this series?

Outputs a session value score and settles USDC to each creator proportionally. Not a fixed price per chapter — a reasoned valuation per session. The agent's reasoning is shown to the reader in one sentence: *"You re-read the fight scene twice and binged 6 chapters. This session was worth $0.31 across 2 creators."*

### Agent 2 — Creator Pricing Agent (fires on every chapter upload)

Sets a base price for each chapter automatically when a creator uploads:

- Word count and estimated read time
- Series follower count and growth rate
- Historical completion rates for this series
- Binge velocity — how fast readers consume after chapter 1
- Genre benchmarks across the platform
- Creator tier — established creator vs new voice

Creator can override but doesn't have to. Most won't need to.

### Agent 3 — Dynamic Repricing Agent (runs continuously)

Revisits every chapter's price on an ongoing basis based on live signals:

**Demand signals** — high read volume in the last 24 hours nudges price up gently. Price never spikes suddenly — changes are gradual and capped.

**Time decay** — new chapters carry a small release premium (scarcity and excitement). Price gradually settles toward a floor as the chapter ages. Early readers pay slightly more, late readers pay less.

**Series momentum** — a series going viral has its catalog re-priced upward across the board. A series losing readers gets re-priced down to attract new ones back.

**Reader loyalty discounts** — recognizes readers who have been following since chapter 1 and applies a loyalty modifier. Long-term readers pay slightly less per chapter as a reward for their commitment.

**Chapter quality signals** — completion rate, re-read rate, time spent above average, comments left. A chapter everyone re-reads is worth more than one everyone abandons halfway. Price reflects real reader behavior, not just creator intent.

**Binge discount** — when a reader is mid-binge (4+ chapters in one session), per-chapter cost decreases slightly for each additional chapter. Rewards depth of engagement.

### Agent 4 — Budget Allocation Agent (monitors each reader's account)

Watches reader's balance and reading patterns across all series they follow:

- Detects high-frequency reading patterns and suggests switching specific series to pre-release mode
- Warns when balance is running low before a heavy reading session starts
- Suggests top-up amount calibrated to the reader's average weekly reading pace
- Reallocates budget intelligently across followed series when balance is tight
- Flags unusually expensive sessions before they happen so readers aren't surprised

---

## Payment Modes

### Mode 1 — Post-reading settlement (default)

Reader deposits a USDC balance once via card or crypto — Circle handles the onramp invisibly. Reads freely across all content. After each session, Agent 1 calculates the session value and settles silently to each creator. Reader never sees a payment prompt mid-reading. Balance depletes naturally. A gentle nudge appears when balance runs low.

This is the frictionless mode. It feels free. The psychology matters — paying after you've already enjoyed something feels fair, not like a toll. You never hit a paywall mid-chapter.

### Mode 2 — Pre-release unlock (opt-in per series)

Reader opts into early access for a specific series. When the creator drops a new chapter, Agent 4 automatically pays the early-access fee and unlocks it immediately — no action required from the reader. They open the app and the chapter is already there waiting.

This replaces Patreon early-access natively. Creator gets paid on release. Reader gets the chapter the moment it drops. No Patreon. No third-party cut.

**Agent 4 suggests mode switches automatically** — if it detects a reader has been reading every new chapter within an hour of release for three consecutive weeks, it suggests switching to pre-release mode for that series. One tap to confirm.

### Mode 3 — Series unlock (for completed series)

Reader pays a single flat nanopayment to unlock an entire completed series at a discount vs reading chapter by chapter. Agent 2 sets the bundle price based on total chapter count, series rating, and completion rate. Good for readers who want to binge a finished story without thinking about per-chapter costs.

---

## Dynamic Pricing — How Prices Move

Every chapter has:

- **Floor price** — minimum it can ever settle to (set by word count, never goes below $0.01)
- **Base price** — Agent 2's initial valuation on upload
- **Current price** — what Agent 3 has adjusted it to based on live signals
- **Reader price** — what this specific reader pays after loyalty and binge modifiers

### Price signals and their direction

| Signal | Direction | Magnitude |
|---|---|---|
| High read volume last 24h | Up | Small |
| Chapter just released | Up | Small premium |
| Chapter older than 30 days | Down | Gradual decay to floor |
| Series going viral | Up | Moderate |
| Series losing readers | Down | Moderate |
| High completion rate | Up | Small |
| High re-read rate | Up | Moderate |
| Low completion rate | Down | Small |
| Reader loyalty (100+ chapters) | Down | Loyalty discount |
| Mid-binge (4+ chapters) | Down | Binge discount |
| New reader (first 3 chapters) | Down | Discovery discount |

### What readers always see before a session

A small indicator on every chapter: current price and what's driving it. *"$0.04 · trending this week"* or *"$0.02 · loyalty discount applied"*. Transparent, never surprising.

### Price change caps

Agent 3 never moves a price more than 20% in either direction in a 24-hour window. No sudden spikes. Creators and readers can trust the pricing is stable enough to plan around.

---

## For Readers

- Sign up with email. No wallet required.
- Deposit balance via card or existing crypto wallet — Circle handles the conversion to USDC invisibly
- Read anything on the platform exactly like any other reading app — no paywalls mid-chapter
- After each session, see a clean summary: what you read, what it was worth, agent reasoning in one line
- Prices shown per chapter before you start — never a surprise
- Top up when low — Agent 4 tells you when and suggests how much based on your reading pace
- Full history: every chapter, every session value, every payment, every creator paid
- Mode toggle per series: standard post-reading or pre-release auto-unlock

---

## For Creators

- Sign up with email. No crypto knowledge required.
- Upload series and chapters — text or images, any format
- Agent 2 sets base price per chapter automatically on upload — override anytime
- Agent 3 keeps prices updated based on how readers respond to your work
- Real-time earnings dashboard — balance ticks up as readers finish chapters
- See which chapters perform best, where readers drop off, what drives re-reads
- Set early-access chapters for pre-release subscribers (optional)
- Withdraw anytime — to USDC wallet or directly to bank account via Circle fiat offramp
- No platform lock-in. No rights grab. Settlement fee only on what you earn.

**The pitch to creators:** *"Royal Road pays you nothing and points readers at Patreon. Webtoon takes most of it and owns your distribution. WebNovel takes your rights. Charon takes a small settlement fee and everything else goes directly to you, per chapter, per reader, in real time. The better your work, the more you earn — automatically."*

---

## Supported Content (MVP)

**Tier 1 — Build these first:**
- Webnovels (text chapters, any length)
- Manga / Manhwa / Manhua (image chapters)

**Tier 2 — Post-hackathon:**
- Light novels
- Original fiction and fan fiction
- Poetry collections
- Short story series

---

## Database Schema

```sql
-- readers
users (
  id, email, circle_wallet_id,
  balance_usdc, created_at
)

-- creators
creators (
  id, email, name, bio,
  circle_wallet_id, total_earned_usdc,
  payout_preference, -- 'usdc_wallet' | 'bank'
  created_at
)

-- series
series (
  id, creator_id, title, description,
  genre, cover_image, follower_count,
  avg_completion_rate, binge_velocity,
  momentum_score, created_at
)

-- chapters
chapters (
  id, series_id, chapter_number,
  title, content_type, -- 'text' | 'images'
  content, word_count,
  floor_price_usdc, base_price_usdc,
  current_price_usdc,
  early_access_price_usdc,
  early_access_release_at,
  public_release_at,
  completion_rate, reread_rate,
  avg_time_spent_seconds,
  created_at
)

-- reading sessions
sessions (
  id, user_id, chapter_id,
  started_at, ended_at,
  completion_rate, scroll_back_count,
  time_spent_seconds, binge_depth,
  reader_comment,
  agent_value_score,
  amount_settled_usdc,
  agent_reasoning,
  loyalty_discount_applied,
  binge_discount_applied,
  created_at
)

-- payments
payments (
  id, session_id, user_id, creator_id,
  chapter_id, amount_usdc,
  arc_tx_hash, status,
  -- status: 'pending' | 'settled' | 'failed'
  created_at
)

-- price history (for Agent 3 audit trail)
price_history (
  id, chapter_id,
  old_price_usdc, new_price_usdc,
  reason, signals_json,
  created_at
)

-- series follows
follows (
  id, user_id, series_id,
  mode, -- 'standard' | 'pre_release' | 'series_unlock'
  created_at
)

-- reader loyalty scores
loyalty (
  id, user_id, series_id,
  chapters_read, total_spent_usdc,
  loyalty_tier, -- 'new' | 'reader' | 'loyal' | 'devotee'
  created_at
)
```

---

## Agent Tools

### Agent 1 — Reading Intelligence

```javascript
const readingAgentTools = [
  {
    name: "analyze_session",
    description: `Analyze a completed reading session.
      Inputs: time_spent, completion_rate, scroll_backs,
      binge_depth, series_loyalty_score, reader_comment,
      chapter_word_count, chapter_base_price.
      Returns: engagement_score (0-100), value_multiplier`
  },
  {
    name: "calculate_session_value",
    description: `Given engagement score and base price,
      calculate fair settlement amount.
      Applies loyalty discount, binge discount.
      Returns: amount_usdc, reasoning_sentence`
  },
  {
    name: "settle_payment",
    description: `Fire x402 nanopayment via Circle Arc
      to creator wallet for calculated amount.
      Returns: tx_hash, settled_at`
  }
]
```

### Agent 2 — Creator Pricing

```javascript
const pricingAgentTools = [
  {
    name: "analyze_chapter",
    description: `Analyze uploaded chapter content.
      Inputs: word_count, content_type, series_id.
      Returns: estimated_read_time, complexity_score`
  },
  {
    name: "benchmark_genre",
    description: `Get pricing benchmarks for this genre
      and creator tier on the platform.
      Returns: floor_price, suggested_base_price, ceiling_price`
  },
  {
    name: "set_base_price",
    description: `Set the base price for a chapter.
      Inputs: complexity_score, genre_benchmark,
      series_momentum, creator_tier.
      Returns: base_price_usdc, early_access_price_usdc`
  }
]
```

### Agent 3 — Dynamic Repricing

```javascript
const repricingAgentTools = [
  {
    name: "fetch_chapter_signals",
    description: `Get current performance signals for a chapter.
      Returns: read_volume_24h, completion_rate,
      reread_rate, age_days, series_momentum_delta`
  },
  {
    name: "calculate_price_adjustment",
    description: `Calculate new price from signals.
      Applies time decay, demand multiplier,
      quality signals. Respects 20% daily change cap.
      Returns: new_price_usdc, signals_applied, reasoning`
  },
  {
    name: "apply_reader_modifiers",
    description: `Calculate reader-specific price from base.
      Applies loyalty discount, binge discount,
      discovery discount for new readers.
      Returns: reader_price_usdc, modifiers_applied`
  }
]
```

### Agent 4 — Budget Allocation

```javascript
const budgetAgentTools = [
  {
    name: "analyze_reading_patterns",
    description: `Analyze a reader's reading velocity
      and series following behavior.
      Returns: avg_chapters_per_week, pre_release_candidates,
      estimated_weekly_spend`
  },
  {
    name: "suggest_mode_switch",
    description: `Identify series where reader behavior
      suggests pre-release mode would suit them.
      Returns: series_id, reasoning, estimated_savings`
  },
  {
    name: "calculate_topup",
    description: `Given current balance and reading pace,
      suggest a top-up amount.
      Returns: suggested_amount, days_remaining_at_pace`
  }
]
```

---

## Tech Stack

```
Frontend:       Next.js (App Router) + Tailwind
Backend:        Next.js API routes
Database:       Supabase (Postgres)
AI Agents:      Claude API (claude-sonnet-4-6) with tool use
Payments:       Circle Programmable Wallets + Arc Nanopayments + x402
Fiat onramp:    Circle card deposit → USDC (invisible to reader)
Fiat offramp:   Circle bank withdrawal for creators
Hosting:        Vercel
```

---

## Day-by-Day Plan

### Day 1 — June 27 · Foundation
**Goal:** Circle stack working, first payment settling, scaffold up

- [ ] Install Circle CLI and Arc CLI, run Arc 101 demo
- [ ] Create reader and creator Circle Programmable Wallets on testnet
- [ ] Fire one manual nanopayment between them via Arc — confirm it settles under 500ms
- [ ] Scaffold Next.js app with Supabase, set up full schema
- [ ] Build auth — email signup for readers and creators, separate flows
- [ ] Basic routing: `/read`, `/creator`, `/dashboard`, `/series/[id]`, `/chapter/[id]`
- [ ] Start reaching out to Royal Road and ScribbleHub creators today — need content by Day 2

**End of day check:** Manual payment settles. Auth works. App loads at a real URL.

---

### Day 2 — June 28 · Reading Experience
**Goal:** Clean reader-facing chapter experience live, session tracking working

- [ ] Build series page — cover, title, description, genre, chapter list with prices
- [ ] Build chapter reader — clean, distraction-free, mobile-perfect
- [ ] Text reader: good typography, reading progress indicator, estimated read time
- [ ] Image reader: smooth scroll or page-flip for manga, panel zoom support
- [ ] Implement session tracking on chapter open — start timer, track scroll position
- [ ] Track completion rate (how far they scrolled), scroll-back events (direction reversals), time spent
- [ ] Session end detection — user navigates away, closes tab, or reaches chapter bottom
- [ ] Price display per chapter — current price + reason ("trending" / "loyalty discount" / "just released")
- [ ] Seed 8-10 stories — chapters from creators who responded, or public domain content for testing

**End of day check:** Can read a full chapter. Session data captured in Supabase accurately. Prices visible.

---

### Day 3 — June 29 · Agent 1 + Agent 2
**Goal:** Reading Intelligence Agent and Creator Pricing Agent both live end to end

**Agent 1 — Reading Intelligence:**
- [ ] Build Claude API call with session data and tool definitions
- [ ] Implement `analyze_session`, `calculate_session_value`, `settle_payment` tools
- [ ] Wire session end → agent call → Arc nanopayment → creator balance update
- [ ] Build session summary UI — appears after every session, shows agent reasoning
- [ ] Test multiple session types: quick skim, deep read, binge, partial read, re-read

**Agent 2 — Creator Pricing:**
- [ ] Build pricing agent Claude API call triggered on chapter upload
- [ ] Implement `analyze_chapter`, `benchmark_genre`, `set_base_price` tools
- [ ] Wire to chapter upload flow — price set automatically before chapter goes live
- [ ] Build creator override UI — accept agent price or set manually
- [ ] Build creator upload flow — series creation, chapter upload (text + images), pricing confirmation

**End of day check:** Full loop works: read chapter → session ends → agent reasons → payment settles → creator balance updates live. Creator uploads chapter → agent prices it automatically.

---

### Day 4 — June 30 · Agent 3 — Dynamic Repricing
**Goal:** Prices move intelligently based on live signals

- [ ] Build Agent 3 as a background job that runs every hour
- [ ] Implement `fetch_chapter_signals`, `calculate_price_adjustment`, `apply_reader_modifiers` tools
- [ ] Wire chapter performance data into signal calculation
- [ ] Implement 20% daily change cap — agent cannot spike prices suddenly
- [ ] Implement loyalty tier system — track reader loyalty per series, apply discounts
- [ ] Implement binge discount — chapter 5+ of a session costs slightly less per chapter
- [ ] Implement discovery discount — first 3 chapters of any series for a new reader
- [ ] Build price history logging — full audit trail in `price_history` table
- [ ] Surface price change reasons to readers: tooltip on chapter price shows why it changed
- [ ] Test repricing: simulate high read volume, check price responds correctly with cap

**End of day check:** Chapter prices update hourly based on signals. Loyalty discounts apply correctly. Price history visible in Supabase. Changes are capped and gradual.

---

### Day 5 — July 1 · Agent 4 + Payment Modes
**Goal:** Budget allocation agent live, all three payment modes working

**Agent 4 — Budget Allocation:**
- [ ] Build budget agent that runs per reader on a daily schedule
- [ ] Implement `analyze_reading_patterns`, `suggest_mode_switch`, `calculate_topup` tools
- [ ] Build mode switch suggestion UI — appears in reader dashboard
- [ ] Build low balance warning — gentle nudge when balance drops below 3 days of reading pace
- [ ] Smart top-up suggestion — "At your reading pace, $3.00 will last about 2 weeks"

**Payment modes:**
- [ ] Mode 1 (post-reading) — already working from Day 3, polish UX
- [ ] Mode 2 (pre-release) — creator sets early-access price and release date per chapter
- [ ] Pre-release subscribers: Agent 4 auto-pays on chapter release, unlocks immediately
- [ ] Mode 3 (series unlock) — Agent 2 calculates bundle price for completed series
- [ ] Reader deposit flow — card via Circle onramp, converts to USDC silently
- [ ] Reader wallet top-up flow from dashboard

**End of day check:** All three payment modes work. Agent 4 correctly suggests mode switches. Card deposit works and shows USDC balance.

---

### Day 6 — July 2 · Creator Dashboard + Traction Push
**Goal:** Creator dashboard polished. Real people using it. Numbers on the board.

**Morning — creator dashboard:**
- [ ] Real-time earnings display — balance ticks up as sessions complete
- [ ] Chapter performance breakdown — reads, completion rate, re-read rate, earnings per chapter
- [ ] Reader retention curve — where readers drop off across the series
- [ ] Withdrawal flow — USDC to personal wallet or bank account via Circle offramp
- [ ] Pre-release management — schedule chapters, see subscriber count

**Afternoon — traction push:**
- [ ] Post in Canteen Discord, r/webnovels, r/manhwa, r/manhwax, Royal Road forums
- [ ] DM 20 Royal Road and ScribbleHub creators: *"Platform that pays you per chapter read, directly, no cut. Takes 5 minutes to upload. Want to try it?"*
- [ ] Run 50+ test reading sessions across different series and session types
- [ ] Each session tests a different agent reasoning path — document the outputs
- [ ] Screenshot every interesting agent reasoning message

**Evening:**
- [ ] Fix bugs surfaced from real usage
- [ ] Confirm real-time earnings dashboard updates correctly
- [ ] Document every creator signed up, every reader, every USDC settled

**End of day check:** Creator dashboard live and accurate. At least 5 real creators with uploaded series. 20+ real reading sessions completed by people other than yourself.

---

### Day 7 — July 3 · Live Stats + Polish
**Goal:** Product feels real and finished. Public stats page live.

- [ ] Build live stats page — total chapters read, total creators earning, total USDC settled on Arc, top earning creators this week, price movements (rising / falling chapters)
- [ ] Polish reading experience — smooth, fast, mobile-first, no rough edges
- [ ] Polish session summary UI — agent reasoning clear and human, not technical
- [ ] Polish creator dashboard — feels motivating, shows momentum clearly
- [ ] Add reader history page — every session, every payment, every agent note
- [ ] Add series discovery page — trending, new releases, top earning creators
- [ ] Make sure all three agents are surfacing reasoning visibly in the UI
- [ ] Write clean README with architecture diagram

---

### Day 8 — July 4 · Buffer + Stretch Goals
**Goal:** Catch up anything slipped. Attempt stretch goals if ahead of schedule.

**If on track:**
- [ ] Recommendation agent — suggests next series based on reading history and engagement patterns
- [ ] Creator analytics — cohort analysis, which chapter hooks new readers, where loyal readers come from
- [ ] Social proof on series pages — "247 readers this week" / "Earnings up 34% this week"
- [ ] Reader reading streak — days in a row, total chapters read, total creators supported
- [ ] Email digest for creators — weekly earnings summary, top performing chapters

**If behind:**
- Use this day to finish anything from Days 1-7 that slipped
- Do not sacrifice the core loop quality for any feature

---

### Day 9 — July 5 · Submission Day
**Goal:** Submit with clean demo and real traction numbers

**Morning — record Loom (under 3 minutes):**

- `0:00–0:30` — the problem: creators earn almost nothing, readers pay flat regardless of how much they love something. Great content gets the same payment as mediocre content.
- `0:30–1:00` — reader finishes a binge session, session summary appears: *"You re-read the fight scene twice and binged 6 chapters in 90 minutes. This session was worth $0.34 across 2 creators."* Agent reasoning visible.
- `1:00–1:30` — creator dashboard: balance ticking up in real time as readers finish chapters across the platform
- `1:30–2:00` — dynamic pricing in action: chapter trending, price nudged up, reason shown. Loyal reader, discount applied automatically.
- `2:00–2:30` — pre-release mode: new chapter drops, reader's balance auto-pays, chapter unlocked instantly, creator notified
- `2:30–3:00` — live stats page: X chapters read, Y creators earning, Z USDC settled on Arc testnet today

**Afternoon:**
- [ ] Push to public GitHub with clean README
- [ ] Final check: live URL working, all agents firing, stats page updating
- [ ] Submit via Google Form — GitHub link + Loom link + live URL + traction numbers

---

## Judging Criteria Map

| Criterion | Weight | How Charon Hits It |
|---|---|---|
| Agentic Sophistication | 30% | Four distinct agents making real decisions: Reading Intelligence values each session from behavioral signals, Creator Pricing sets dynamic chapter prices on upload, Dynamic Repricing continuously adjusts prices from live market signals with loyalty and binge modifiers per reader, Budget Allocation manages reader spending and suggests mode switches. All reasoning is visible in the UI. |
| Traction | 30% | Real creators uploading series and earning per chapter, real readers completing sessions and settling payments, live stats page with USDC volume, pre-release subscribers, creator withdrawal flow tested end to end |
| Circle Tool Usage | 20% | Circle Programmable Wallets for readers and creators, Arc nanopayments per session via x402, Circle card onramp for reader deposits (USDC invisible to user), Circle fiat offramp for creator bank withdrawals |
| Innovation | 20% | First reading platform where payment is proportional to genuine engagement depth, not a flat subscription. Dynamic repricing that responds to real reader behavior. The combination of post-reading settlement + loyalty discounts + binge discounts + demand-based repricing is genuinely new in this space. |

---

## Traction Questions (Submission Form)

**Users:** "We have X readers who have completed reading sessions on Charon, Y creators who have uploaded series and are actively earning per chapter, and Z USDC settled on Arc testnet. Content spans webnovels and manga across N genres, with pricing dynamically updated based on reader behavior signals."

**Problem:** "Every reading platform forces readers into flat subscriptions regardless of how deeply they engage with content. Creators earn fractions of cents from ad revenue or chase Patreon subscribers manually. Charon's reading intelligence agent settles what every session was actually worth — proportional to real engagement, dynamically priced by market signals, paid directly to creators in real time on Arc."

---

## What Success Looks Like by July 5

- 10+ creators with uploaded series actively earning
- 50+ reading sessions completed by real users
- Sessions spanning at least 3 different series
- Dynamic pricing visibly moving on at least 5 chapters
- Pre-release mode with at least 3 active subscribers
- Loyalty discounts applied to at least 3 readers
- Live stats page at a real URL updating in real time
- All four agents surfacing reasoning visibly in the UI
- Public GitHub repo with clean README
- Under-3-minute Loom showing agent reasoning live on screen

---

## The Shot That Wins It

The moment in the Loom that judges remember:

Agent session summary appears after a binge — *"You read 6 chapters of Iron Ascension in 90 minutes, re-read chapter 3 twice, and you've been following this series since chapter 1. Loyalty discount applied. This session was worth $0.34. Settled to the creator."*

Creator dashboard is open in a split screen. The balance ticks up $0.34 in real time while the judge is watching.

That's the shot. Everything else is setup for that moment.

---

*Charon — the ferryman took one coin per crossing. Every chapter is a crossing. The coin is automatic.*
