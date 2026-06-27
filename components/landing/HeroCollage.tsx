import Link from "next/link";

// Placeholder art (Gauntlet hero JPGs) — replace in /public/hero.
// Each slot: NN-edited.jpg (default) + NN-original.jpg (revealed on hover).
const SLOTS = [
  { title: "The Crossing", place: "River Styx" },
  { title: "Iron Ascension", place: "Ch. 1" },
  { title: "The Lantern Court", place: "Fog & Canals" },
  { title: "Obol", place: "The Ferryman's Toll" },
  { title: "Descent", place: "Book II" },
  { title: "The Devotee", place: "200 chapters in" },
  { title: "Verdigris", place: "Bronze & Age" },
  { title: "The Re-read", place: "twice over" },
  { title: "Threshold", place: "first page" },
].map((s, i) => {
  const id = String(i + 1).padStart(2, "0");
  return { ...s, edited: `/hero/${id}-edited.jpg`, original: `/hero/${id}-original.jpg` };
});

const STRIP = [...SLOTS, ...SLOTS, ...SLOTS];

export function HeroCollage() {
  return (
    <section className="relative flex h-[calc(100svh-4.5rem)] flex-col overflow-hidden border-b border-[var(--color-border)]">
      {/* Top — layman description + first headline word */}
      <div className="mx-auto w-full max-w-[88rem] shrink-0 px-6 py-5 lg:px-10 lg:py-7">
        <div className="grid grid-cols-12 items-end gap-6">
          <div className="fade-up col-span-12 md:col-span-5">
            <p className="max-w-md text-lg leading-relaxed text-[var(--color-muted)]">
              Deposit once and read webnovels and manga with{" "}
              <span className="text-[var(--color-ink)]">no subscription and no paywalls</span>.
              After each session an AI agent values what you actually read and pays the
              creator a fair coin — automatically, on-chain.
            </p>
          </div>
          <div className="col-span-12 md:col-span-7">
            <h1 className="font-display display-xl fade-up text-right font-bold tracking-tight">
              READ FREELY
            </h1>
          </div>
        </div>
      </div>

      {/* Photo marquee */}
      <div
        className="relative min-h-0 flex-1 overflow-hidden"
        style={{
          maskImage: "linear-gradient(to right, transparent 0%, black 5%, black 95%, transparent 100%)",
          WebkitMaskImage: "linear-gradient(to right, transparent 0%, black 5%, black 95%, transparent 100%)",
        }}
      >
        <div className="flex h-full" style={{ animation: "marquee-loop 70s linear infinite", willChange: "transform" }}>
          {STRIP.map((slot, i) => (
            <PhotoSlot key={`${slot.edited}-${i}`} {...slot} />
          ))}
        </div>
      </div>

      {/* Bottom — CTAs + accent headline word */}
      <div className="mx-auto w-full max-w-[88rem] shrink-0 px-6 py-5 lg:px-10 lg:py-7">
        <div className="grid grid-cols-12 items-start gap-6">
          <div className="fade-up col-span-12 flex flex-wrap gap-3 md:col-span-5">
            <Link href="/read" className="btn-coin">
              Start reading
            </Link>
            <Link href="/creator" className="btn-outline">
              I&apos;m a creator
            </Link>
          </div>
          <div className="col-span-12 md:col-span-7">
            <h2 className="font-display display-xl fade-up text-right font-bold tracking-tight text-coin">
              PAY FAIRLY
            </h2>
          </div>
        </div>
      </div>
    </section>
  );
}

function PhotoSlot({
  edited,
  original,
  title,
  place,
}: {
  edited: string;
  original: string;
  title: string;
  place: string;
}) {
  return (
    <div className="group relative aspect-[5/8] h-full shrink-0 overflow-hidden bg-[var(--color-surface)]">
      <div
        aria-hidden
        className="absolute inset-0"
        style={{ background: "linear-gradient(135deg, #1a1a1a 0%, #0a0a0a 70%, #000 100%)" }}
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={original}
        alt={title}
        loading="lazy"
        className="absolute inset-0 h-full w-full scale-105 object-cover opacity-0 transition-all duration-[1100ms] ease-out group-hover:scale-100 group-hover:opacity-100"
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={edited}
        alt={title}
        loading="lazy"
        className="absolute inset-0 h-full w-full object-cover grayscale-[0.15] transition-all duration-[1100ms] ease-out group-hover:scale-105 group-hover:opacity-0 group-hover:blur-[3px]"
      />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/85 via-black/40 to-transparent px-4 pb-4 pt-12 opacity-0 transition-opacity duration-500 group-hover:opacity-100">
        <div className="font-display text-base font-semibold text-[var(--color-ink)]">{title}</div>
        <div className="text-utility mt-1 text-[var(--color-muted)]">{place}</div>
      </div>
    </div>
  );
}
