import Link from "next/link";
import { SafeImage } from "@/components/SafeImage";
import { HeroCollage } from "@/components/landing/HeroCollage";
import { StatsBand } from "@/components/landing/StatsBand";
import { AuthorsBand } from "@/components/landing/AuthorsBand";
import { BigFooter } from "@/components/landing/BigFooter";
import { ReviewForm } from "@/components/ReviewForm";

const MARQUEE = [
  "NANOPAYMENTS",
  "SETTLED ON ARC",
  "NO SUBSCRIPTION",
  "PAY PER CHAPTER",
  "READ FREELY",
  "CREATORS KEEP IT",
  "USDC · x402",
];

const DIFF = [
  {
    icon: "/per-read.svg",
    title: "Pay per read",
    body: "No subscription. You pay for the chapters you actually read, scaled to how deeply you engaged.",
    old: "Subscriptions charge the skimmer and the superfan the same.",
  },
  {
    icon: "/prices.svg",
    title: "Living prices",
    body: "Every chapter re-prices from real demand and reader behaviour — gently, capped at 20% a day.",
    old: "Fixed prices ignore what readers love or skip.",
  },
  {
    icon: "/loyalty.svg",
    title: "Loyalty pays off",
    body: "Follow from chapter one and pay less. New readers and bingers get discounts too.",
    old: "Patreon tiers are flat and forget how long you've stayed.",
  },
  {
    icon: "/creators.svg",
    title: "Creators keep it",
    body: "Earnings hit the creator's wallet per chapter, in real time. A small settlement fee, nothing else.",
    old: "Royal Road sends readers to Patreon. Webtoon and WebNovel take the rest.",
  },
  {
    icon: "/access.svg",
    title: "Early access, automated",
    body: "Opt in and new chapters auto-unlock the moment they drop. Or buy a finished series in one tap.",
    old: "Patreon early access is manual, monthly, and takes a cut.",
  },
  {
    icon: "/uninterrupted.svg",
    title: "No interruptions",
    body: "Never stopped mid-chapter to buy coins. Read now; value flows after.",
    old: "Coin-gated apps break the story to sell you tokens.",
  },
];

const STEPS = [
  { n: "01", title: "Deposit once", body: "Add USDC with a card or wallet. Circle handles the onramp — no coins to buy." },
  { n: "02", title: "Read anything", body: "Open any chapter. The agent quietly notes how you engage." },
  { n: "03", title: "Creators get paid", body: "A fair nanopayment settles to every creator you read — on Arc, instantly." },
];

const PROBLEMS = [
  {
    n: "01",
    title: "Paywalls kill the story",
    body: "Hit a wall mid-chapter and most readers just leave. “Buy 100 coins to continue” is where good stories go to die.",
    tag: "Readers walk away",
  },
  {
    n: "02",
    title: "One price fits no one",
    body: "A flat subscription charges the skimmer and the superfan the same — and pays the author who hooked you the same as the one you abandoned.",
    tag: "The unit is wrong",
  },
  {
    n: "03",
    title: "Creators get the scraps",
    body: "Platforms take a heavy cut and push readers off to Patreon. Writers earn pennies on millions of reads, and can’t price what a chapter is truly worth.",
    tag: "Authors underpaid",
  },
];

export default function Home() {
  return (
    <>
      <HeroCollage />
      <StatsBand />

      {/* Text marquee */}
      <section className="overflow-hidden border-b border-[var(--color-border)] py-5">
        <div className="flex w-max marquee-text">
          {[...MARQUEE, ...MARQUEE].map((w, i) => (
            <span key={i} className="text-utility flex items-center text-[var(--color-muted)]">
              <span className="px-6">{w}</span>
              <span className="text-[var(--color-gold)]">✦</span>
            </span>
          ))}
        </div>
      </section>

      {/* The problem — three tensions, hairline-split cards */}
      <section className="border-b border-[var(--color-border)]">
        <div className="mx-auto max-w-[88rem] px-6 py-24 lg:px-10">
          <div className="max-w-3xl">
            <p className="text-utility mb-4 text-[var(--color-gold)]">The problem</p>
            <h2 className="font-display display-md font-semibold">
              Reading online is a bad deal — for the people reading <span className="text-coin">and</span> the people writing.
            </h2>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-[var(--color-muted)]">
              Paywalls break the very stories they’re protecting. Flat subscriptions price everyone wrong.
              And the platforms in the middle keep most of the money. Nobody is paid for what a chapter is
              actually worth — because nobody could charge a few cents for one. Until now.
            </p>
          </div>

          <div className="mt-16 grid gap-px border border-[var(--color-border)] bg-[var(--color-border)] sm:grid-cols-3">
            {PROBLEMS.map((p) => (
              <article
                key={p.n}
                className="group relative flex flex-col bg-[var(--color-surface)] p-8 transition-colors hover:bg-[var(--color-surface-2)]"
              >
                <span className="font-display text-6xl font-bold leading-none text-coin opacity-90">{p.n}</span>
                <h3 className="font-display mt-6 text-2xl font-semibold">{p.title}</h3>
                <p className="mt-2 flex-1 text-[var(--color-muted)]">{p.body}</p>
                <p className="text-utility mt-6 inline-flex w-fit items-center gap-2 text-[var(--color-gold)]">
                  <span className="h-px w-6 bg-[var(--color-gold)]" />
                  {p.tag}
                </p>
              </article>
            ))}
          </div>

          <p className="mt-10 max-w-2xl text-lg text-[var(--color-muted)]">
            <span className="text-[var(--color-ink)]">Charon fixes the unit.</span> Read freely, and a tiny, fair
            payment settles per chapter — on rails finally cheap enough to make it work.
          </p>
        </div>
      </section>

      {/* The difference — editorial index list */}
      <section className="mx-auto max-w-[88rem] px-6 lg:px-10">
        <div className="grid gap-10 py-20 md:grid-cols-12">
          <div className="md:col-span-4 md:sticky md:top-28 md:self-start">
            <p className="text-utility mb-4 text-[var(--color-gold)]">The difference</p>
            <h2 className="font-display display-md font-semibold">
              Every platform makes you choose a flat fee or ads. We fixed the unit.
            </h2>
          </div>
          <div className="md:col-span-8 gap-2">
            {DIFF.map((d) => (
              <div
                key={d.title}
                className="flex gap-5 border-t border-[var(--color-border)] first:border-t-0 first:pt-0"
              >
                <div className="mt-1 grid w-40 shrink-0 place-items-center border border-[var(--color-border)] bg-[var(--color-surface)]">
                  <span
                    aria-hidden
                    className="block h-28 w-28 bg-[var(--color-gold)]"
                    style={{
                      WebkitMaskImage: `url(${d.icon})`,
                      maskImage: `url(${d.icon})`,
                      WebkitMaskRepeat: "no-repeat",
                      maskRepeat: "no-repeat",
                      WebkitMaskPosition: "center",
                      maskPosition: "center",
                      WebkitMaskSize: "contain",
                      maskSize: "contain",
                    }}
                  />
                </div>
                <div className="py-8">
                  <h3 className="font-display text-2xl font-semibold md:text-3xl">{d.title}</h3>
                  <p className="mt-2 max-w-xl text-[var(--color-muted)]">{d.body}</p>
                  <p className="mt-3 text-sm text-[var(--color-muted)]/70">— {d.old}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works — three numbered columns split by hairlines */}
      <section className="border-y border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="mx-auto max-w-[88rem] px-6 py-20 lg:px-10">
          <p className="text-utility mb-12 text-[var(--color-gold)]">How it works</p>
          <div className="grid md:grid-cols-3">
            {STEPS.map((s, i) => (
              <div
                key={s.n}
                className={`flex flex-col gap-4 py-2 md:px-10 md:first:pl-0 ${
                  i > 0 ? "border-t border-[var(--color-border)] pt-10 md:border-l md:border-t-0 md:pt-2" : ""
                }`}
              >
                <span className="font-display text-6xl font-bold text-coin">{s.n}</span>
                <h3 className="font-display text-2xl font-semibold">{s.title}</h3>
                <p className="text-[var(--color-muted)]">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Favourite authors */}
      <AuthorsBand />

      {/* Feedback / reviews */}
      <section id="feedback" className="border-y border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="mx-auto max-w-2xl px-6 py-20 lg:px-10">
          <p className="text-utility mb-3 text-[var(--color-gold)]">Tell us what you think</p>
          <h2 className="font-display display-md mb-3 font-semibold">Charon is in testnet beta.</h2>
          <p className="mb-8 text-[var(--color-muted)]">
            We&apos;re building this in the open. What works, what&apos;s confusing, what would make you
            read (or publish) here? A line or two helps a lot.
          </p>
          <ReviewForm />
        </div>
      </section>

      {/* Closing — CTA image as a grayed-out background */}
      <section className="relative flex min-h-[60vh] items-center overflow-hidden border-t border-[var(--color-border)] bg-[var(--color-surface)]">
        <SafeImage src="/cta.png" alt="" className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-25 grayscale" />
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[var(--color-bg)] via-[color-mix(in_srgb,var(--color-bg)_82%,transparent)] to-[color-mix(in_srgb,var(--color-bg)_68%,transparent)]" />
        <div className="relative z-10 mx-auto flex w-full max-w-[88rem] flex-col items-center gap-6 px-6 py-24 text-center lg:px-10">
          <h2 className="font-display display-md max-w-2xl font-semibold">Every chapter, paid the moment it&apos;s read.</h2>
          <div className="flex flex-wrap justify-center gap-3">
            <Link href="/read" className="btn-coin">
              Start reading
            </Link>
            <Link href="/creator" className="btn-outline">
              Publish your work
            </Link>
          </div>
        </div>
      </section>

      <BigFooter />
    </>
  );
}
