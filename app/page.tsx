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

function Agent({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
      <h3 className="mb-1 text-sm font-semibold text-[var(--color-gold)]">{title}</h3>
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
          Settled on Arc · USDC · per session
        </div>
        <h1 className="mx-auto max-w-3xl text-balance text-5xl font-bold leading-tight tracking-tight">
          Read freely. Pay for what it&apos;s{" "}
          <span className="text-[var(--color-gold)]">worth</span>.
        </h1>
        <p className="mx-auto max-w-2xl text-lg text-[var(--color-muted)]">
          Charon is a reading platform where an AI agent watches each session — time
          spent, re-reads, binge depth, loyalty — and settles a fair nanopayment to the
          creator after you read. No subscription. No paywall mid-chapter. Just read,
          and value flows automatically.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link
            href="/read"
            className="rounded-lg bg-[var(--color-gold)] px-5 py-2.5 text-sm font-semibold text-black transition-opacity hover:opacity-90"
          >
            Start reading
          </Link>
          <Link
            href="/creator"
            className="rounded-lg border border-[var(--color-border)] px-5 py-2.5 text-sm font-semibold transition-colors hover:bg-[var(--color-surface-2)]"
          >
            I&apos;m a creator
          </Link>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <Step n={1} title="Deposit once" body="Add a USDC balance with a card or wallet — Circle handles the onramp invisibly." />
        <Step n={2} title="Read anything" body="No paywalls, no coins to buy. Open a chapter and read like any other app." />
        <Step n={3} title="Pay fairly, automatically" body="After each session the agent values what you read and settles it to creators on Arc." />
      </section>

      <section className="space-y-4">
        <h2 className="text-center text-2xl font-bold">Four agents doing the work</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Agent title="Reading Intelligence" body="Values each session from real engagement signals and settles to every creator you read." />
          <Agent title="Creator Pricing" body="Sets a fair base price for each chapter the moment it's uploaded." />
          <Agent title="Dynamic Repricing" body="Continuously adjusts prices from demand, time decay, loyalty and binge signals." />
          <Agent title="Budget Allocation" body="Watches your balance, suggests top-ups and pre-release mode at the right time." />
        </div>
      </section>
    </div>
  );
}
