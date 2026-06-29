/**
 * Seed a content-rich demo: several creators, a dozen series across genres with
 * real chapters, a roster of readers, follows, plus engagement + settled
 * payments + reading sessions so trending, rankings, dashboards and series pages
 * all look alive.
 *
 * Requires `npm run dev` running and the schema applied. Run:  npm run seed
 */
import { createClient } from "@supabase/supabase-js";

const BASE = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false },
});

async function post(path: string, body: unknown) {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`${path} → ${res.status}: ${JSON.stringify(data)}`);
  return data;
}

const P = (s: string) => s.trim();
const rand = (min: number, max: number) => min + Math.random() * (max - min);
const randInt = (min: number, max: number) => Math.floor(rand(min, max + 1));
const pick = <T>(a: T[]) => a[randInt(0, a.length - 1)];
const round2 = (n: number) => Math.round(n * 100) / 100;
const hex = (n: number) => Array.from({ length: n }, () => "0123456789abcdef"[randInt(0, 15)]).join("");
const daysAgo = (d: number) => new Date(Date.now() - d * 86_400_000).toISOString();

// ── Original chapter prose pools (no licensing concerns) ──────────────
const POOL = [
  `Kael had counted every rivet in the floor of the foundry twice before the system woke. It came not as a voice but as a pressure behind his eyes, a column of pale text unrolling across the soot. WELCOME, it said, TO THE ASCENT. He laughed, because laughing was cheaper than fear, and the laugh echoed off cold iron. The first quest was simple: survive the night shift. The second was not. By the time the furnaces roared to life on their own, Kael understood that the mill had been waiting for someone foolish enough to stay after the others fled. He picked up the tongs. If the world wanted to make a weapon of him, he would at least choose the shape of the blade.`,
  `Morning found Kael richer by three levels and poorer by one finger's worth of skin. Debts, he was learning, were the true currency of the Ascent — not coin, but the weight of what others expected you to become. He spent his first skill point on Patience and immediately regretted it, because Patience only made the waiting longer and the seeing clearer. He saw, now, the thin gold threads that ran from every worker's chest down into the dark. He saw which ones had been cut. When the second night came he did not laugh. He banked the furnace, set his tools in a row, and waited for the thing below to climb.`,
  `The Lantern Court convened only when someone had been lost to the canals, and someone always had. Mira carried her grandmother's lamp through streets that breathed fog, past windows where families pretended not to count empty chairs. To be a lantern-bearer was to walk toward grief and offer it a small, stubborn flame. She was fourteen and already very good at it, which was its own kind of sorrow. Tonight the lost one was a boy she half-knew, and the canal that took him had begun, the Court whispered, to glow from below. Lights answering lights. Mira did not like what that implied.`,
  `Up close the water was not glowing. It was remembering. Every drowned lantern the city had ever lowered still burned down there, held in a cold that did not put fire out so much as keep it. Mira knelt on the slick stone and saw a hundred small flames looking back, and among them one that flickered in a rhythm she knew. She nearly went in after it. The Court's first rule stopped her: a lantern that drowns itself helps no one and joins the count. So she did the harder thing. She lowered her own flame on its chain, slowly, into all that patient cold, and she did not let go.`,
  `The duel academy did not teach you to win. It taught you to lose slowly enough to learn something on the way down. Tomas had lost forty-one times to the same straw dummy before he understood it was weighted to fall toward whoever struck it without intent. On the forty-second try he simply asked it, under his breath, what it wanted. The dummy did not answer, of course. But his blade did — a small singing note he had never coaxed from it before — and the straw man toppled away from him for the first time. The instructor, who had been pretending not to watch for a month, finally turned around.`,
  `They called the station Tessellate because nothing on it ever quite fit. Doors opened a centimetre off true; the artificial dawn arrived four minutes late and apologised in six languages. Captain Oyelaran had stopped trusting the numbers and started trusting the way the crew's shoulders sat at breakfast. This morning the shoulders were wrong. Something in the long dark had changed course to match theirs, and the only person who would say so out loud was the cook, who had no clearance and therefore no reason to lie. She believed the cook. She always had.`,
  `The matchmaker's ledger was bound in red thread and older grudges. Lin had inherited it the way one inherits a limp — without ceremony, and forever. Every name in it owed a marriage, a apology, or a death, and the ledger did not distinguish between them with any great care. She had sworn never to add her own name. She added it on a Tuesday, in the rain, beside a man who sold umbrellas he clearly did not believe in. He smiled like someone who had read the last page of a book and decided to start it anyway. Lin closed the ledger. Some debts, she decided, were worth the ink.`,
  `Detective Arnaut measured a city by its silences. This street had three: the silence of the shuttered bakery, the silence of the dog that should have barked, and the silence of the woman in the doorway who had been dead, the coroner would later insist, for exactly as long as it took the cathedral bell to finish striking midnight. Arnaut did not believe in exactly. He believed in the gap between the eleventh strike and the twelfth, where a clever person might do a great many quiet things. He crouched by the threshold and began, as he always did, by apologising to the dead for the questions.`,
  `The mountain ate climbers the way a patient man eats bread — slowly, and without malice. Sora had watched it take her sister two seasons ago and had come back not for revenge, which the mountain could not feel, but for the truth, which it could not hide. At the third camp she found her sister's rope, coiled neatly, tied off to nothing. Neatly. That was the word that kept her awake. No one falling ties off neatly. Someone had stood here, at the roof of the breathing world, and made a choice that looked, from below, exactly like an accident.`,
  `The shop sold hours. Not clocks — hours, decanted into small blue bottles and shelved by quality. A dull Tuesday afternoon went cheap; the last hour before a first kiss could ransom a kingdom. Old Hessa had run the shop for sixty years on borrowed time, quite literally, and the bill had finally come due. Her apprentice, who did not yet know she was an apprentice, walked in out of the rain wanting only to sell a single wasted morning. Hessa looked at the girl, then at the empty shelf where her own last hour should have sat, and understood that the universe had, at long last, sent the change she'd been dreading.`,
];

const TITLE_WORDS = ["The First Forge", "Sparks and Debts", "What Climbed the Light", "Neatly Tied", "Forty-Two", "The Late Dawn", "Red Thread", "The Eleventh Strike", "Borrowed Hours", "The Glow Beneath", "Ash and Intent", "A Quiet Choice"];
const COMMENTS = ["this chapter broke me", "the pacing here is unreal", "couldn't stop reading", "that twist though 😭", "best arc so far", "ok I need the next one NOW", "the worldbuilding is insane", "cried a little ngl", "reread this three times", "peak fiction honestly"];
const REASONS = ["Binged 5 chapters without pausing — high engagement session.", "Re-read the climax twice. Deep, deliberate read.", "Steady reading pace, full completion.", "Lingered on the key scenes — high value.", "Quick but complete read.", "Slowed right down at the turn — engaged."];

const CREATORS = [
  { email: "demo-creator@paywithcharon.xyz", name: "Demo Author", bio: "Writes stubborn people into impossible towers. LitRPG and low fantasy." },
  { email: "demo-creator2@paywithcharon.xyz", name: "Ife Adeyemi", bio: "Lagos-born. Fog, canals, and grief that learns to glow." },
  { email: "demo-creator3@paywithcharon.xyz", name: "Lin Yao", bio: "Romance and mystery, usually in the rain." },
];

const SERIES = [
  { c: 0, title: "Iron Ascension", genre: "litrpg", desc: "A foundry worker is conscripted into a tower that climbs back. Stubborn personhood as a survival stat.", tier: 3 },
  { c: 0, title: "The Weight of Levels", genre: "litrpg", desc: "Every level costs something you can't get back. He's counting.", tier: 2 },
  { c: 1, title: "The Lantern Court", genre: "fantasy", desc: "In a city of fog and canals, a teenage lantern-bearer walks toward grief and brings back what she can.", tier: 3 },
  { c: 1, title: "Drowned Light", genre: "fantasy", desc: "The canals are remembering. So is she.", tier: 1 },
  { c: 0, title: "The Blade Asks", genre: "action", desc: "A duel academy that teaches you to lose slowly enough to learn on the way down.", tier: 2 },
  { c: 2, title: "Tessellate", genre: "scifi", desc: "Nothing on the station quite fits. Something in the dark just changed course to match theirs.", tier: 2 },
  { c: 2, title: "The Red Thread Ledger", genre: "romance", desc: "A matchmaker who swore never to write her own name finally picks up the pen.", tier: 3 },
  { c: 2, title: "An Umbrella in the Rain", genre: "romance", desc: "He sells umbrellas he doesn't believe in. She reads last pages first.", tier: 1 },
  { c: 1, title: "The Twelfth Strike", genre: "mystery", desc: "A detective who measures the city by its silences, and the gap where midnight hides.", tier: 2 },
  { c: 0, title: "Neatly Tied", genre: "horror", desc: "No one falling ties off neatly. Someone stood at the roof of the world and chose.", tier: 1 },
  { c: 2, title: "The Hour Shop", genre: "fantasy", desc: "It sells hours in small blue bottles. The bill has finally come due.", tier: 2 },
  { c: 1, title: "Manhwa: Verdigris Knight", genre: "manhwa", desc: "An oxidised knight wakes in a kingdom that forgot it forged him.", tier: 2 },
];

async function main() {
  console.log(`Seeding ${BASE} …`);

  const readerEmails = Array.from({ length: 100 }, (_, i) => (i === 0 ? "demo-reader@paywithcharon.xyz" : `demo-reader${i + 1}@paywithcharon.xyz`));
  const allEmails = [...CREATORS.map((c) => c.email), ...readerEmails];

  // Idempotent reset (cascades remove series/chapters/sessions/follows).
  await db.from("creators").delete().in("email", CREATORS.map((c) => c.email));
  await db.from("users").delete().in("email", readerEmails);
  console.log("reset", allEmails.length, "demo accounts");

  // Creators
  const creatorIds: string[] = [];
  for (const c of CREATORS) {
    const { creator } = await post("/api/creators", { email: c.email, name: c.name });
    creatorIds.push(creator.id);
    await db.from("creators").update({ bio: c.bio }).eq("id", creator.id);
  }
  console.log("creators:", creatorIds.length);

  // Readers (funded) — bulk inserted for speed, with real balances.
  const { data: insertedReaders, error: rErr } = await db
    .from("users")
    .insert(readerEmails.map((email) => ({ email, balance_usd: round2(rand(2, 18)) })))
    .select("id");
  if (rErr) throw new Error(`readers insert: ${rErr.message}`);
  const readerIds = (insertedReaders ?? []).map((r) => r.id as string);
  // The sign-in demo reader gets a real deposit so its wallet looks lived-in.
  await post("/api/deposit", { userId: readerIds[0], amountUsd: 5 });
  console.log("readers:", readerIds.length);

  // Supabase Auth users for the demo accounts (email/password sign-in).
  for (const email of ["demo-reader@paywithcharon.xyz", "demo-creator@paywithcharon.xyz"]) {
    const { error } = await db.auth.admin.createUser({ email, password: "charon-demo", email_confirm: true });
    if (error && !/already|registered|exists/i.test(error.message)) console.warn("  auth user", email, error.message);
  }
  console.log("auth: demo users ready (password: charon-demo)");

  const payments: Record<string, unknown>[] = [];
  const sessions: Record<string, unknown>[] = [];
  const follows: Record<string, unknown>[] = [];
  const earnedByCreator = new Map<string, number>();
  let textCursor = 0;
  const modes = ["standard", "standard", "standard", "standard", "pre_release", "series_unlock"];

  for (let si = 0; si < SERIES.length; si++) {
    const s = SERIES[si];
    const creatorId = creatorIds[s.c];
    const { series } = await post("/api/series", { creatorId, title: s.title, genre: s.genre, description: s.desc });

    const nChapters = randInt(5, 7);
    const popularity = s.tier; // 1 small, 2 medium, 3 hit

    // ── Real followers: a believable slice of the reader pool, by popularity. ──
    const followerCount = Math.min(readerIds.length, popularity * randInt(12, 26));
    const followerReaders = [...readerIds].sort(() => Math.random() - 0.5).slice(0, followerCount);
    for (const uid of followerReaders) {
      follows.push({ user_id: uid, series_id: series.id, mode: pick(modes) });
    }

    let seriesReads = 0;
    let completionSum = 0;
    let completionN = 0;

    for (let ci = 0; ci < nChapters; ci++) {
      const text = POOL[textCursor % POOL.length];
      textCursor++;
      const price = round2(rand(0.03, 0.04 + popularity * 0.025));
      const r = await post("/api/chapters", {
        seriesId: series.id,
        title: `${ci + 1}. ${TITLE_WORDS[(si + ci) % TITLE_WORDS.length]}`,
        contentType: "text",
        content: P(text),
        overrideBasePrice: price,
      });
      const id = r.chapter.id as string;
      const current = round2(price * rand(0.95, 1.25));

      // Readers of THIS chapter — followers, decaying down the series (retention).
      const retention = Math.pow(0.86, ci);
      const chapterReaders = followerReaders.filter(() => Math.random() < retention);

      let chCompletionSum = 0;
      let rereadCount = 0;
      for (const uid of chapterReaders) {
        const comp = round2(Math.min(0.99, rand(0.55, 0.95) + (popularity - 1) * 0.03 - ci * 0.01));
        const isReread = Math.random() < 0.04 + popularity * 0.04;
        if (isReread) rereadCount++;
        chCompletionSum += comp;
        completionSum += comp;
        completionN++;

        const amt = round2(current * rand(0.8, 1.2));
        sessions.push({
          user_id: uid,
          chapter_id: id,
          started_at: daysAgo(rand(0, 14)),
          ended_at: daysAgo(rand(0, 14)),
          completion_rate: comp,
          scroll_back_count: randInt(0, 4),
          time_spent_seconds: randInt(120, 540),
          binge_depth: ci + 1,
          reader_comment: Math.random() < 0.18 ? pick(COMMENTS) : null,
          agent_value_score: round2(rand(0.4, 0.95)),
          amount_settled_usdc: amt,
          agent_reasoning: pick(REASONS),
          created_at: daysAgo(rand(0, 14)),
        });
        // Most sessions settle a payment to the creator.
        if (Math.random() < 0.85) {
          payments.push({
            session_id: null,
            user_id: uid,
            creator_id: creatorId,
            chapter_id: id,
            amount_usdc: amt,
            fee_usdc: round2(amt * 0.05),
            net_usdc: round2(amt * 0.95),
            status: "settled",
            arc_tx_hash: "0x" + hex(64),
            created_at: daysAgo(rand(0, 12)),
          });
          earnedByCreator.set(creatorId, (earnedByCreator.get(creatorId) ?? 0) + round2(amt * 0.95));
        }
      }

      const reads = chapterReaders.length;
      seriesReads += reads;
      // Chapter stats — backed by the sessions above.
      await db.from("chapters").update({
        read_count: reads,
        completion_rate: reads ? round2(chCompletionSum / reads) : 0,
        reread_rate: reads ? round2(rereadCount / reads) : 0,
        avg_time_spent_seconds: randInt(180, 600),
        current_price_usdc: current,
      }).eq("id", id);
    }

    // Series stats — derived from the real follows + sessions, not invented.
    const avgCompletion = completionN ? round2(completionSum / completionN) : 0;
    await db.from("series").update({
      follower_count: followerReaders.length,
      avg_completion_rate: avgCompletion,
      binge_velocity: round2(rand(1.5, 4.5)),
      momentum_score: round2(followerReaders.length + seriesReads * 0.5 + avgCompletion * 80),
      status: si % 5 === 0 ? "completed" : "ongoing",
    }).eq("id", series.id);

    console.log(`  ${s.title} (${s.genre}) — ${nChapters} ch, ${followerReaders.length} readers, ${seriesReads} reads`);
  }

  // Bulk insert follows + payments + sessions (chunked).
  await chunkInsert("follows", follows);
  await chunkInsert("payments", payments);
  await chunkInsert("sessions", sessions);
  console.log(`follows: ${follows.length}, payments: ${payments.length}, sessions: ${sessions.length}`);

  // Accrue creator earnings to match settled payments.
  for (const [creatorId, total] of earnedByCreator) {
    await db.from("creators").update({
      total_earned_usdc: round2(total),
      balance_usd: round2(total * rand(0.3, 0.6)), // some already withdrawn
    }).eq("id", creatorId);
  }

  console.log("\n✓ Seed complete. Sign in at /join with a demo account.");
  console.log("  Reader:           demo-reader@paywithcharon.xyz");
  console.log("  Reader + Creator: demo-creator@paywithcharon.xyz  (password: charon-demo)");
}

async function chunkInsert(table: string, rows: Record<string, unknown>[]) {
  for (let i = 0; i < rows.length; i += 400) {
    const { error } = await db.from(table).insert(rows.slice(i, i + 400));
    if (error) throw new Error(`${table} insert: ${error.message}`);
  }
}

main().catch((e) => {
  console.error("seed failed:", e.message);
  process.exit(1);
});
