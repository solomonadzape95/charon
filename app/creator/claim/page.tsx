"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PenLine, Check, ArrowRight } from "lucide-react";
import { Logo } from "@/components/Logo";
import { syncSession, setCreatorId } from "@/lib/account";

interface ClaimCreator {
  id: string;
  name: string | null;
  slug: string | null;
  bio: string | null;
  claimed: boolean;
  boundEmail: string | null;
}

export default function CreatorClaim() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [creator, setCreator] = useState<ClaimCreator | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async (t: string) => {
    try {
      const [cRes, session] = await Promise.all([
        fetch(`/api/creator/claim?token=${encodeURIComponent(t)}`).then((r) => r.json()),
        syncSession(),
      ]);
      if (cRes.creator) setCreator(cRes.creator as ClaimCreator);
      else setError(cRes.error ?? "Invalid claim link.");
      setEmail(session?.email ?? null);
    } catch {
      setError("Something went wrong loading this claim link.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("token");
    if (!t) {
      setError("This claim link is missing its token.");
      setLoading(false);
      return;
    }
    setToken(t);
    load(t);
  }, [load]);

  async function claim() {
    if (!token) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/creator/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const d = await res.json();
      if (!res.ok) {
        setError(d.error ?? "Could not claim this profile.");
        return;
      }
      setCreatorId(d.creatorId);
      router.replace("/creator/dashboard");
    } finally {
      setBusy(false);
    }
  }

  const claimedByOther = creator?.claimed && creator.boundEmail && creator.boundEmail !== email;

  return (
    <div className="grid min-h-screen place-items-center px-6">
      <div className="w-full max-w-md text-center">
        <Logo size={44} className="mx-auto text-[var(--color-gold)]" />
        <p className="text-utility mt-4 text-[var(--color-gold)]">Claim your author profile</p>

        {loading ? (
          <p className="mt-6 text-[var(--color-muted)]">Loading…</p>
        ) : error && !creator ? (
          <>
            <h1 className="font-display mt-2 text-2xl font-semibold">Claim link problem</h1>
            <p className="mt-2 text-[var(--color-muted)]">{error}</p>
            <Link href="/" className="btn-outline mt-6 inline-block">
              Home
            </Link>
          </>
        ) : creator ? (
          <>
            <div className="mt-5 border border-[var(--color-border)] bg-[var(--color-surface)] p-6 text-left">
              <div className="flex items-center gap-3">
                <div className="grid h-11 w-11 shrink-0 place-items-center border border-[var(--color-border)] text-[var(--color-gold)]">
                  <PenLine size={20} strokeWidth={1.5} />
                </div>
                <div className="min-w-0">
                  <h1 className="font-display truncate text-xl font-semibold">{creator.name ?? "Untitled author"}</h1>
                  {creator.bio && <p className="mt-0.5 line-clamp-2 text-sm text-[var(--color-muted)]">{creator.bio}</p>}
                </div>
              </div>
            </div>

            {claimedByOther ? (
              <p className="mt-4 text-sm text-red-400">This profile has already been claimed by another account.</p>
            ) : email ? (
              <>
                <p className="mt-4 text-sm text-[var(--color-muted)]">
                  Claiming as <span className="font-semibold text-[var(--color-ink)]">{email}</span>. This links the
                  profile — and all earnings already accrued to it — to your account.
                </p>
                {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
                <button onClick={claim} disabled={busy} className="btn-coin mt-6 w-full disabled:opacity-50">
                  {busy ? "Claiming…" : (
                    <span className="inline-flex items-center gap-2">
                      <Check size={16} /> Claim this profile
                    </span>
                  )}
                </button>
              </>
            ) : (
              <>
                <p className="mt-4 text-sm text-[var(--color-muted)]">
                  Sign in first, then return to this link to finish claiming your profile and access your funds.
                </p>
                <Link href="/join" className="btn-coin mt-6 inline-flex w-full items-center justify-center gap-2">
                  Sign in <ArrowRight size={16} />
                </Link>
              </>
            )}
          </>
        ) : null}
      </div>
    </div>
  );
}
