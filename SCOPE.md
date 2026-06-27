# Charon — Scope (Lepton hackathon sprint, → July 6)

One sentence: **Charon is an engine that turns a URL into a routed payment** —
`identify creator → resolve wallet → size amount → route (or escrow)`. Everything
we ship is a surface on that one engine.

## The rule (read this before "pivoting")

> Does the idea use the engine (identify creator → route a payment)?
> **Yes → it's a feature.** Log it in `ROADMAP.md` and keep building.
> **No → it's a different product.** Not this sprint.

Tipping, profiles, the registry, the extension, playlists, a content paywall — all
"yes". They are *features of one product*, not competing products. We finish the
engine and its first surfaces; everything else waits in `ROADMAP.md`.

## In scope (this sprint)

- **Verified creator registry** — creators self-register a profile handle + payout
  wallet, proven via a one-time **bio code** (no OAuth). Identity becomes a DB
  lookup instead of an on-chain guess. → fixes "can't identify web2 creators".
- **Agent reads the registry first** — a verified hit routes directly; live probes
  remain the fallback for the unregistered.
- **Public profiles** at `/c/<slug>` — verified handles, total received, tip CTA.
- **Creator register/manage page** at `/register`.
- **Browser extension** — `✦ Tip` button on any page → tips the creator, and pings
  the reader's Telegram bot on success.
- **Crypto-native creators work day one** — Mirror / ENS / Farcaster already resolve
  directly; they need no registration, good for immediate demos.

## Out of scope (→ `ROADMAP.md`)

- Content pay-per-unlock gateway (gated articles/videos).
- Curator / playlist tipping with recursive splits.
- OAuth / wallet-signature verification.
- TikTok / Instagram (closed, hostile to fetch).

## Why this is the winning slice

It fixes Charon's only two real weaknesses — **identity** and **claim friction** —
without throwing away the working Arc settlement rail, and it produces a *real*,
verifiable traction story: registered creators receive tips that **land directly,
no escrow, ~100% "claimed"**, instead of a pile of unclaimed escrow.
