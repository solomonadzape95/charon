"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, Activity, Coins, Check, ArrowRight, ArrowLeft } from "lucide-react";
import { coverFor } from "@/lib/covers";
import { DepositPanel } from "@/components/DepositPanel";

interface Series {
  id: string;
  slug?: string | null;
  title: string;
  genre: string | null;
  description: string | null;
  cover_image: string | null;
}

const LS_KEY = "charon_user_id";
const WELCOME_CREDIT = 0.5; // display default; the server is the source of truth

export default function Onboarding() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [step, setStep] = useState(0);
  const [balance, setBalance] = useState(0);
  const [creditApplied, setCreditApplied] = useState(false);
  const [creditAmount, setCreditAmount] = useState(WELCOME_CREDIT);
  const [series, setSeries] = useState<Series[]>([]);

  // Apply the one-time welcome credit. Idempotent server-side — the DB grants it
  // at most once per reader, so the dev double-render can't double-credit.
  const applyWelcomeCredit = useCallback(async (id: string) => {
    try {
      const res = await fetch("/api/me/welcome-credit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: id }),
      });
      const data = await res.json();
      if (typeof data.balance === "number") setBalance(data.balance);
      if (typeof data.amount === "number") setCreditAmount(data.amount);
      setCreditApplied(true);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    const id = localStorage.getItem(LS_KEY);
    if (!id) {
      router.replace("/join");
      return;
    }
    setUserId(id);
    fetch(`/api/users?id=${id}`)
      .then((r) => r.json())
      .then((d) => d.user && setBalance(Number(d.user.balance_usd)))
      .catch(() => {});
    applyWelcomeCredit(id);
    fetch("/api/series")
      .then((r) => r.json())
      .then((d) => setSeries((d.series ?? []).slice(0, 8)))
      .catch(() => {});
  }, [router, applyWelcomeCredit]);

  if (!userId) return null;

  return (
    <div className="mx-auto flex min-h-[calc(100vh-4.5rem)] max-w-2xl flex-col px-6 py-10">
      {/* Progress */}
      <div className="mb-10 flex items-center gap-2">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors ${i <= step ? "bg-[var(--color-gold)]" : "bg-[var(--color-surface-2)]"}`}
          />
        ))}
      </div>

      {/* ── Step 1 — how it works ── */}
      {step === 0 && (
        <section className="fade-up flex flex-1 flex-col">
          <p className="text-utility text-[var(--color-gold)]">Welcome to Charon</p>
          <h1 className="font-display display-md mt-2 font-semibold">How Charon works</h1>
          <p className="mt-4 max-w-xl text-lg leading-relaxed text-[var(--color-muted)]">
            No coins. No subscriptions. No paywall mid-chapter. You just read — and the creator gets paid a fair amount
            automatically, the moment you finish.
          </p>

          <ol className="mt-10 divide-y divide-[var(--color-border)] border border-[var(--color-border)]">
            <StepRow
              n="01"
              icon={BookOpen}
              title="You read"
              desc="Open any chapter and read. Nothing interrupts you — no prompts, no coin meter ticking down."
            />
            <StepRow
              n="02"
              icon={Activity}
              title="We measure the read"
              desc="An AI agent quietly gauges how deeply you engaged — time spent, how much you finished, what you re-read."
            />
            <StepRow
              n="03"
              icon={Coins}
              title="The creator is paid"
              desc="A fair USDC nanopayment settles to them on Arc, automatically. You only pay for what you actually read."
              accent
            />
          </ol>

          <p className="mt-6 text-sm italic leading-relaxed text-[var(--color-muted)]">
            The ferryman took one coin per crossing. Every chapter is a crossing — the coin is automatic.
          </p>

          <div className="mt-auto flex justify-end pt-10">
            <button onClick={() => setStep(1)} className="btn-coin w-full sm:w-auto">
              Get started <ArrowRight size={16} />
            </button>
          </div>
        </section>
      )}

      {/* ── Step 2 — add funds ── */}
      {step === 1 && (
        <section className="fade-up flex flex-1 flex-col">
          <p className="text-utility text-[var(--color-gold)]">Step 2 — Add funds</p>
          <h1 className="font-display display-md mt-2 font-semibold">Top up to read</h1>
          <p className="mt-3 text-[var(--color-muted)]">
            Add USDC and you only spend it as you read — typically a few cents a chapter. Totally optional to start.
          </p>

          {creditApplied && (
            <div className="mt-5 flex items-center gap-3 border border-[var(--color-accent-2)] bg-[color-mix(in_srgb,var(--color-accent-2)_8%,transparent)] p-4">
              <Check size={18} className="shrink-0 text-[var(--color-accent-2)]" />
              <p className="text-sm">
                We&apos;ve added <span className="font-semibold text-[var(--color-accent-2)]">${creditAmount.toFixed(2)}</span>{" "}
                of free credit to get you started — enough to read right now.
              </p>
            </div>
          )}

          <div className="mt-6">
            <DepositPanel userId={userId} onCredited={(b) => setBalance(b)} />
          </div>

          <p className="mt-3 text-xs text-[var(--color-muted)]">
            Balance: <span className="tabular text-[var(--color-ink)]">${balance.toFixed(2)}</span>
          </p>

          <div className="mt-auto flex flex-col-reverse items-stretch gap-4 pt-10 sm:flex-row sm:items-center sm:justify-between">
            <button onClick={() => setStep(0)} className="btn-outline">
              <ArrowLeft size={16} /> Back
            </button>
            <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:gap-4">
              <span className="text-center text-xs text-[var(--color-muted)] sm:text-right">
                No deposit needed — you can start with your free credit.
              </span>
              <button onClick={() => setStep(2)} className="btn-coin">
                Skip for now <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </section>
      )}

      {/* ── Step 3 — pick a series ── */}
      {step === 2 && (
        <section className="fade-up flex flex-1 flex-col">
          <p className="text-utility text-[var(--color-gold)]">Step 3 — Start reading</p>
          <h1 className="font-display display-md mt-2 font-semibold">Pick your first series</h1>
          <p className="mt-3 text-[var(--color-muted)]">Tap one to dive straight in. You can always browse more later.</p>

          {series.length === 0 ? (
            <p className="mt-8 text-sm text-[var(--color-muted)]">No series available yet.</p>
          ) : (
            <div className="mt-6 grid gap-px border border-[var(--color-border)] bg-[var(--color-border)] sm:grid-cols-2">
              {series.map((s) => (
                <button
                  key={s.id}
                  onClick={() => router.push(`/series/${s.slug ?? s.id}`)}
                  className="group flex gap-4 bg-[var(--color-bg)] p-4 text-left transition-colors hover:bg-[var(--color-surface)]"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={coverFor(s.id, s.cover_image)} alt="" className="h-32 w-24 shrink-0 object-cover grayscale-[0.15]" />
                  <div className="min-w-0">
                    {s.genre && <p className="text-utility text-[var(--color-muted)]">{s.genre}</p>}
                    <h3 className="font-display mt-0.5 text-lg font-semibold leading-tight group-hover:text-[var(--color-gold)]">
                      {s.title}
                    </h3>
                    {s.description && <p className="mt-1 line-clamp-2 text-xs text-[var(--color-muted)]">{s.description}</p>}
                  </div>
                </button>
              ))}
            </div>
          )}

          <div className="mt-auto flex items-center justify-between gap-4 pt-10">
            <button onClick={() => setStep(1)} className="btn-outline">
              <ArrowLeft size={16} /> Back
            </button>
            <button onClick={() => router.push("/read")} className="btn-coin">
              Browse everything <ArrowRight size={16} />
            </button>
          </div>
        </section>
      )}
    </div>
  );
}

function StepRow({
  n,
  icon: Icon,
  title,
  desc,
  accent,
}: {
  n: string;
  icon: typeof BookOpen;
  title: string;
  desc: string;
  accent?: boolean;
}) {
  return (
    <li className="flex items-start gap-4 bg-[var(--color-surface)] p-5 sm:gap-5 sm:p-6">
      <span className="font-display tabular w-9 shrink-0 text-3xl font-bold text-coin sm:w-12 sm:text-4xl">{n}</span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <Icon size={18} strokeWidth={1.5} className={accent ? "text-[var(--color-gold)]" : "text-[var(--color-ink)]"} />
          <h3 className="font-display text-lg font-semibold">{title}</h3>
        </div>
        <p className="mt-1.5 text-sm leading-relaxed text-[var(--color-muted)]">{desc}</p>
      </div>
    </li>
  );
}
