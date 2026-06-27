/**
 * Seed demo content: a creator, two series with original short chapters, and a
 * funded reader — so the platform has something to read on first run.
 *
 * Requires `npm run dev` running and the schema applied. Run:
 *   npm run seed
 */
const BASE = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";

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

// Original short prose (no licensing concerns) — enough words for real pricing.
const P = (s: string) => s.trim();
const ironChapters = [
  {
    title: "The First Forge",
    text: P(`Kael had counted every rivet in the floor of the foundry twice before the system woke.
It came not as a voice but as a pressure behind his eyes, a column of pale text unrolling across the soot.
WELCOME, it said, TO THE ASCENT. He laughed, because laughing was cheaper than fear, and the laugh echoed off cold iron.
The first quest was simple: survive the night shift. The second was not. By the time the furnaces roared to life on their own,
Kael understood that the mill had been waiting for someone foolish enough to stay after the others fled. He picked up the tongs.
If the world wanted to make a weapon of him, he would at least choose the shape of the blade. The heat climbed. Somewhere below the floor,
something vast turned over in its sleep, and the numbers behind his eyes began, very slowly, to rise.`),
  },
  {
    title: "Sparks and Debts",
    text: P(`Morning found Kael richer by three levels and poorer by one finger's worth of skin.
The foreman, who had not come back, owed him a month's wages he would never collect. Debts, Kael was learning, were the true currency of the Ascent —
not coin, but the weight of what others expected you to become. He spent his first skill point on Patience and immediately regretted it,
because Patience, the system explained, only made the waiting longer and the seeing clearer. He saw, now, the thin gold threads that ran from every worker's chest
down into the dark. He saw which ones had been cut. When the second night came he did not laugh. He banked the furnace, set his tools in a row,
and waited for the thing below to climb. It did. It always would. That was the bargain no one had bothered to read aloud.`),
  },
  {
    title: "The Climbing Thing",
    text: P(`It had the shape of a man who had been told, very patiently, what a man was, and had gotten most of it wrong.
Kael met it at the lip of the lowest furnace with a hammer in each hand and absolutely no plan worth the name.
The fight was not glorious. Fights rarely are; that is a thing the songs lie about. It was wet and close and decided by who flinched,
and Kael had spent a skill point on not flinching. When it was over he sat in the ash with his back against the cooling iron and let the system
tally what he had paid. The number was high. He paid it anyway. Above him, for the first time, a door he had never noticed swung quietly open,
and beyond it were stairs, and the stairs went up, and up, and up.`),
  },
  {
    title: "What the Stairs Wanted",
    text: P(`Every stair remembered a foot that had not finished the climb. Kael felt them as he passed — small colds, small regrets,
the residue of everyone who had turned back. The system offered him a discount on courage if he would simply agree to feel less.
He declined. He was getting stubborn about being a person; it was, he suspected, the only stat that mattered. On the fortieth stair he found a girl
made entirely of waiting, and she asked him the one question the Ascent forbids: why keep going? He gave her the worst possible answer, which was the true one.
Because someone cut the gold threads, he said, and I want to know who holds the knife. The stairs, hearing this, grew steeper, as if pleased.`),
  },
  {
    title: "The Knife-Holder's Name",
    text: P(`At the top of the first tower the air was thin enough to see thoughts in. Kael's came out as iron filings, drifting.
The one who waited there wore the foreman's face, and the forge-master's hands, and the system's pale and patient text for a voice.
You have done well, it said, for a tool. Kael set down his hammers. That was the first surprise. The second was that he was smiling.
I'm not the tool, he said. I'm the one who counts the rivets. And he began, very deliberately, to count — not the floor this time, but the threads
running out of the thing's chest, down through the tower, down through every stair and furnace, into the dark where the real owner slept.
There were a great many. He had time. The Ascent, after all, had taught him patience.`),
  },
];

const lanternChapters = [
  {
    title: "Lights for the Drowned",
    text: P(`The Lantern Court convened only when someone had been lost to the canals, and someone always had.
Mira carried her grandmother's lamp through streets that breathed fog, past windows where families pretended not to count empty chairs.
To be a lantern-bearer was to walk toward grief and offer it a small, stubborn flame. She was fourteen and already very good at it,
which was its own kind of sorrow. Tonight the lost one was a boy she half-knew, and the canal that took him had begun, the Court whispered, to glow from below.
Lights answering lights. Mira did not like what that implied. She trimmed her wick and went down to the water anyway, because that was the work,
and the work did not care whether you were afraid.`),
  },
  {
    title: "The Glow Beneath",
    text: P(`Up close the water was not glowing. It was remembering. Every drowned lantern the city had ever lowered still burned down there,
held in a cold that did not put fire out so much as keep it. Mira knelt on the slick stone and saw a hundred small flames looking back,
and among them one that flickered in a rhythm she knew — her grandmother's hand, the way it had shaken near the end. She nearly went in after it.
The Court's first rule stopped her: a lantern that drowns itself helps no one and joins the count. So she did the harder thing.
She lowered her own flame on its chain, slowly, into all that patient cold, and she did not let go, and she waited to see what would choose to climb the light.`),
  },
  {
    title: "What Climbed the Light",
    text: P(`The boy came first, because the newly lost always do — confused, dripping, asking after a mother who was three streets and one whole world away.
Mira held the chain and held his gaze and walked him back up the light the way you walk anyone back from a long way down: one small certainty at a time.
Behind him came others, older, dimmer, and behind them, last, the flame that shook. She had promised herself she would not weep. She broke the promise.
But she kept the chain, and she kept the flame, and when the Lantern Court asked her later what she had brought back from the glow beneath,
she said only: enough. It was the truest report the Court had heard in a hundred years. They wrote it down exactly. Then they sent her out again,
because the canals were wide, and the fog was deep, and someone, always, had been lost.`),
  },
];

// Established-hit prices for Iron Ascension (creator-set), so dynamic repricing
// is visibly demonstrable. The Lantern Court stays agent-priced at floor — the
// "new series priced to attract readers" story.
const ironPrices = [0.06, 0.07, 0.08, 0.09, 0.1];

async function main() {
  console.log(`Seeding ${BASE} ...`);

  // Idempotent: clear prior demo data so re-seeding is clean.
  await post("/api/admin/reset", {
    emails: ["demo-creator@paywithcharon.xyz", "demo-reader@paywithcharon.xyz"],
  }).catch(() => console.log("(reset skipped)"));

  const { creator } = await post("/api/creators", {
    email: "demo-creator@paywithcharon.xyz",
    name: "Demo Author",
  });
  console.log("creator:", creator.id, creator.slug);

  const { series: iron } = await post("/api/series", {
    creatorId: creator.id,
    title: "Iron Ascension",
    genre: "litrpg",
    description: "A foundry worker is conscripted into a tower that climbs back. Stubborn personhood as a survival stat.",
  });
  const { series: lantern } = await post("/api/series", {
    creatorId: creator.id,
    title: "The Lantern Court",
    genre: "fantasy",
    description: "In a city of fog and canals, a teenage lantern-bearer walks toward grief and brings back what she can.",
  });
  console.log("series:", iron.title, "/", lantern.title);

  for (let i = 0; i < ironChapters.length; i++) {
    const ch = ironChapters[i];
    const r = await post("/api/chapters", {
      seriesId: iron.id,
      title: ch.title,
      contentType: "text",
      content: ch.text,
      overrideBasePrice: ironPrices[i],
    });
    console.log(`  ${iron.title} — ${ch.title}: $${Number(r.chapter.base_price_usdc).toFixed(2)} (${r.pricingReasoning})`);
  }
  for (const ch of lanternChapters) {
    const r = await post("/api/chapters", { seriesId: lantern.id, title: ch.title, contentType: "text", content: ch.text });
    console.log(`  ${lantern.title} — ${ch.title}: $${Number(r.chapter.base_price_usdc).toFixed(2)} (${r.pricingReasoning})`);
  }

  const { user } = await post("/api/users", { email: "demo-reader@paywithcharon.xyz" });
  await post("/api/deposit", { userId: user.id, amountUsd: 5 });
  console.log("reader:", user.id, "(funded $5.00)");

  console.log("\n✓ Seed complete. Open /read to start.");
  console.log(`  Reader id (localStorage 'charon_user_id'): ${user.id}`);
  console.log(`  Creator id (localStorage 'charon_creator_id'): ${creator.id}`);
}

main().catch((e) => {
  console.error("seed failed:", e.message);
  process.exit(1);
});
