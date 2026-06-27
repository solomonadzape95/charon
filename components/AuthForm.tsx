"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/Logo";

type Role = "reader" | "creator";

const COPY: Record<Role, { eyebrow: string; title: string; blurb: string; cta: string }> = {
  reader: {
    eyebrow: "For readers",
    title: "Read freely",
    blurb: "Email only — no wallet. Deposit once, read anything, pay fair value automatically.",
    cta: "Continue",
  },
  creator: {
    eyebrow: "For creators",
    title: "Publish & earn",
    blurb: "Email only — no crypto needed. Upload your series; get paid per chapter, per reader.",
    cta: "Create account",
  },
};

const LS_KEY = { reader: "charon_user_id", creator: "charon_creator_id" } as const;

export function AuthForm({ role, onAuthed }: { role: Role; onAuthed?: (id: string) => void }) {
  const router = useRouter();
  const copy = COPY[role];
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [wallet, setWallet] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const endpoint = role === "reader" ? "/api/users" : "/api/creators";
      const body =
        role === "reader" ? { email } : { email, name: name || undefined, walletAddress: wallet || undefined };
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      const entity = data.user ?? data.creator;
      if (!res.ok || !entity) {
        setError(data.error ?? "Something went wrong.");
        return;
      }
      localStorage.setItem(LS_KEY[role], entity.id);
      if (onAuthed) onAuthed(entity.id);
      else router.push(role === "reader" ? "/dashboard" : "/creator");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="w-full max-w-md">
      <div className="mb-8 flex flex-col items-start">
        <Logo size={84} className="mb-6 text-[var(--color-gold)]" />
        <p className="text-utility text-[var(--color-gold)]">{copy.eyebrow}</p>
        <h1 className="font-display display-md mt-2 font-semibold">{copy.title}</h1>
        <p className="mt-3 text-[var(--color-muted)]">{copy.blurb}</p>
      </div>

      <form onSubmit={submit} className="space-y-3">
        <input
          type="email"
          required
          placeholder="you@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="charon-input"
        />
        {role === "creator" && (
          <>
            <input placeholder="Pen name" value={name} onChange={(e) => setName(e.target.value)} className="charon-input" />
            <input
              placeholder="Payout wallet — 0x… on Arc (optional)"
              value={wallet}
              onChange={(e) => setWallet(e.target.value)}
              className="charon-input"
            />
          </>
        )}
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button disabled={busy} className="btn-coin w-full">
          {busy ? "…" : copy.cta}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-[var(--color-muted)]">
        {role === "reader" ? (
          <>
            Want to publish?{" "}
            <a href="/creator/join" className="text-[var(--color-gold)]">
              Join as a creator
            </a>
          </>
        ) : (
          <>
            Here to read?{" "}
            <a href="/join" className="text-[var(--color-gold)]">
              Sign in as a reader
            </a>
          </>
        )}
      </p>
    </div>
  );
}

/** Full-screen split auth surface for the standalone /join and /creator/join pages. */
export function AuthScreen({ role }: { role: Role }) {
  const image = role === "reader" ? "/hero/03-original.jpg" : "/hero/06-original.jpg";
  return (
    <div className="grid min-h-screen md:grid-cols-2">
      {/* Image panel */}
      <div className="relative hidden overflow-hidden border-r border-[var(--color-border)] md:block">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={image} alt="" className="absolute inset-0 h-full w-full object-cover grayscale-[0.2]" />
        <div className="absolute inset-0 bg-gradient-to-tr from-black/85 via-black/40 to-transparent" />
        <a href="/" className="absolute left-8 top-8 flex items-center gap-2.5">
          <Logo size={40} className="text-[var(--color-gold)]" />
          <span className="font-display text-2xl font-semibold text-coin">Charon</span>
        </a>
        <p className="font-display absolute bottom-10 left-8 right-8 text-3xl font-semibold leading-tight">
          Read freely.<br />Pay for what it&apos;s worth.
        </p>
      </div>

      {/* Form panel */}
      <div className="fade-up grid place-items-center px-6 py-16 sm:px-12">
        <AuthForm role={role} />
      </div>
    </div>
  );
}
