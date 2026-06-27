Charon — Full Build Plan
Read anything. Pay for what it's worth. Creators earn every chapter.
Lepton Agents Hackathon · Canteen × Circle × Arc
Deadline: July 5, 2026

Time remaining: 9 days

Track: RFB 06 — Creator & Publisher Monetization + RFB 01 — Autonomous Paying Agents

Stack: Next.js · Circle Programmable Wallets · Arc Nanopayments · x402 · Claude API · Supabase

The Idea
Every reading platform today forces a choice: pay a flat subscription and hope you read enough to justify it, or grind through ads. Creators get a fraction of a cent per view from ad revenue, or they chase Patreon subscribers. The person who reads one chapter and the person who binges 200 chapters in a week pay exactly the same amount. That's broken for everyone.
Charon fixes the unit. You pay for what you actually consumed, valued by how much you actually engaged with it. A reading intelligence agent watches your session — time spent, re-reads, binge depth, series loyalty — and settles a fair nanopayment to the creator after every session. No checkout. No subscription prompt. No coins to buy. Just read, and value flows automatically.
For creators, it's the first platform where their earnings are directly proportional to how much readers genuinely love their work — not how many ads they sat through.
Positioning: "Charon — read freely, pay fairly. A nanopayment reading platform where an AI agent settles what every chapter was worth."

What Makes It Agentic
Three distinct agents doing real reasoning:
Agent 1 — The Reading Intelligence Agent (per session)

After every reading session, analyzes:

Time spent vs expected read time for chapter length
Scroll-back behavior (re-reads = high engagement signal)
Completion rate (did they finish or drop off?)
Binge depth (how many chapters consumed in one session)
Series loyalty score (chapter 1 reader vs chapter 200 reader)
User comment if left ("this chapter broke me" = weight up)

Outputs a session value score and settles USDC to each creator accordingly. Not a fixed price — a reasoned valuation. The agent explains its reasoning in one sentence visible to the reader.
Agent 2 — The Creator Pricing Agent (per upload)

When a creator uploads a chapter, the agent sets a base price automatically:

Word count and estimated read time
Series follower count
Historical completion rates for this series
Genre benchmarks across the platform
Binge velocity (how fast readers consume after chapter 1)

Creator can override but doesn't have to. Most won't need to.
Agent 3 — The Budget Allocation Agent (per reader)

Watches reader's balance and reading patterns across all series they follow:

Suggests switching high-frequency series to pre-release mode
Warns when balance is running low before a heavy reading session
Suggests top-up amount based on reading velocity
Reallocates budget intelligently across series when balance is tight


Payment Modes
Mode 1 — Post-reading settlement (default for all readers)

Reader deposits USDC balance once. Reads freely across all content. After each session, Agent 1 calculates session value and settles silently to each creator. Reader sees a clean session summary: "You read 3 chapters of Solo Ascension and 1 chapter of Iron Will. $0.23 settled to 2 creators." Balance depletes naturally. Low balance triggers a gentle top-up nudge.
This is the frictionless mode. Feels free. Pays creators fairly.
Mode 2 — Pre-release unlock (opt-in per series)

Reader opts into early access for a specific series. When creator drops a new chapter, Agent 3 automatically pays the early-access fee and unlocks it. Reader opens the app, chapter is already there. No action required.
Replaces Patreon early access natively. Creator gets paid on release, not whenever a reader happens to show up.
Agent switches modes automatically — if Agent 3 detects a reader has been reading every new chapter within an hour of release for 3 consecutive weeks, it suggests pre-release mode for that series. One tap to confirm.

For Readers

Sign up with email. No wallet required.
Deposit balance via card or crypto — Circle handles the onramp, converts to USDC silently
Read anything on the platform exactly like any other reading app
After each session, see a clean payment summary — what you read, what it was worth, who got paid
Top up when low — agent tells you when and how much based on your reading pace
Full history: every chapter, every payment, every creator

The psychology: paying after you've enjoyed something feels fair, not like a toll. You never hit a paywall mid-chapter. You never see a price before you read. You just read and value flows.

For Creators

Sign up, paste in existing chapters or upload new ones
Agent sets base price per chapter automatically — override anytime
Real-time earnings dashboard: see balance tick up as readers finish chapters
Set early-access chapters for pre-release mode readers (optional)
Withdraw anytime — to USDC wallet or bank account via Circle fiat offramp
No platform lock-in. No rights grab. No 30% cut.

The pitch to creators: "Royal Road pays you nothing. Webtoon takes most of it. WebNovel takes your rights. Charon takes a small settlement fee and the rest goes directly to you, per chapter, per reader, in real time."

Supported Content (MVP)
Tier 1 — Build these first:

Webnovels (text chapters, any length)
Manga/Manhwa/Manhua (image chapters)

Tier 2 — Post hackathon:

Light novels
Fan fiction
Original poetry collections


Database Schema
sql-- readers
users (
  id, email, circle_wallet_id, 
  balance_usdc, reading_mode, 
  created_at
)

-- creators  
creators (
  id, email, name, bio,
  circle_wallet_id, total_earned_usdc,
  payout_preference, created_at
)

-- series
series (
  id, creator_id, title, description,
  genre, cover_image, follower_count,
  avg_completion_rate, created_at
)

-- chapters
chapters (
  id, series_id, chapter_number,
  title, content, word_count,
  base_price_usdc, early_access_price_usdc,
  early_access_release_at, public_release_at,
  created_at
)

-- reading sessions
sessions (
  id, user_id, chapter_id,
  started_at, ended_at,
  completion_rate, scroll_backs,
  time_spent_seconds, binge_depth,
  agent_value_score, amount_settled_usdc,
  agent_reasoning, created_at
)

-- payments
payments (
  id, session_id, user_id, creator_id,
  chapter_id, amount_usdc, 
  arc_tx_hash, status, created_at
)

-- series follows
follows (
  id, user_id, series_id,
  mode, -- 'standard' | 'pre_release'
  created_at
)

Tech Stack
Frontend:         Next.js (App Router) + Tailwind
Backend:          Next.js API routes
Database:         Supabase
AI Agents:        Claude API (claude-sonnet-4-6) with tool use
Payments:         Circle Programmable Wallets + Arc Nanopayments + x402
Fiat onramp:      Circle card deposit
Fiat offramp:     Circle bank withdrawal
Hosting:          Vercel

Day-by-Day Plan
Day 1 — July 27 · Foundation
Goal: Circle stack working, first payment firing, scaffold up

 Install Circle CLI and Arc CLI, run Arc 101 demo
 Create reader and creator Circle Programmable Wallets on testnet
 Fire one manual nanopayment between them via Arc — confirm settlement
 Scaffold Next.js app with Supabase, set up schema
 Build auth — email signup for both readers and creators
 Basic routing: /read, /creator, /dashboard

End of day check: Manual payment settles. Auth works. App loads.

Day 2 — June 28 · Reading Experience
Goal: Clean reader-facing chapter experience live

 Build series page — cover, description, chapter list
 Build chapter reader — clean, mobile-friendly, text and image support
 Implement reading session tracking — start timer on chapter open
 Track completion rate (scroll position), scroll-back events, time spent
 Build session end detection — user navigates away or reaches bottom
 Seed 5-10 stories manually (reach out to Royal Road creators today, or use public domain content to start)

End of day check: Can read a chapter, session data is being captured in Supabase.

Day 3 — June 29 · Agent 1 — Reading Intelligence
Goal: Agent analyzes sessions and settles payments

 Build Reading Intelligence Agent — Claude API call with session data
 Tools: analyze_session, calculate_value, settle_payment
 Agent considers: time spent, completion rate, scroll-backs, binge depth, series loyalty
 Agent outputs value score + one-sentence reasoning
 Wire to Arc nanopayment settlement via x402
 Build session summary UI — what you read, what it was worth, agent reasoning visible
 Test full loop: read chapter → session ends → agent fires → payment settles → creator balance updates

End of day check: Full loop works end to end. Agent reasoning visible in UI.

Day 4 — June 30 · Agent 2 — Creator Pricing + Creator Dashboard
Goal: Creators can upload, agent prices their work, dashboard shows earnings

 Build Agent 2 — Creator Pricing Agent
 Tools: analyze_chapter, benchmark_genre, set_base_price
 Build creator upload flow — series creation, chapter upload (text + images)
 Agent auto-prices on upload, creator can override
 Build creator dashboard — real-time earnings, chapter performance, reader stats
 Build withdrawal flow — Circle fiat offramp to bank, or USDC to wallet

End of day check: Creator uploads chapter, agent prices it, earnings update in real time after a test read.

Day 5 — July 1 · Agent 3 + Pre-release Mode
Goal: Budget allocation agent live, pre-release mode working

 Build Agent 3 — Budget Allocation Agent
 Detects high-frequency reading patterns, suggests pre-release mode
 Low balance warnings with smart top-up suggestions
 Build pre-release chapter flow — creator sets early-access price and release date
 Pre-release readers auto-unlocked when chapter drops
 Build follow system with mode toggle (standard vs pre-release)
 Reader deposit flow — card via Circle onramp, converts to USDC silently

End of day check: Pre-release flow works. Agent 3 suggests mode switches. Deposit via card works.

Day 6 — July 2 · Traction Push
Goal: Real people using it. Numbers on the board.
Morning — seed creator side:

 DM 20 Royal Road and ScribbleHub creators directly
 Message: "I built a platform that pays you per chapter read, directly, no platform cut. Takes 5 minutes to upload. Want to try it?"
 Target: 5-10 creators with existing audiences upload their series
 Post in r/webnovels, r/manhwa, Royal Road forums

Afternoon — seed reader side:

 Post in webnovel Discord servers, Webtoon fan communities
 Run 50+ test reading sessions yourself across different series
 Each session tests different agent reasoning paths
 Screenshot agent reasoning for every interesting decision

Evening:

 Fix bugs from real usage
 Make sure real-time earnings dashboard is working
 Document every creator who signed up, every reader, every payment settled


Day 7 — July 3 · Polish + Live Stats
Goal: Product feels real, stats page live

 Build live stats page — total chapters read, total creators paid, total USDC settled, top earning creators
 Polish reading experience — smooth, fast, mobile perfect
 Polish creator dashboard — clean, motivating, shows momentum
 Add reader history — every chapter, every payment, every agent reasoning note
 Fix any remaining rough edges from traction day
 Write clean README


Day 8 — July 4 · Buffer + Stretch Goals
Goal: Catch up on anything slipped, attempt stretch goals if ahead
If on track:

 Build a simple recommendation agent — suggests next series based on reading history
 Add creator analytics — which chapters perform best, reader retention curve
 Social proof elements — "47 readers this week" on series pages

If behind:

Use this day to finish anything from Days 1-7 that slipped
Don't sacrifice core loop quality for features


Day 9 — July 5 · Submission
Goal: Submit with clean demo and real numbers
Morning — record Loom (under 3 mins):

0:00–0:30 — the problem: creators earn almost nothing, readers pay flat regardless of how much they love something
0:30–1:00 — reader opens app, reads a chapter, session ends, agent reasoning appears: "You re-read the fight scene twice and binged 4 chapters. This session was worth $0.18 across 2 creators."
1:00–1:30 — creator dashboard: balance ticking up in real time as readers finish chapters
1:30–2:00 — pre-release mode: new chapter drops, reader's balance auto-pays, chapter unlocked instantly
2:00–2:30 — live stats: X chapters read, Y creators earning, Z USDC settled on Arc
2:30–3:00 — the pitch: this is what every reading platform should be

Afternoon:

 Push to public GitHub with clean README
 Submit via Google Form — GitHub + Loom + live URL + traction numbers


Judging Criteria Map
CriterionWeightHow You Hit ItAgentic Sophistication30%Three distinct agents: Reading Intelligence (values each session by engagement depth), Creator Pricing (sets dynamic chapter prices from behavioral signals), Budget Allocation (manages reader spending across series and suggests mode switches). All making real multi-step decisions, not automation.Traction30%Real creators uploading series, real readers reading and settling payments, live stats page with USDC volume visible, pre-release mode with actual subscribersCircle Tool Usage20%Circle Programmable Wallets for readers and creators, Arc nanopayments per session, x402 settlement, Circle card onramp for deposits, Circle fiat offramp for creator withdrawalsInnovation20%First platform where payment is proportional to genuine engagement, not a flat subscription. The reading intelligence agent valuing sessions by behavioral signals is genuinely new.

Traction Questions (Submission Form Prep)
Users: "We have X readers who have completed reading sessions on Charon, Y creators who have uploaded series and are earning per chapter, and Z USDC settled on Arc testnet. Content spans webnovels and manga across N genres."
Problem: "Every reading platform forces readers into flat subscriptions regardless of how much they love the content. Creators earn fractions of cents from ads or chase Patreon subscribers. Charon's reading intelligence agent settles what every session was actually worth — proportional to real engagement, paid directly to creators, instantly on Arc."

What Success Looks Like by July 5

10+ creators with uploaded series
50+ reading sessions completed
Sessions spanning at least 3 different series
Pre-release mode with at least 2 active subscribers
Live dashboard at a real URL with real numbers
Three distinct agents visibly reasoning in the UI
Public GitHub repo with clean README
Under-3-minute Loom showing agent reasoning live

The moment in the Loom that wins it: agent reasoning appears after a binge session — "You read 6 chapters in 90 minutes, re-read chapter 3 twice, and you've been following this series since chapter 1. This session was worth $0.34. Settled to the creator." Creator balance updates live on screen while the judge is watching.
That's the shot. Everything else is setup for that moment.