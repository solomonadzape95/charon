import Link from "next/link";

function Step({ n, title, body }: { n: number; title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
      <div className="mb-3 grid h-8 w-8 place-items-center rounded-full bg-[var(--color-surface-2)] text-sm font-bold text-[var(--color-gold)]">
        {n}
      </div>
      <h3 className="mb-1 text-base font-semibold">{title}</h3>
      <p className="text-sm text-[var(--color-muted)]">{body}</p>
    </div>
  );
}

export default function Home() {
  return (
    <div className="space-y-16">
      <section className="fade-up space-y-6 pt-8 text-center">
        <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1 text-xs text-[var(--color-muted)]">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-accent-2)] pulse-dot" />
          Settled on Arc · USDC · under 500ms
        </div>
        <h1 className="mx-auto max-w-3xl text-balance text-5xl font-bold leading-tight tracking-tight">
          Tip any creator on the internet,{" "}
          <span className="text-[var(--color-gold)]">instantly</span>.
        </h1>
        <p className="mx-auto max-w-2xl text-lg text-[var(--color-muted)]">
          Paste any URL in Telegram. Charon&apos;s agent identifies the creator, finds
          their wallet, sizes a fair tip, and routes a nanopayment — even if the
          creator has never signed up. If they haven&apos;t, we hold the funds and
          send them a claim link. The creator comes to you.
        </p>
        <div className="flex flex-wrap justify-center gap-3 pt-2">
          <Link
            href="/dashboard"
            className="rounded-lg bg-[var(--color-gold)] px-5 py-2.5 font-medium text-black transition-opacity hover:opacity-90"
          >
            Get started →
          </Link>
          <Link
            href="/stats"
            className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-2.5 font-medium transition-colors hover:bg-[var(--color-surface-2)]"
          >
            Live stats
          </Link>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <Step n={1} title="Top up once" body="Deposit USDC into your Charon balance, like topping up Uber. No wallet popups, no signing per tip." />
        <Step n={2} title="Send a URL" body="In Telegram: /tip <url>. The agent reads the page, identifies the creator across ENS, Mirror, GitHub & Farcaster, and suggests an amount." />
        <Step n={3} title="The creator gets paid" body="High-confidence match → routed directly on Arc. No wallet found → held in escrow with a claim link emailed to the creator." />
      </section>

      <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-8 text-center">
        <h2 className="mb-2 text-2xl font-semibold">What makes it agentic</h2>
        <p className="mx-auto max-w-2xl text-sm text-[var(--color-muted)]">
          Every tip is real multi-step reasoning: fetch the content, extract the
          creator&apos;s identity, search 4+ platforms for a wallet, score confidence,
          estimate value from the content&apos;s depth, then decide between direct
          payment and escrow. The agent identifies, decides, routes, and notifies —
          not just automating a button click.
        </p>
      </section>
    </div>
  );
}
