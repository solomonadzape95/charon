"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Coins, Ticket, Clock, Check } from "lucide-react";

interface Props {
  seriesId: string;
  status: string;
  firstChapterId: string | null;
  suggestedPass: number;
  perChapterAvg: number;
}

const MODES = [
  {
    id: "standard",
    icon: Coins,
    title: "Read as you go",
    desc: "Pay per session, valued by the agent on how deeply you engage.",
  },
  {
    id: "series_unlock",
    icon: Ticket,
    title: "Series Pass",
    desc: "One price, permanent access — including future chapters.",
  },
  {
    id: "pre_release",
    icon: Clock,
    title: "Pre-release",
    desc: "Auto-pay when new chapters drop, before they're public.",
  },
] as const;

export function PaymentModes({ seriesId, status, firstChapterId, suggestedPass, perChapterAvg }: Props) {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [mode, setMode] = useState<string | null>(null);
  const [selected, setSelected] = useState<string>("standard");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    const id = localStorage.getItem("charon_user_id");
    setUserId(id);
    if (id) {
      fetch(`/api/follow?userId=${id}&seriesId=${seriesId}`)
        .then((r) => r.json())
        .then((d) => {
          if (d.mode) {
            setMode(d.mode);
            setSelected(d.mode);
          }
        })
        .catch(() => {});
    }
  }, [seriesId]);

  async function choose(next: string) {
    setSelected(next);
    setMsg(null);
    if (!userId) {
      router.push("/join");
      return;
    }
    if (next === "series_unlock") {
      setBusy(true);
      try {
        const res = await fetch("/api/series/unlock", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, seriesId }),
        });
        const d = await res.json();
        if (res.ok) {
          setMode("series_unlock");
          setMsg(`Unlocked for $${Number(d.amount).toFixed(2)} — read it all, no per-chapter charge.`);
        } else {
          setMsg(d.error ?? "Couldn't unlock this series.");
          setSelected(mode ?? "standard");
        }
      } finally {
        setBusy(false);
      }
      return;
    }
    // standard / pre_release
    setBusy(true);
    try {
      await fetch("/api/follow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, seriesId, mode: next }),
      });
      setMode(next);
    } finally {
      setBusy(false);
    }
  }

  const unlocked = mode === "series_unlock";

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        {MODES.map((m) => {
          const active = selected === m.id;
          const price =
            m.id === "series_unlock"
              ? `$${suggestedPass.toFixed(2)}`
              : m.id === "pre_release"
                ? `~$${perChapterAvg.toFixed(2)}/ch`
                : "agent-valued";
          const disabled = m.id === "series_unlock" && unlocked;
          return (
            <button
              key={m.id}
              onClick={() => !disabled && choose(m.id)}
              disabled={busy}
              className={`flex flex-col gap-2 border p-4 text-left transition-colors disabled:opacity-60 ${
                active
                  ? "border-[var(--color-gold)] bg-[color-mix(in_srgb,var(--color-gold)_8%,transparent)]"
                  : "border-[var(--color-border)] hover:border-[var(--color-muted)]"
              }`}
            >
              <div className="flex items-center justify-between">
                <m.icon size={18} className={active ? "text-[var(--color-gold)]" : "text-[var(--color-muted)]"} strokeWidth={1.6} />
                {active && <Check size={15} className="text-[var(--color-gold)]" />}
              </div>
              <p className="text-sm font-semibold">{m.title}</p>
              <p className="text-xs leading-snug text-[var(--color-muted)]">{m.desc}</p>
              <p className="tabular mt-auto pt-1 text-sm font-semibold text-[var(--color-gold)]">{price}</p>
            </button>
          );
        })}
      </div>

      {msg && <p className="text-sm text-[var(--color-accent-2)]">{msg}</p>}

      <div className="flex flex-wrap items-center gap-3">
        {firstChapterId ? (
          <Link href={`/chapter/${firstChapterId}`} className="btn-coin">
            {unlocked ? "Read now" : "Start reading"}
          </Link>
        ) : (
          <span className="text-sm text-[var(--color-muted)]">No chapters published yet.</span>
        )}
        {!userId && <span className="text-sm text-[var(--color-muted)]">Sign in to follow & read.</span>}
        {status === "completed" && <span className="text-utility text-[var(--color-accent-2)]">Completed series</span>}
      </div>
    </div>
  );
}
