"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, Activity, Coins, Check, ArrowRight } from "lucide-react";
import { Logo } from "@/components/Logo";
import { coverFor } from "@/lib/covers";

interface Series {
  id: string;
  slug?: string | null;
  title: string;
  genre: string | null;
  description: string | null;
  cover_image: string | null;
}

const LS_KEY = "charon_user_id";
const CREDIT_KEY = "charon_welcome_credit";
const WELCOME_CREDIT = 0.5;
const AMOUNTS = [3, 5, 10];

export default function Onboarding() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [step, setStep] = useState(0);
  const [balance, setBalance] = useState(0);
  const [creditApplied, setCreditApplied] = useState(false);
  const [custom, setCustom] = useState("");
  const [busy, setBusy] = useState(false);
  const [series, setSeries] = useState<Series[]>([]);

  // Apply the one-time $0.50 welcome credit the first time a reader onboards.
  const applyWelcomeCredit = useCallback(async (id: string) => {
    if (localStorage.getItem(CREDIT_KEY)) {
      setCreditApplied(true);
      return;
    }
    try {
      const res = await fetch("/api/deposit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: id, amountUsd: WELCOME_CREDIT }),
      });
      const data = await res.json();
      if (typeof data.balance === "number") setBalance(data.balance);
      localStorage.setItem(CREDIT_KEY, "1");
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

  async function deposit(amount: number) {
    if (!userId || !amount || amount <= 0) return;
    setBusy(true);
    try {
      const res = await fetch("/api/deposit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, amountUsd: amount }),
      });
      const data = await res.json();
      if (typeof data.balance === "number") setBalance(data.balance);
      setCustom("");
      setStep(2);
    } finally {
      setBusy(false);
    }
  }

  if (!userId) return null;

  return (
    <div className="mx-auto flex min-h-[calc(100vh-4.5rem)] max-w-2xl flex-col px-6 py-10">
      {/* Progress */}
      <div className="mb-10 flex items-center gap-2">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors ${
              i <= step ? "bg-[var(--color-gold)]" : "bg-[var(--color-surface-2)]"
            }`}
          />
        ))}
      </div>

      {step === 0 && (
        <section className="fade-up flex flex-1 flex-col">
          <p className="text-utility text-[var(--color-gold)]">Welcome to Charon</p>
          <h1 className="font-display display-md mt-2 font-semibold">How Charon works</h1>
          <p className="mt-4 max-w-xl text-lg text-[var(--color-muted)]">
            You read. We quietly track how deeply you engage. We pay the creator automatically after your
            session — a fair nanopayment, settled on Arc.
          </p>

          {/* Flow illustration */}
          <div className="mt-12 grid gap-3 sm:grid-cols-[1fr_auto_1fr_auto_1fr] sm:items-center">
            <FlowNode icon={BookOpen} label="You read" sub="Open any chapter" />
            <FlowArrow />
            <FlowNode icon={Activity} label="We track" sub="Engagement, silently" />
            <FlowArrow />
            <FlowNode icon={Coins} label="Creator paid" sub="Auto-settled after" accent />
          </div>

          <div className="mt-auto pt-12">
            <button onClick={() => setStep(1)} className="btn-coin w-full sm:w-auto">
              Get started <ArrowRight size={16} />
            </button>
          </div>
        </section>
      )}

      {step === 1 && (
        <section className="fade-up flex flex-1 flex-col">
          <p className="text-utility text-[var(--color-gold)]">Step 2 — Add funds</p>
          <h1 className="font-display display-md mt-2 font-semibold">Top up to read</h1>
          <p className="mt-3 text-[var(--color-muted)]">
            Add USDC with a card via Circle. You only spend it as you read — typically a few cents a chapter.
          </p>

          {creditApplied && (
            <div className="mt-5 flex items-center gap-3 border border-[var(--color-accent-2)] bg-[color-mix(in_srgb,var(--color-accent-2)_8%,transparent)] p-4">
              <Check size={18} className="shrink-0 text-[var(--color-accent-2)]" />
              <p className="text-sm">
                We&apos;ve added{" "}
                <span className="font-semibold text-[var(--color-accent-2)]">${WELCOME_CREDIT.toFixed(2)}</span> to your
                balance to get you started.
              </p>
            </div>
          )}

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {AMOUNTS.map((a) => (
              <button
                key={a}
                disabled={busy}
                onClick={() => deposit(a)}
                className="group border border-[var(--color-border)] bg-[var(--color-surface)] p-5 text-left transition-colors hover:border-[var(--color-gold)] disabled:opacity-50"
              >
                <p className="font-display text-3xl font-bold text-coin">${a}</p>
                <p className="mt-2 text-xs text-[var(--color-muted)]">
                  ≈ {a * 20}–{a * 50} chapters depending on what you read
                </p>
              </button>
            ))}
          </div>

          <div className="mt-4 flex items-center gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-muted)]">$</span>
              <input
                type="number"
                min="1"
                step="1"
                placeholder="Custom amount"
                value={custom}
                onChange={(e) => setCustom(e.target.value)}
                className="charon-input pl-7"
              />
            </div>
            <button
              disabled={busy || !custom || Number(custom) <= 0}
              onClick={() => deposit(Number(custom))}
              className="btn-outline shrink-0"
            >
              Add
            </button>
          </div>

          <p className="mt-3 text-xs text-[var(--color-muted)]">
            Current balance: <span className="tabular text-[var(--color-ink)]">${balance.toFixed(2)}</span>
          </p>

          <div className="mt-auto flex items-center justify-between pt-12">
            <button onClick={() => setStep(0)} className="text-sm text-[var(--color-muted)] hover:text-[var(--color-ink)]">
              ← Back
            </button>
            <button onClick={() => setStep(2)} className="text-sm text-[var(--color-muted)] hover:text-[var(--color-ink)]">
              Skip for now →
            </button>
          </div>
        </section>
      )}

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
                  <img
                    src={coverFor(s.id, s.cover_image)}
                    alt=""
                    className="h-32 w-24 shrink-0 object-cover grayscale-[0.15]"
                  />
                  <div className="min-w-0">
                    {s.genre && <p className="text-utility text-[var(--color-muted)]">{s.genre}</p>}
                    <h3 className="font-display mt-0.5 text-lg font-semibold leading-tight group-hover:text-[var(--color-gold)]">
                      {s.title}
                    </h3>
                    {s.description && (
                      <p className="mt-1 line-clamp-2 text-xs text-[var(--color-muted)]">{s.description}</p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}

          <div className="mt-auto flex items-center justify-between pt-12">
            <button onClick={() => setStep(1)} className="text-sm text-[var(--color-muted)] hover:text-[var(--color-ink)]">
              ← Back
            </button>
            <button onClick={() => router.push("/read")} className="text-sm text-[var(--color-gold)]">
              Browse everything →
            </button>
          </div>
        </section>
      )}
    </div>
  );
}

function FlowNode({
  icon: Icon,
  label,
  sub,
  accent,
}: {
  icon: typeof BookOpen;
  label: string;
  sub: string;
  accent?: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-2 border border-[var(--color-border)] bg-[var(--color-surface)] p-5 text-center">
      <div
        className={`grid h-11 w-11 place-items-center border border-[var(--color-border)] ${
          accent ? "text-[var(--color-gold)]" : "text-[var(--color-ink)]"
        }`}
      >
        <Icon size={20} strokeWidth={1.5} />
      </div>
      <p className="font-display text-base font-semibold">{label}</p>
      <p className="text-xs text-[var(--color-muted)]">{sub}</p>
    </div>
  );
}

function FlowArrow() {
  return (
    <div className="grid place-items-center py-1 text-[var(--color-gold)] sm:py-0">
      <ArrowRight size={18} className="rotate-90 sm:rotate-0" />
    </div>
  );
}
