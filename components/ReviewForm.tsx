"use client";

import { useState } from "react";
import { Star, Send } from "lucide-react";
import { getUserId } from "@/lib/account";

/**
 * Public feedback / review form. Anyone (signed-in or not) can leave a star
 * rating + a message; we attach their userId if we have one and the page they
 * were on. Submissions land in the `reviews` table and are read in /admin/reviews.
 */
export function ReviewForm() {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [message, setMessage] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "done">("idle");
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim()) {
      setError("A message is required.");
      return;
    }
    setState("busy");
    setError("");
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: message.trim(),
          rating: rating || undefined,
          name: name.trim() || undefined,
          email: email.trim() || undefined,
          userId: getUserId() || undefined,
          page: typeof window !== "undefined" ? window.location.pathname : undefined,
        }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(d.error ?? "Couldn't send. Try again.");
        setState("idle");
        return;
      }
      setState("done");
    } catch {
      setError("Network error. Try again.");
      setState("idle");
    }
  }

  if (state === "done") {
    return (
      <div className="border border-[var(--color-gold)] bg-[var(--color-surface)] p-8 text-center">
        <p className="font-display text-2xl font-semibold text-[var(--color-ink)]">Thank you 🙏</p>
        <p className="mt-2 text-[var(--color-muted)]">Your feedback went straight to the team. It genuinely helps.</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4 border border-[var(--color-border)] bg-[var(--color-surface)] p-6 sm:p-8">
      {/* Star rating (optional) */}
      <div className="flex items-center gap-1.5">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setRating(n === rating ? 0 : n)}
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(0)}
            aria-label={`${n} star${n > 1 ? "s" : ""}`}
            className="transition-transform hover:scale-110"
          >
            <Star
              size={26}
              strokeWidth={1.6}
              className={(hover || rating) >= n ? "fill-[var(--color-gold)] text-[var(--color-gold)]" : "text-[var(--color-muted)]"}
            />
          </button>
        ))}
        <span className="ml-2 text-utility text-[var(--color-muted)]">{rating ? `${rating}/5` : "rating (optional)"}</span>
      </div>

      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="What do you think? What's confusing, what's great, what's missing?"
        rows={4}
        className="charon-input w-full resize-y"
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name (optional)" className="charon-input w-full" />
        <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="Email (optional, for a reply)" className="charon-input w-full" />
      </div>

      {error && <p className="text-utility text-red-400">{error}</p>}

      <button type="submit" disabled={state === "busy"} className="btn-coin inline-flex items-center gap-2 disabled:opacity-50">
        <Send size={15} /> {state === "busy" ? "Sending…" : "Send feedback"}
      </button>
    </form>
  );
}
