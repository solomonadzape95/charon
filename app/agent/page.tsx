"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Send, Play, Pause, Coins, ExternalLink, Trash2 } from "lucide-react";
import { AccountNav } from "@/components/AccountNav";
import { SkeletonBlock } from "@/components/Skeletons";
import { setMode } from "@/lib/mode";

const ARC_EXPLORER = "https://testnet.arcscan.app";

interface AgentConfig {
  configured: boolean;
  paused: boolean;
  tasteProfile: { summary?: string } | null;
  weeklyLimit: number;
  weeklySpent: number;
  remaining: number;
  walletAddress: string | null;
  walletBalance: number;
  weekFunded: number;
  onchainBalance?: number | null;
  stats?: {
    totalFunded: number;
    totalReturned: number;
    totalSpent: number;
    chaptersRead: number;
  };
}
interface FeedMsg {
  id: string;
  created_at: string;
  sender: "agent" | "reader";
  kind: string;
  content: string;
  seriesId: string | null;
  chapterId: string | null;
  amount: number | null;
  ref: string | null;
}

export default function AgentPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [config, setConfig] = useState<AgentConfig | null>(null);
  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback((id: string) => {
    fetch(`/api/agent/config?userId=${id}`)
      .then((r) => r.json())
      .then((d) => setConfig(d.config))
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  useEffect(() => {
    setMode("read");
    const id = localStorage.getItem("charon_user_id");
    if (!id) {
      router.replace("/join");
      return;
    }
    setUserId(id);
    refresh(id);
  }, [router, refresh]);

  return (
    <>
      <AccountNav />
      <div className="mx-auto max-w-5xl px-6 py-8">
        <header className="mb-6">
          <p className="text-utility inline-flex items-center gap-1.5 text-(--color-gold)">
            <Sparkles size={13} /> Your reading agent
          </p>
          <h1 className="font-display display-md mt-1 font-semibold">
            Charon Agent
          </h1>
        </header>

        {!loaded ? (
          <div className="space-y-4">
            <SkeletonBlock className="h-24 w-full" />
            <SkeletonBlock className="h-64 w-full" />
          </div>
        ) : !config?.configured ? (
          <AgentOnboarding
            userId={userId!}
            onDone={() => userId && refresh(userId)}
          />
        ) : (
          <AgentConsole
            userId={userId!}
            config={config}
            onConfig={() => userId && refresh(userId)}
          />
        )}
      </div>
    </>
  );
}

function AgentOnboarding({
  userId,
  onDone,
}: {
  userId: string;
  onDone: () => void;
}) {
  const [loved, setLoved] = useState("");
  const [avoids, setAvoids] = useState("");
  const [limit, setLimit] = useState(3);
  const [busy, setBusy] = useState(false);

  async function start() {
    setBusy(true);
    try {
      await fetch("/api/agent/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          loved: loved
            .split(/[\n,]/)
            .map((s) => s.trim())
            .filter(Boolean),
          avoids: avoids
            .split(/[\n,]/)
            .map((s) => s.trim())
            .filter(Boolean),
          weeklyLimit: limit,
        }),
      });
      onDone();
    } finally {
      setBusy(false);
    }
  }

  const estLow = Math.round((limit / 0.05) * 0.4);
  const estHigh = Math.round(limit / 0.03);

  return (
    <div className="space-y-6 mx-auto max-w-5xl">
      <div className="border border-border bg-surface p-5">
        <p className="text-sm leading-relaxed text-muted">
          Hey. Before I start finding things for you, I want to understand what
          you like. Tell me a few series you&apos;ve loved. From anywhere:
          Webtoon, Royal Road, anything. Also tell me what kills the mood for
          you. I&apos;ll work within a weekly budget, pay creators per chapter on
          Arc, and stop the moment something isn&apos;t worth it.
        </p>
      </div>

      <div className="space-y-2">
        <label className="text-utility text-muted">
          Series you&apos;ve loved
        </label>
        <textarea
          value={loved}
          onChange={(e) => setLoved(e.target.value)}
          placeholder="Lord of the Mysteries, The Beginning After The End, Omniscient Reader…"
          className="charon-input h-24 resize-none"
        />
      </div>

      <div className="space-y-2">
        <label className="text-utility text-muted">
          Instant drops: what to avoid
        </label>
        <textarea
          value={avoids}
          onChange={(e) => setAvoids(e.target.value)}
          placeholder="harem, excessive comedy, slow slice-of-life, villain protagonists…"
          className="charon-input h-20 resize-none"
        />
      </div>

      <div data-tour="agent-budget" className="space-y-3 border border-border bg-surface p-5">
        <div className="flex items-baseline justify-between">
          <label className="text-utility text-muted">Weekly budget</label>
          <span className="font-display text-2xl font-bold text-coin">
            ${limit.toFixed(2)}/wk
          </span>
        </div>
        <input
          type="range"
          min={1}
          max={20}
          step={1}
          value={limit}
          onChange={(e) => setLimit(Number(e.target.value))}
          className="w-full accent-(--color-gold)"
        />
        <p className="text-xs text-muted">
          About {estLow} to {estHigh} chapters a week. Unspent budget stays in
          your balance.
        </p>
      </div>

      <button disabled={busy} onClick={start} className="btn-coin w-full">
        {busy ? "Setting up…" : "Start the agent"}
      </button>
    </div>
  );
}

function AgentConsole({
  userId,
  config,
  onConfig,
}: {
  userId: string;
  config: AgentConfig;
  onConfig: () => void;
}) {
  const [feed, setFeed] = useState<FeedMsg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [running, setRunning] = useState(false);
  const scroller = useRef<HTMLDivElement | null>(null);

  const loadFeed = useCallback(() => {
    fetch(`/api/agent/feed?userId=${userId}`)
      .then((r) => r.json())
      .then((d) => setFeed(d.messages ?? []))
      .catch(() => {});
  }, [userId]);

  useEffect(() => {
    loadFeed();
    const t = setInterval(loadFeed, 5000);
    return () => clearInterval(t);
  }, [loadFeed]);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight });
  }, [feed]);

  async function send() {
    const msg = input.trim();
    if (!msg) return;
    setInput("");
    setSending(true);
    setFeed((f) => [
      ...f,
      {
        id: `tmp-${Date.now()}`,
        created_at: new Date().toISOString(),
        sender: "reader",
        kind: "message",
        content: msg,
        seriesId: null,
        chapterId: null,
        amount: null,
        ref: null,
      },
    ]);
    try {
      await fetch("/api/agent/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, message: msg }),
      });
      loadFeed();
    } finally {
      setSending(false);
    }
  }

  async function run() {
    setRunning(true);
    try {
      await fetch("/api/agent/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      loadFeed();
      onConfig();
    } finally {
      setRunning(false);
    }
  }

  async function togglePause() {
    await fetch("/api/agent/pause", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, paused: !config.paused }),
    });
    onConfig();
    loadFeed();
  }

  async function stopAndReset() {
    if (!confirm("Stop the agent and start over? Unspent budget is returned to your balance.")) return;
    await fetch(`/api/agent/config?userId=${userId}`, { method: "DELETE" });
    onConfig();
  }

  const pct =
    config.weeklyLimit > 0
      ? Math.min(100, (config.weeklySpent / config.weeklyLimit) * 100)
      : 0;

  return (
    <div className="space-y-4">
      {/* Status bar */}
      <div className="border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
        <div className="flex items-center justify-between">
          <span className="text-utility inline-flex items-center gap-1.5 text-muted">
            <span
              className={`h-1.5 w-1.5 rounded-full ${config.paused ? "bg-[var(--color-muted)]" : "bg-[var(--color-accent-2)] pulse-dot"}`}
            />
            {config.paused ? "Paused" : "Active"}
          </span>
          <span data-tour="agent-wallet" className="tabular text-sm text-muted">
            <span className="font-semibold text-[var(--color-gold)]">
              ${(config.onchainBalance ?? config.walletBalance).toFixed(2)}
            </span>{" "}
            {config.onchainBalance != null ? "on Arc" : "in wallet"} · ${config.weeklySpent.toFixed(2)} spent / $
            {config.weeklyLimit.toFixed(2)}
          </span>
        </div>
        <div className="mt-2 h-1.5 w-full bg-[var(--color-surface-2)]">
          <div
            className="h-full bg-[var(--color-gold)]"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            data-tour="agent-run"
            disabled={running || config.paused}
            onClick={run}
            className="btn-coin !py-2 !text-[0.72rem]"
          >
            <Play size={13} /> {running ? "Running…" : "Run now"}
          </button>
          <button
            onClick={togglePause}
            className="btn-outline !py-2 !text-[0.72rem]"
          >
            {config.paused ? <Play size={13} /> : <Pause size={13} />}{" "}
            {config.paused ? "Resume" : "Pause"}
          </button>
          <button
            onClick={stopAndReset}
            className="text-utility inline-flex items-center gap-1 px-2 py-2 text-[var(--color-muted)] transition-colors hover:text-red-400"
          >
            <Trash2 size={13} /> Stop &amp; reset
          </button>
          {config.walletAddress && (
            <a
              href={`${ARC_EXPLORER}/address/${config.walletAddress}`}
              target="_blank"
              rel="noreferrer"
              className="text-utility ml-auto inline-flex items-center gap-1 text-muted hover:text-[var(--color-gold)]"
              title={config.walletAddress}
            >
              <Coins size={12} /> {config.walletAddress.slice(0, 6)}…
              {config.walletAddress.slice(-4)} <ExternalLink size={11} />
            </a>
          )}
        </div>
      </div>

      {/* All-time spending overview */}
      {config.stats && (
        <div className="grid grid-cols-2 gap-px border border-[var(--color-border)] bg-[var(--color-border)] sm:grid-cols-4">
          <AgentStat
            label="Funded all-time"
            value={`$${config.stats.totalFunded.toFixed(2)}`}
          />
          <AgentStat
            label="Spent all-time"
            value={`$${config.stats.totalSpent.toFixed(2)}`}
            accent
          />
          <AgentStat
            label="Chapters read"
            value={`${config.stats.chaptersRead}`}
          />
          <AgentStat
            label={config.onchainBalance != null ? "On Arc now" : "In wallet now"}
            value={`$${(config.onchainBalance ?? config.walletBalance).toFixed(2)}`}
          />
        </div>
      )}

      {/* Feed */}
      <div
        ref={scroller}
        className="max-h-[55vh] space-y-3 overflow-y-auto scrollbar-thin border border-[var(--color-border)] bg-[var(--color-bg)] p-4"
      >
        {feed.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted">
            No activity yet. Hit “Run now” and watch.
          </p>
        ) : (
          feed.map((m) => <FeedItem key={m.id} m={m} />)
        )}
      </div>

      {/* Input */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
        className="flex items-center gap-2"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Message your agent: “what are you reading?”"
          className="charon-input flex-1"
        />
        <button
          disabled={sending || !input.trim()}
          className="btn-coin shrink-0 !px-4"
        >
          <Send size={15} />
        </button>
      </form>
    </div>
  );
}

function FeedItem({ m }: { m: FeedMsg }) {
  if (m.sender === "reader") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] border border-[var(--color-border)] bg-[var(--color-surface-2)] px-4 py-2.5 text-sm">
          {m.content}
        </div>
      </div>
    );
  }
  const isPayment = m.amount != null;
  return (
    <div className="flex justify-start">
      <div className="max-w-[85%] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2.5">
        <p className="text-utility mb-1 inline-flex items-center gap-1.5 text-[var(--color-gold)]">
          <Sparkles size={11} /> Charon Agent
        </p>
        <p className="text-sm leading-relaxed">{m.content}</p>
        {isPayment && (
          <p className="text-utility mt-1.5 inline-flex items-center gap-1.5 text-[var(--color-accent-2)]">
            <Coins size={11} /> ${m.amount!.toFixed(2)} · agent-paid
            {m.ref ? ` · ref ${m.ref.slice(0, 8)}` : ""}
          </p>
        )}
      </div>
    </div>
  );
}

function AgentStat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="bg-[var(--color-surface)] px-4 py-4">
      <p className="text-utility text-muted">{label}</p>
      <p
        className={`tabular mt-1 text-xl font-semibold ${accent ? "text-[var(--color-gold)]" : ""}`}
      >
        {value}
      </p>
    </div>
  );
}
