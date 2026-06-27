"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/Logo";

type Role = "reader" | "creator";

const COPY: Record<Role, { eyebrow: string; title: string; blurb: string; cta: string }> = {
  reader: {
    eyebrow: "For readers",
    title: "Cross freely",
    blurb:
      "Sign up with email — no wallet required. Deposit a balance once and read anything; the agent settles a fair coin to creators after each session.",
    cta: "Enter",
  },
  creator: {
    eyebrow: "For creators",
    title: "Carry your work across",
    blurb:
      "Sign up with email — no crypto knowledge required. Upload your series; the agent prices each chapter and pays you directly as readers finish them.",
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
      <div className="mb-7 flex flex-col items-center text-center">
        <Logo size={52} className="mb-5 text-[var(--color-gold)]" />
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

/** Full-screen mythic auth surface for the standalone /join and /creator/join pages. */
export function AuthScreen({ role }: { role: Role }) {
  return (
    <div className="relative grid min-h-[calc(100vh-4.5rem)] place-items-center overflow-hidden px-6 py-16">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage: "radial-gradient(circle at 50% 0%, var(--color-gold) 0%, transparent 60%)",
        }}
      />
      <div className="fade-up relative">
        <AuthForm role={role} />
      </div>
    </div>
  );
}
