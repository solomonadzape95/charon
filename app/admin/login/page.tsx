"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Logo } from "@/components/Logo";

export default function AdminLogin() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(d.error ?? "Login failed.");
        return;
      }
      router.replace("/admin");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-screen place-items-center px-6">
      <form onSubmit={submit} className="w-full max-w-sm space-y-5">
        <div className="text-center">
          <Logo size={44} className="mx-auto text-[var(--color-gold)]" />
          <h1 className="font-display mt-4 text-2xl font-semibold">Admin sign in</h1>
          <p className="mt-1 text-sm text-[var(--color-muted)]">Operator access with your admin credentials.</p>
        </div>

        <div className="space-y-3">
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Username"
            autoComplete="username"
            className="charon-input w-full"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            autoComplete="current-password"
            className="charon-input w-full"
          />
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <button type="submit" disabled={busy || !username || !password} className="btn-coin w-full disabled:opacity-50">
          {busy ? "Signing in…" : "Sign in"}
        </button>

        <p className="text-center text-xs text-[var(--color-muted)]">
          Or <Link href="/join" className="underline">sign in with an admin email</Link>.
        </p>
      </form>
    </div>
  );
}
