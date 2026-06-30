import Link from "next/link";
import { HERO_COVERS } from "@/lib/hero-covers";

const STRIP = [...HERO_COVERS, ...HERO_COVERS, ...HERO_COVERS];

export function HeroCollage() {
  return (
    <section className="relative flex h-[calc(100svh-4.5rem)] flex-col overflow-hidden border-b border-[var(--color-border)]">
      {/* Top — description + first headline word */}
      <div className="mx-auto w-full max-w-[88rem] shrink-0 px-6 py-5 lg:px-10 lg:py-7">
        <div className="grid grid-cols-14 items-end gap-6">
          <div className="fade-up col-span-14 md:col-span-3">
            <p className="max-w-md text-lg leading-relaxed text-[var(--color-muted)]">
              A reading platform with <span className="text-[var(--color-ink)]">no subscription and no paywalls</span>.
              Deposit once; after each session an agent pays the creator what your reading was actually worth.
            </p>
          </div>
          <div className="col-span-14 md:col-span-11">
            <h1 className="font-display display-xl fade-up text-right font-bold tracking-tight">READ FREELY</h1>
          </div>
        </div>
      </div>

      {/* Cover marquee — decorative covers (non-linking for now) */}
      <div
        className="relative min-h-0 flex-1 overflow-hidden"
        style={{
          maskImage: "linear-gradient(to right, transparent 0%, black 5%, black 95%, transparent 100%)",
          WebkitMaskImage: "linear-gradient(to right, transparent 0%, black 5%, black 95%, transparent 100%)",
        }}
      >
        <div className="flex h-full" style={{ animation: "marquee-loop 70s linear infinite", willChange: "transform" }}>
          {STRIP.map((slot, i) => (
            <PhotoSlot key={`${slot.slug}-${i}`} {...slot} />
          ))}
        </div>
      </div>

      {/* Bottom — CTAs + accent headline word */}
      <div className="mx-auto w-full max-w-[88rem] shrink-0 px-6 py-5 lg:px-10 lg:py-7">
        <div className="grid grid-cols-12 items-start gap-6">
          <div className="fade-up col-span-12 flex flex-wrap gap-3 md:col-span-4">
            <Link href="/read" className="btn-coin">
              Start reading
            </Link>
            <Link href="/creator" className="btn-outline">
              I&apos;m a creator
            </Link>
          </div>
          <div className="col-span-12 md:col-span-8">
            <h2 className="font-display display-xl fade-up text-right font-bold tracking-tight text-coin">PAY FAIRLY</h2>
          </div>
        </div>
      </div>
    </section>
  );
}

function PhotoSlot({ cover, title, genre }: { cover: string; title: string; genre: string }) {
  return (
    <div className="group relative aspect-[5/8] h-full shrink-0 overflow-hidden bg-[var(--color-surface)]">
      <div aria-hidden className="absolute inset-0" style={{ background: "linear-gradient(135deg, #1a1a1a 0%, #0a0a0a 70%, #000 100%)" }} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={cover}
        alt={title}
        loading="lazy"
        className="absolute inset-0 h-full w-full object-cover grayscale-[0.25] transition-all duration-[900ms] ease-out group-hover:scale-105 group-hover:grayscale-0"
      />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/90 via-black/40 to-transparent px-4 pb-4 pt-12 opacity-0 transition-opacity duration-500 group-hover:opacity-100">
        <div className="font-display line-clamp-2 text-base font-semibold text-white">{title}</div>
        {genre && <div className="text-utility mt-1 capitalize text-white/70">{genre}</div>}
      </div>
    </div>
  );
}
