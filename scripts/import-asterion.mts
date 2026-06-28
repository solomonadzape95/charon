/**
 * Import real novels from an Asterion pg_dump (data-only, novels + chapters) into
 * Charon. Each novel → an UNCLAIMED creator (the author) + a series; each chapter
 * → a chapters row. Earnings accrue as escrow on the unclaimed creator until the
 * author claims their profile.
 *
 *   DUMP=asterion-content.sql NOVELS=60 PER_NOVEL=25 npm run import-asterion
 */
import fs from "node:fs";
import readline from "node:readline";
import { createClient } from "@supabase/supabase-js";

const FILE = process.env.DUMP ?? "asterion-content.sql";
const TARGET = Number(process.env.TARGET ?? 60); // how many series-with-chapters we want
const MAX_NOVELS = Number(process.env.NOVELS ?? TARGET * 2); // candidate pool (some lack usable chapters)
const PER_NOVEL = Number(process.env.PER_NOVEL ?? 25);

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false },
});

const rand = (a: number, b: number) => a + Math.random() * (b - a);
const randInt = (a: number, b: number) => Math.floor(rand(a, b + 1));
const pick = <T>(x: T[]) => x[randInt(0, x.length - 1)];
const round2 = (n: number) => Math.round(n * 100) / 100;
const hex = (n: number) => Array.from({ length: n }, () => "0123456789abcdef"[randInt(0, 15)]).join("");
const daysAgo = (d: number) => new Date(Date.now() - d * 86_400_000).toISOString();

const GENRE_BASE: Record<string, number> = {
  fantasy: 0.04, action: 0.04, adventure: 0.04, romance: 0.03, "sci-fi": 0.04, scifi: 0.04,
  mystery: 0.04, horror: 0.04, comedy: 0.03, xianxia: 0.05, xuanhuan: 0.05, eastern: 0.05, "martial arts": 0.05,
};
const COMMENTS = ["this chapter broke me", "the pacing here is unreal", "couldn't stop reading", "that twist 😭", "best arc so far", "peak fiction honestly", "the worldbuilding is insane", "reread this twice"];
const REASONS = ["Binged several chapters without pausing — high engagement.", "Re-read the climax. Deep read.", "Steady pace, full completion.", "Lingered on the key scenes.", "Quick but complete read."];

function copyField(s: string): string | null {
  if (s === "\\N") return null;
  let out = "";
  for (let i = 0; i < s.length; i++) {
    if (s[i] === "\\") {
      const n = s[++i];
      out += n === "n" ? "\n" : n === "t" ? "\t" : n === "r" ? "\r" : n;
    } else out += s[i];
  }
  return out;
}
function htmlToText(html: string): string {
  return html
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<br\s*\/?>(?!\n)/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&rsquo;|&#x27;|&apos;/gi, "'")
    .replace(/&mdash;/gi, "—")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
function slugify(s: string): string {
  return (s || "x").toLowerCase().replace(/['’]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 50) || "x";
}

interface NovelRow {
  aid: string;
  title: string;
  author: string;
  status: string;
  genres: string[];
  summary: string | null;
  image: string | null;
  rating: number;
}

async function main() {
  if (!fs.existsSync(FILE)) throw new Error(`dump not found: ${FILE}`);
  console.log(`Reading ${FILE} (top ${MAX_NOVELS} novels × ${PER_NOVEL} chapters)…`);

  const novels = new Map<string, NovelRow>(); // aid → novel
  let selected: Set<string> | null = null;
  const chByNovel = new Map<string, { n: number; title: string | null; text: string }[]>();
  let section: "novels" | "chapters" | null = null;

  const rl = readline.createInterface({ input: fs.createReadStream(FILE), crlfDelay: Infinity });
  for await (const line of rl) {
    if (line.startsWith("COPY public.novels")) { section = "novels"; continue; }
    if (line.startsWith("COPY public.chapters")) {
      section = "chapters";
      selected = pickSelection(novels); // novels fully parsed by now
      continue;
    }
    if (line === "\\.") { section = null; continue; }

    if (section === "novels") {
      const c = line.split("\t");
      const genres = (copyField(c[9]) ?? "").replace(/^\{|\}$/g, "").replace(/"/g, "").split(",").map((g) => g.trim()).filter(Boolean);
      let rating = parseFloat(c[13]) || 0;
      if (rating > 5) rating = rating / 2; // normalise stray /10 ratings
      novels.set(c[0], { aid: c[0], title: copyField(c[1]) ?? "Untitled", author: copyField(c[3]) ?? "Anonymous", status: (copyField(c[8]) ?? "").toLowerCase(), genres, summary: copyField(c[10]), image: copyField(c[12]), rating });
    } else if (section === "chapters" && selected) {
      const c = line.split("\t");
      const aid = c[1];
      if (!selected.has(aid)) continue;
      const arr = chByNovel.get(aid) ?? [];
      if (arr.length >= PER_NOVEL) continue;
      const text = htmlToText(copyField(c[5]) ?? "");
      if (text.length < 40) continue; // skip empty/teaser rows
      arr.push({ n: Number(c[2]), title: copyField(c[4]), text });
      chByNovel.set(aid, arr);
    }
  }

  const chosen = [...(selected ?? new Set<string>())]
    .map((aid) => novels.get(aid)!)
    .filter((nv) => (chByNovel.get(nv.aid)?.length ?? 0) >= 5)
    .sort((a, b) => b.rating - a.rating)
    .slice(0, TARGET);
  console.log(`Parsed ${novels.size} novels; importing top ${chosen.length} (of ${MAX_NOVELS} candidates) with chapters.`);

  // ── Replace synthetic catalog (keep users/creators + ledger) ──
  console.log("Clearing existing content…");
  await db.from("payments").delete().not("id", "is", null);
  await db.from("sessions").delete().not("id", "is", null);
  await db.from("series").delete().not("id", "is", null); // cascades chapters/follows/loyalty/price_history
  await db.from("creators").delete().is("email", null); // remove previously-imported authors (demo accounts have emails)
  await db.from("creators").update({ balance_usd: 0, total_earned_usdc: 0 }).not("id", "is", null);

  // readers to attribute engagement to
  const { data: users } = await db.from("users").select("id").limit(50);
  const readerIds = (users ?? []).map((u) => (u as { id: string }).id);

  // Pre-seed used slugs from any remaining creators (demo accounts) to avoid collisions.
  const { data: existingCreators } = await db.from("creators").select("slug");
  const usedCreatorSlug = new Set<string>((existingCreators ?? []).map((c) => (c as { slug: string | null }).slug).filter(Boolean) as string[]);
  const usedSeriesSlug = new Set<string>();
  const authorCreator = new Map<string, string>(); // author → creatorId
  const escrowByCreator = new Map<string, number>();
  const payments: Record<string, unknown>[] = [];
  const sessions: Record<string, unknown>[] = [];

  function uniqueSlug(base: string, used: Set<string>): string {
    let s = slugify(base);
    let i = 1;
    while (used.has(s)) s = `${slugify(base)}-${++i}`;
    used.add(s);
    return s;
  }

  for (const nv of chosen) {
    // unclaimed creator per author
    let creatorId = authorCreator.get(nv.author);
    if (!creatorId) {
      const { data, error } = await db.from("creators").insert({ name: nv.author, slug: uniqueSlug(nv.author, usedCreatorSlug), bio: `Author of ${nv.title}.`, claimed: false }).select("id").single();
      if (error) throw new Error("creator insert: " + error.message);
      creatorId = (data as { id: string }).id;
      authorCreator.set(nv.author, creatorId);
    }

    const primary = (nv.genres[0] ?? "fantasy").toLowerCase();
    const completion = round2(Math.min(0.98, Math.max(0.5, nv.rating / 5)));
    const followers = Math.round((nv.rating / 5) * 700 + rand(40, 260));
    const { data: sdata, error: serr } = await db.from("series").insert({
      creator_id: creatorId,
      title: nv.title,
      slug: uniqueSlug(nv.title, usedSeriesSlug),
      description: nv.summary,
      genre: primary,
      cover_image: nv.image,
      status: nv.status.includes("complete") ? "completed" : "ongoing",
      follower_count: followers,
      avg_completion_rate: completion,
      binge_velocity: round2(rand(1.5, 4.5)),
      momentum_score: round2(followers + nv.rating * 120 + rand(0, 60)),
    }).select("id").single();
    if (serr) throw new Error("series insert: " + serr.message);
    const seriesId = (sdata as { id: string }).id;

    const base = GENRE_BASE[primary] ?? 0.04;
    const chapters = (chByNovel.get(nv.aid) ?? []).sort((a, b) => a.n - b.n);
    const chapterRows = chapters.map((ch, i) => {
      const wc = ch.text.split(/\s+/).filter(Boolean).length;
      const price = round2(Math.min(0.3, Math.max(0.02, base * (1 + Math.min(1, wc / 2500)))));
      return {
        series_id: seriesId,
        chapter_number: ch.n,
        title: ch.title,
        content_type: "text",
        content: ch.text,
        word_count: wc,
        floor_price_usdc: Math.max(0.01, round2(base * 0.5)),
        base_price_usdc: price,
        current_price_usdc: round2(price * rand(0.95, 1.2)),
        completion_rate: round2(Math.min(0.98, completion - i * 0.012 + rand(-0.03, 0.03))),
        reread_rate: round2(rand(0.02, 0.12)),
        avg_time_spent_seconds: randInt(180, 600),
        read_count: Math.max(3, Math.round(followers * 0.6 * Math.pow(0.9, i) * rand(0.85, 1.1))),
        public_release_at: daysAgo(rand(0, 60)),
      };
    });
    const { data: insertedCh, error: cerr } = await db.from("chapters").insert(chapterRows).select("id, current_price_usdc, chapter_number");
    if (cerr) throw new Error("chapters insert: " + cerr.message);
    const chs = (insertedCh ?? []) as { id: string; current_price_usdc: number; chapter_number: number }[];

    // light engagement: payments (escrow) + sessions/comments
    if (readerIds.length) {
      for (const ch of chs.slice(0, 8)) {
        const nPays = randInt(2, 6);
        for (let p = 0; p < nPays; p++) {
          const amt = round2(Number(ch.current_price_usdc) * rand(0.8, 1.25));
          payments.push({ user_id: pick(readerIds), creator_id: creatorId, chapter_id: ch.id, amount_usdc: amt, status: "settled", arc_tx_hash: "0x" + hex(64), created_at: daysAgo(rand(0, 12)) });
          escrowByCreator.set(creatorId, (escrowByCreator.get(creatorId) ?? 0) + amt);
        }
        for (const uid of readerIds.slice(0, randInt(1, 4))) {
          sessions.push({ user_id: uid, chapter_id: ch.id, started_at: daysAgo(rand(0, 14)), ended_at: daysAgo(rand(0, 14)), completion_rate: round2(rand(0.6, 1)), scroll_back_count: randInt(0, 4), time_spent_seconds: randInt(120, 540), binge_depth: ch.chapter_number, reader_comment: Math.random() < 0.22 ? pick(COMMENTS) : null, agent_value_score: round2(rand(0.4, 0.95)), amount_settled_usdc: round2(Number(ch.current_price_usdc) * rand(0.8, 1.2)), agent_reasoning: pick(REASONS), created_at: daysAgo(rand(0, 14)) });
        }
      }
    }
    console.log(`  ✓ ${nv.title} — ${chs.length} ch (${nv.author})`);
  }

  await chunk("payments", payments);
  await chunk("sessions", sessions);
  for (const [cid, total] of escrowByCreator) {
    await db.from("creators").update({ balance_usd: round2(total), total_earned_usdc: round2(total) }).eq("id", cid);
  }

  const totalChapters = chosen.reduce((s, nv) => s + Math.min(chByNovel.get(nv.aid)?.length ?? 0, PER_NOVEL), 0);
  console.log(`\n✓ Imported ${chosen.length} series, ${totalChapters} chapters, ${authorCreator.size} unclaimed authors.`);
  console.log(`  ${payments.length} settled payments (escrowed), ${sessions.length} sessions.`);
}

function pickSelection(novels: Map<string, NovelRow>): Set<string> {
  const seenTitle = new Set<string>();
  const ranked = [...novels.values()]
    .filter((n) => {
      const key = n.title.toLowerCase().trim();
      if (seenTitle.has(key)) return false;
      seenTitle.add(key);
      return true;
    })
    .sort((a, b) => b.rating - a.rating)
    .slice(0, MAX_NOVELS);
  return new Set(ranked.map((n) => n.aid));
}

async function chunk(table: string, rows: Record<string, unknown>[]) {
  for (let i = 0; i < rows.length; i += 400) {
    const { error } = await db.from(table).insert(rows.slice(i, i + 400));
    if (error) throw new Error(`${table} insert: ${error.message}`);
  }
}

main().catch((e) => {
  console.error("import failed:", e.message);
  process.exit(1);
});
