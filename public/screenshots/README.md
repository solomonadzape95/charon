# Screenshots

Drop PNGs here with the exact filenames below — the root `README.md` already
references them. Capture at **1440×900** (or 2× retina), light or dark per the
note. Trim browser chrome.

| File | Page | What to show |
|---|---|---|
| `hero.png` | `/` (landing) | The headline + "read freely, pay fair value" hero. The money shot for the top of the README. |
| `agent.png` | `/agent` | The Autonomous Reader Agent — chat panel, activity feed, weekly budget, and its on-chain wallet address. The flagship. |
| `reader.png` | `/chapter/[id]` | The reading view, ideally with the end-of-session summary toast showing the amount settled + reasoning. |
| `discover.png` | `/read` | The browse/discover grid of series with covers + prices. |
| `studio.png` | `/creator/studio` | Creator studio — a series with chapters and the agent-set prices. |
| `earnings.png` | `/creator/dashboard` | Creator earnings/balance ticking up + withdraw (Circle escrow / Arc). |
| `stats.png` | `/stats` | Public live stats page. |
| `admin.png` | `/admin` | Ops admin overview (optional). |

## How to capture

The dev server reads `.env.local` (Supabase + treasury already wired):

```bash
npm run seed     # demo creator, series, chapters, funded reader (idempotent)
npm run dev
```

Then either screenshot manually, or script it with Playwright:

```bash
npx playwright install chromium
# write a short script that logs in / onboards a reader, visits each route,
# and page.screenshot({ path: 'public/screenshots/<name>.png' })
```

Public pages (`/`, `/read`, `/stats`) need no auth. The rest require an
onboarded reader / creator session.
