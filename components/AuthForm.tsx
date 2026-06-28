"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Github } from "lucide-react";
import { Logo } from "@/components/Logo";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { syncSession } from "@/lib/account";

const DEMO = [
  { label: "Reader", email: "demo-reader@paywithcharon.xyz", password: "charon-demo" },
  { label: "Reader + Creator", email: "demo-creator@paywithcharon.xyz", password: "charon-demo" },
];

export function AuthForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const redirectTo =
    typeof window !== "undefined" ? `${window.location.origin}/auth/callback?next=/auth/finish` : undefined;

  async function oauth(provider: "google" | "github") {
    setError("");
    setBusy(true);
    const { error } = await supabaseBrowser().auth.signInWithOAuth({ provider, options: { redirectTo } });
    if (error) {
      setError(error.message);
      setBusy(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    const supabase = supabaseBrowser();
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: redirectTo } });
        if (error) {
          setError(error.message);
          return;
        }
        if (!data.session) {
          setNotice("Check your email to confirm your account, then sign in.");
          setMode("signin");
          return;
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          setError(error.message);
          return;
        }
      }
      const d = await syncSession();
      router.push(d?.created ? "/onboarding" : "/dashboard");
    } finally {
      setBusy(false);
    }
  }

  function fillDemo(d: (typeof DEMO)[number]) {
    setEmail(d.email);
    setPassword(d.password);
    setMode("signin");
    setError("");
  }

  return (
    <div className="w-full max-w-md">
      <div className="mb-8 flex flex-col items-start">
        <Logo size={84} className="mb-6 text-[var(--color-gold)]" />
        <p className="text-utility text-[var(--color-gold)]">Welcome</p>
        <h1 className="font-display display-md mt-2 font-semibold">{mode === "signup" ? "Create your account" : "Sign in to Charon"}</h1>
        <p className="mt-3 text-[var(--color-muted)]">
          Deposit once, read anything, pay fair value automatically. Become a creator any time.
        </p>
      </div>

      {/* OAuth */}
      <div className="space-y-2.5">
        <button onClick={() => oauth("google")} disabled={busy} className="btn-outline w-full justify-center normal-case">
          <GoogleIcon /> Continue with Google
        </button>
        <button onClick={() => oauth("github")} disabled={busy} className="btn-outline w-full justify-center normal-case">
          <Github size={16} /> Continue with GitHub
        </button>
      </div>

      <div className="my-5 flex items-center gap-3 text-utility text-[var(--color-muted)]">
        <span className="h-px flex-1 bg-[var(--color-border)]" /> or <span className="h-px flex-1 bg-[var(--color-border)]" />
      </div>

      {/* Email + password */}
      <form onSubmit={submit} className="space-y-3">
        <input type="email" required placeholder="you@email.com" value={email} onChange={(e) => setEmail(e.target.value)} className="charon-input" />
        <div className="relative">
          <input
            type={showPassword ? "text" : "password"}
            required
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="charon-input pr-12"
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
          />
          <button
            type="button"
            onClick={() => setShowPassword((s) => !s)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            className="absolute inset-y-0 right-0 grid w-11 place-items-center text-[var(--color-muted)] transition-colors hover:text-[var(--color-ink)]"
          >
            {showPassword ? <EyeOff size={18} strokeWidth={1.6} /> : <Eye size={18} strokeWidth={1.6} />}
          </button>
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
        {notice && <p className="text-sm text-[var(--color-accent-2)]">{notice}</p>}
        <button disabled={busy} className="btn-coin w-full">
          {busy ? "…" : mode === "signup" ? "Create account" : "Sign in"}
        </button>
      </form>

      <p className="mt-3 text-center text-sm text-[var(--color-muted)]">
        {mode === "signup" ? "Already have an account? " : "New to Charon? "}
        <button onClick={() => setMode(mode === "signup" ? "signin" : "signup")} className="text-[var(--color-gold)]">
          {mode === "signup" ? "Sign in" : "Create one"}
        </button>
      </p>

      {/* Demo accounts */}
      <div className="mt-5 border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
        <p className="text-utility text-[var(--color-muted)]">Demo accounts — tap to fill</p>
        <div className="mt-3 space-y-2">
          {DEMO.map((d) => (
            <button
              key={d.email}
              onClick={() => fillDemo(d)}
              className="flex w-full items-center justify-between gap-4 border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-left text-sm transition-colors hover:border-[var(--color-gold)]"
            >
              <span>
                <span className="text-utility text-[var(--color-gold)]">{d.label}</span>
                <span className="tabular ml-2 truncate text-[var(--color-muted)]">{d.email}</span>
              </span>
              <span className="text-utility shrink-0 text-[var(--color-muted)]">Fill →</span>
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-[var(--color-muted)]">Password for both: charon-demo</p>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.1 4.1 29.3 2 24 2 11.8 2 2 11.8 2 24s9.8 22 22 22 22-9.8 22-22c0-1.5-.2-2.6-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.1 4.1 29.3 2 24 2 16 2 9.1 6.6 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 46c5.2 0 9.9-2 13.5-5.2l-6.2-5.3C29.2 36.9 26.7 38 24 38c-5.2 0-9.6-3.3-11.2-7.9l-6.5 5C9.1 41.4 16 46 24 46z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4 5.5l6.2 5.3C41.4 36 44 30.5 44 24c0-1.5-.2-2.6-.4-3.5z" />
    </svg>
  );
}

/** Full-screen split auth surface for the standalone /join page. */
export function AuthScreen() {
  return (
    <div className="grid min-h-screen md:grid-cols-2">
      <div className="relative hidden overflow-hidden border-r border-[var(--color-border)] md:block">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/charon.png" alt="auth-image" className="absolute inset-0 h-full w-full object-cover grayscale-[0.2]" />
        <div className="absolute inset-0 bg-gradient-to-tr from-black/85 via-black/40 to-transparent" />
        <a href="/" className="absolute left-8 top-8 flex items-center gap-2.5">
          <Logo size={40} className="text-[var(--color-gold)]" />
          <span className="font-display text-2xl font-semibold text-coin">Charon</span>
        </a>
        <p className="font-display absolute bottom-10 left-8 right-8 text-3xl font-semibold leading-tight">
          Read freely.<br />Pay for what it&apos;s worth.
        </p>
      </div>

      <div className="fade-up grid place-items-center overflow-y-auto px-6 py-16 sm:px-12">
        <AuthForm />
      </div>
    </div>
  );
}
