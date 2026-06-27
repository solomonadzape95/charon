// Agents as an image bento — one tall feature tile + one wide + two small.
const TILES = [
  {
    n: "I",
    name: "Reading Intelligence",
    body: "Reads each session — time, re-reads, binge depth — and pays the creator what it was worth.",
    img: "/hero/02-original.jpg",
    span: "md:col-span-1 md:row-span-2",
  },
  {
    n: "II",
    name: "Creator Pricing",
    body: "Sets a fair base price for every chapter the moment it's uploaded.",
    img: "/hero/05-original.jpg",
    span: "md:col-span-2 md:row-span-1",
  },
  {
    n: "III",
    name: "Dynamic Repricing",
    body: "Tunes prices from live demand — capped, never sudden.",
    img: "/hero/07-original.jpg",
    span: "md:col-span-1 md:row-span-1",
  },
  {
    n: "IV",
    name: "Budget Allocation",
    body: "Watches your balance and times top-ups and early access.",
    img: "/hero/09-original.jpg",
    span: "md:col-span-1 md:row-span-1",
  },
];

export function AgentsBento() {
  return (
    <section className="mx-auto max-w-[88rem] px-6 py-20 lg:px-10">
      <div className="mb-10 max-w-2xl">
        <p className="text-utility mb-4 text-[var(--color-gold)]">Four agents at work</p>
        <h2 className="font-display display-md font-semibold">
          Real decisions, settled on-chain — shown to you in one plain line.
        </h2>
      </div>

      <div className="grid auto-rows-[15rem] grid-cols-1 gap-3 md:grid-cols-3 md:grid-rows-2">
        {TILES.map((t) => (
          <article
            key={t.name}
            className={`group relative overflow-hidden border border-[var(--color-border)] ${t.span}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={t.img}
              alt=""
              className="absolute inset-0 h-full w-full object-cover grayscale-[0.25] transition-transform duration-700 ease-out group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/45 to-black/20" />
            <div className="relative flex h-full flex-col justify-between p-6">
              <span className="font-display text-3xl font-bold text-coin">{t.n}</span>
              <div>
                <h3 className="font-display text-xl font-semibold text-[var(--color-ink)]">{t.name}</h3>
                <p className="mt-1.5 max-w-sm text-[var(--color-muted)]">{t.body}</p>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
