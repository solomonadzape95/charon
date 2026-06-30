/**
 * DANGER: wipe ALL content + accounts from the database.
 *
 * Deletes every row from every data table — readers, creators, series, chapters,
 * sessions (which hold reader comments), payments, deposits, the ledger, agent
 * configs/messages, follows, loyalty, announcements, price history, and
 * cross-post status. Use this to take the app to a clean, real-only state before
 * onboarding actual users (no seeded novels, no fabricated earnings/stats).
 *
 * Guarded: refuses to run unless WIPE=yes is set, so it can't fire by accident.
 *   WIPE=yes npm run wipe
 *
 * Tables are deleted child-first so foreign keys never block a delete. Every
 * table has a uuid `id`, so `id not is null` matches all rows (PostgREST requires
 * a filter — a bare delete-all is rejected).
 */
import { createClient } from "@supabase/supabase-js";

if (process.env.WIPE !== "yes") {
  console.error("Refusing to wipe. Re-run with WIPE=yes to confirm:  WIPE=yes npm run wipe");
  process.exit(1);
}

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false },
});

// Child tables first, parents last — respects every FK regardless of cascade rules.
const TABLES = [
  "agent_messages",
  "agent_config",
  "cross_post_status",
  "price_history",
  "loyalty",
  "follows",
  "ledger",
  "deposits",
  "payments",
  "sessions",
  "announcements",
  "chapters",
  "series",
  "creators",
  "users",
];

for (const table of TABLES) {
  // `.not("id", "is", null)` = "all rows" (PostgREST forbids an unfiltered delete).
  const { error, count } = await db.from(table).delete({ count: "exact" }).not("id", "is", null);
  if (error) {
    console.error(`✗ ${table}: ${error.message}`);
    process.exit(1);
  }
  console.log(`✓ cleared ${table} (${count ?? 0} rows)`);
}

console.log("\nDone — the database is empty. Real-only from here.");
