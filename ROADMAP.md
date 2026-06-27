# Charon — Roadmap (post-sprint)

A parking lot for everything that uses the Charon engine
(`identify creator → resolve wallet → size amount → route`) but is out of scope for
the hackathon sprint (see `SCOPE.md`). Ideas land here so we stop restarting the
build — none of these are pivots; they're features.

## Near-term

- **Content pay-per-unlock gateway** — creators gate a single article/video/track
  behind an x402 paywall (`$0.05 to unlock`). This is the literal RFB 06 prompt.
  Reuses wallets/identity; adds an integration where the content lives.
- **Curator / playlist tipping with recursive splits** — a curated list of content;
  a tip splits between the creator(s) and the curator who assembled it. Maps to the
  "recursive royalty splits" prior-art model. Reuses `creator_identities` + routing;
  adds a `playlists` + `splits` layer.
- **Stronger verification** — OAuth ("Sign in with X / Google") and wallet-signature
  proofs, alongside the bio-code path.
- **More platforms** — Reddit, Medium, Bluesky, podcasts; YouTube channel handle
  edge cases; custom-domain Substacks.

## Later

- **Agent-pays-creators rail** — expose the engine as an MCP tool / x402 endpoint so
  any AI agent can pay the creators whose work it used (RFB 01 + 06). Maximally
  agentic; traction becomes self-driving.
- **Retroactive + quadratic pools** — period-end pools distributed by distinct
  supporters / engagement (prior-art models #3, #7).
- **Fiat off-ramp polish** — Circle cash-out so non-crypto creators withdraw to a
  bank/card without touching crypto.
- **TikTok / Instagram** — only if their APIs become workable.

## Done (shipped in the sprint)

- Verified creator registry + bio-code verification.
- Agent reads the registry before guessing.
- Public `/c/<slug>` profiles + `/register` flow.
- Browser extension (`✦ Tip`) + Telegram ping.
