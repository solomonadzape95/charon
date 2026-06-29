"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Wallet, Building2, Check, ArrowRight, ArrowLeft, Sparkles } from "lucide-react";
import { getUserId, getEmail, getCreatorId, setCreatorId as saveCreatorId } from "@/lib/account";
import { CoverUpload, PanelUpload } from "@/components/ImageUpload";

const COUNTRIES = ["Nigeria", "Indonesia", "Philippines", "Brazil", "India", "Kenya", "United States", "United Kingdom"];

export default function CreatorOnboarding() {
  const router = useRouter();
  const [creatorId, setCreatorId] = useState<string | null>(null);
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // Step 1 — profile
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [genres, setGenres] = useState("");

  // Step 2 — payout
  const [payout, setPayout] = useState<"usdc_wallet" | "bank">("usdc_wallet");
  const [wallet, setWallet] = useState("");
  const [country, setCountry] = useState(COUNTRIES[0]);
  const [bankAcct, setBankAcct] = useState("");
  const [bankName, setBankName] = useState("");

  // Step 3 — first series + chapter
  const [sTitle, setSTitle] = useState("");
  const [sDesc, setSDesc] = useState("");
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [contentType, setContentType] = useState<"text" | "images">("text");
  const [content, setContent] = useState("");
  const [panels, setPanels] = useState<string[]>([]);
  const [chTitle, setChTitle] = useState("");
  const [override, setOverride] = useState("");
  const [seriesId, setSeriesId] = useState<string | null>(null);
  const [priced, setPriced] = useState<{ price: number; reasoning: string; chapterId: string } | null>(null);

  // Step 4 — series pass
  const [passPrice, setPassPrice] = useState("");

  const firstGenre = genres.split(",")[0]?.trim() || null;

  useEffect(() => {
    const uid = getUserId();
    const email = getEmail();
    if (!uid || !email) {
      router.replace("/join");
      return;
    }
    (async () => {
      // Become a creator: create a profile on this account's email if needed.
      let cid = getCreatorId();
      if (!cid) {
        const res = await fetch("/api/creators", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        });
        const d = await res.json();
        if (d.creator?.id) {
          cid = d.creator.id as string;
          saveCreatorId(d.creator.id);
        }
      }
      if (!cid) {
        router.replace("/dashboard");
        return;
      }
      setCreatorId(cid);
      fetch(`/api/creators?id=${cid}`)
        .then((r) => r.json())
        .then((d) => {
          if (d.creator?.name) setName(d.creator.name);
          if (d.creator?.bio) setBio(d.creator.bio);
        })
        .catch(() => {});
    })();
  }, [router]);

  async function saveProfile() {
    if (!creatorId) return;
    setBusy(true);
    try {
      await fetch("/api/creators", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: creatorId, name: name || undefined, bio: bio || undefined }),
      });
      setStep(1);
    } finally {
      setBusy(false);
    }
  }

  async function savePayout() {
    if (!creatorId) return;
    setError("");
    if (payout === "usdc_wallet" && !/^0x[a-fA-F0-9]{40}$/.test(wallet)) {
      setError("Enter a valid 0x wallet address on Arc.");
      return;
    }
    if (payout === "bank" && (!bankAcct || !bankName)) {
      setError("Add your bank account details to continue.");
      return;
    }
    setBusy(true);
    try {
      await fetch("/api/creators", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: creatorId,
          payoutPreference: payout,
          walletAddress: payout === "usdc_wallet" ? wallet : undefined,
        }),
      });
      setStep(2);
    } finally {
      setBusy(false);
    }
  }

  async function publishFirst(e: React.FormEvent) {
    e.preventDefault();
    if (!creatorId) return;
    setError("");
    const chapterContent = contentType === "images" ? JSON.stringify(panels) : content;
    if (contentType === "images" && panels.length === 0) {
      setError("Add at least one panel image to publish a manga chapter.");
      return;
    }
    setBusy(true);
    try {
      // Create the series once, then upload the first chapter (Agent 2 prices it).
      let sid = seriesId;
      if (!sid) {
        const sres = await fetch("/api/series", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            creatorId,
            title: sTitle,
            description: sDesc || undefined,
            genre: firstGenre,
            coverImage: coverUrl || undefined,
          }),
        });
        const sdata = await sres.json();
        if (!sres.ok || !sdata.series) {
          setError(sdata.error ?? "Could not create series.");
          return;
        }
        sid = sdata.series.id;
        setSeriesId(sid);
      }
      const cres = await fetch("/api/chapters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          seriesId: sid,
          title: chTitle || undefined,
          contentType,
          content: chapterContent,
          overrideBasePrice: override ? Number(override) : undefined,
        }),
      });
      const cdata = await cres.json();
      if (!cres.ok) {
        setError(cdata.error ?? "Upload failed.");
        return;
      }
      const price = Number(cdata.chapter.base_price_usdc);
      setPriced({ price, reasoning: cdata.pricingReasoning, chapterId: cdata.chapter.id });
      setPassPrice(Math.max(0.99, Math.round(price * 10 * 100) / 100).toFixed(2));
      setStep(3);
    } finally {
      setBusy(false);
    }
  }

  if (!creatorId) return null;

  return (
    <div className="mx-auto flex min-h-[calc(100vh-4.5rem)] max-w-2xl flex-col px-6 py-10">
      <div className="mb-10 flex items-center gap-2">
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors ${
              i <= step ? "bg-[var(--color-gold)]" : "bg-[var(--color-surface-2)]"
            }`}
          />
        ))}
      </div>

      {/* Step 1 — profile */}
      {step === 0 && (
        <section className="fade-up flex flex-1 flex-col">
          <p className="text-utility text-[var(--color-gold)]">Step 1 — Your profile</p>
          <h1 className="font-display display-md mt-2 font-semibold">Introduce yourself</h1>
          <p className="mt-3 text-[var(--color-muted)]">This is what readers see on your series and author page.</p>

          <div className="mt-6 space-y-3">
            <input placeholder="Pen name" value={name} onChange={(e) => setName(e.target.value)} className="charon-input" />
            <textarea
              placeholder="Short bio — who you are and what you write"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="charon-input h-24 resize-none"
            />
            <input
              placeholder="Genres you write (comma-separated — fantasy, litrpg, manhwa)"
              value={genres}
              onChange={(e) => setGenres(e.target.value)}
              className="charon-input"
            />
            {genres.trim() && (
              <div className="flex flex-wrap gap-2">
                {genres.split(",").map((g) => g.trim()).filter(Boolean).map((g) => (
                  <span key={g} className="text-utility border border-[var(--color-border)] bg-[var(--color-surface-2)] px-2.5 py-1 text-[var(--color-muted)]">
                    {g}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="mt-auto pt-12">
            <button disabled={busy} onClick={saveProfile} className="btn-coin w-full sm:w-auto">
              Continue <ArrowRight size={16} />
            </button>
          </div>
        </section>
      )}

      {/* Step 2 — payout */}
      {step === 1 && (
        <section className="fade-up flex flex-1 flex-col">
          <p className="text-utility text-[var(--color-gold)]">Step 2 — Get paid</p>
          <h1 className="font-display display-md mt-2 font-semibold">Where should earnings go?</h1>
          <p className="mt-3 text-[var(--color-muted)]">
            Required before you publish — you need to be able to receive payment before your work goes live.
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <PayoutTab
              active={payout === "usdc_wallet"}
              onClick={() => setPayout("usdc_wallet")}
              icon={Wallet}
              title="USDC wallet"
              sub="Paid instantly on Arc, no fees. Withdraw any amount, any time."
              badge="No fee"
            />
            <PayoutTab
              active={payout === "bank"}
              onClick={() => setPayout("bank")}
              icon={Building2}
              title="Bank account"
              sub="Cash out to your local bank via Circle. 1.5% conversion fee."
              badge="1.5%"
            />
          </div>

          <div className="mt-4 space-y-3">
            {payout === "usdc_wallet" ? (
              <input
                placeholder="0x… wallet address on Arc"
                value={wallet}
                onChange={(e) => setWallet(e.target.value)}
                className="charon-input font-mono text-sm"
              />
            ) : (
              <>
                <select value={country} onChange={(e) => setCountry(e.target.value)} className="charon-input">
                  {COUNTRIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                <input placeholder="Account holder name" value={bankName} onChange={(e) => setBankName(e.target.value)} className="charon-input" />
                <input placeholder="Account number / IBAN" value={bankAcct} onChange={(e) => setBankAcct(e.target.value)} className="charon-input" />
                <p className="text-xs text-[var(--color-muted)]">
                  Circle handles the offramp. A 1.5% conversion fee applies on bank withdrawals — disclosed before every
                  payout.
                </p>
              </>
            )}
            {error && <p className="text-sm text-red-400">{error}</p>}
          </div>

          <div className="mt-auto flex items-center justify-between pt-12">
            <button onClick={() => setStep(0)} className="btn-outline">
              <ArrowLeft size={16} /> Back
            </button>
            <button disabled={busy} onClick={savePayout} className="btn-coin">
              Continue <ArrowRight size={16} />
            </button>
          </div>
        </section>
      )}

      {/* Step 3 — first series + chapter */}
      {step === 2 && (
        <section className="fade-up flex flex-1 flex-col">
          <p className="text-utility text-[var(--color-gold)]">Step 3 — Your first series</p>
          <h1 className="font-display display-md mt-2 font-semibold">Upload to get priced</h1>
          <p className="mt-3 text-[var(--color-muted)]">
            Add your series and first chapter. The pricing agent suggests a fair price the moment you submit.
          </p>

          <form onSubmit={publishFirst} className="mt-6 space-y-3">
            <div className="flex gap-4">
              <CoverUpload value={coverUrl} onChange={setCoverUrl} folder="covers" />
              <div className="flex-1 space-y-3">
                <input required placeholder="Series title" value={sTitle} onChange={(e) => setSTitle(e.target.value)} className="charon-input" />
                <textarea
                  placeholder="Series description"
                  value={sDesc}
                  onChange={(e) => setSDesc(e.target.value)}
                  className="charon-input h-16 resize-none"
                />
                <p className="text-xs text-[var(--color-muted)]">Tap the cover to upload artwork (optional).</p>
              </div>
            </div>

            <div className="rule my-2" />

            <input placeholder="Chapter 1 title (optional)" value={chTitle} onChange={(e) => setChTitle(e.target.value)} className="charon-input" />
            <div className="flex gap-2">
              {(["text", "images"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setContentType(t)}
                  className={`text-utility rounded-full border px-4 py-1.5 transition-colors ${
                    contentType === t
                      ? "border-[var(--color-gold)] bg-[color-mix(in_srgb,var(--color-gold)_10%,transparent)] text-[var(--color-gold)]"
                      : "border-[var(--color-border)] text-[var(--color-muted)] hover:text-[var(--color-ink)]"
                  }`}
                >
                  {t === "text" ? "Text" : "Manga / images"}
                </button>
              ))}
            </div>

            {contentType === "text" ? (
              <textarea
                required
                placeholder="Paste your first chapter…"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="charon-input h-48 resize-none text-sm"
              />
            ) : (
              <PanelUpload value={panels} onChange={setPanels} folder="chapters" />
            )}

            <div className="flex items-center gap-2">
              <div className="relative w-48">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-muted)]">$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="Set your own price"
                  value={override}
                  onChange={(e) => setOverride(e.target.value)}
                  className="charon-input pl-7 text-sm"
                />
              </div>
              <span className="text-xs text-[var(--color-muted)]">optional — leave blank to let the agent price it</span>
            </div>
            {error && <p className="text-sm text-red-400">{error}</p>}

            <div className="flex items-center justify-between pt-4">
              <button type="button" onClick={() => setStep(1)} className="btn-outline">
                <ArrowLeft size={16} /> Back
              </button>
              <button disabled={busy} className="btn-coin">
                {busy ? "Pricing…" : "Submit to pricing agent"}
              </button>
            </div>
          </form>
        </section>
      )}

      {/* Step 4 — agent price confirmation + series pass */}
      {step === 3 && priced && (
        <section className="fade-up flex flex-1 flex-col">
          <div className="border border-[var(--color-gold)] bg-[var(--color-surface)] p-6 text-center">
            <div className="mx-auto mb-3 inline-flex items-center gap-2 border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-1 text-xs text-[var(--color-muted)]">
              <Sparkles size={12} className="text-[var(--color-gold)]" /> Pricing agent
            </div>
            <p className="text-sm text-[var(--color-muted)]">Agent suggests</p>
            <p className="font-display text-5xl font-bold text-coin">${priced.price.toFixed(2)}</p>
            <p className="mt-3 text-sm text-[var(--color-muted)]">{priced.reasoning}</p>
            <p className="mt-2 inline-flex items-center gap-1.5 text-sm text-[var(--color-accent-2)]">
              <Check size={14} /> Chapter published
            </p>
          </div>

          <div className="mt-8">
            <p className="text-utility text-[var(--color-gold)]">Step 4 — Series Pass (optional)</p>
            <h1 className="font-display display-md mt-2 font-semibold">Offer the whole series for one price?</h1>
            <p className="mt-3 text-[var(--color-muted)]">
              A Series Pass gives readers permanent access — including future chapters. You can set this now or configure
              it later in series settings.
            </p>
            <div className="mt-5 flex items-center gap-3">
              <div className="relative w-48">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-muted)]">$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={passPrice}
                  onChange={(e) => setPassPrice(e.target.value)}
                  className="charon-input pl-7"
                />
              </div>
              <span className="text-xs text-[var(--color-muted)]">Agent 2 suggested, based on your chapter pricing</span>
            </div>
          </div>

          <div className="mt-auto flex items-center justify-between pt-12">
            <button onClick={() => router.push("/dashboard")} className="btn-outline">
              Skip for now
            </button>
            <button onClick={() => router.push("/dashboard")} className="btn-coin">
              Finish setup <ArrowRight size={16} />
            </button>
          </div>
        </section>
      )}
    </div>
  );
}

function PayoutTab({
  active,
  onClick,
  icon: Icon,
  title,
  sub,
  badge,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof Wallet;
  title: string;
  sub: string;
  badge: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`relative flex flex-col gap-3 border p-5 text-left transition-colors ${
        active
          ? "border-[var(--color-gold)] bg-[color-mix(in_srgb,var(--color-gold)_8%,transparent)]"
          : "border-[var(--color-border)] hover:border-[var(--color-muted)]"
      }`}
    >
      <span
        className={`absolute right-3 top-3 grid h-5 w-5 place-items-center rounded-full border transition-colors ${
          active ? "border-[var(--color-gold)] bg-[var(--color-gold)] text-black" : "border-[var(--color-border)] text-transparent"
        }`}
      >
        <Check size={12} strokeWidth={3} />
      </span>
      <span
        className={`grid h-11 w-11 place-items-center border ${
          active ? "border-[var(--color-gold)] text-[var(--color-gold)]" : "border-[var(--color-border)] text-[var(--color-muted)]"
        }`}
      >
        <Icon size={20} strokeWidth={1.5} />
      </span>
      <div>
        <div className="flex items-center gap-2">
          <p className="font-display text-lg font-semibold">{title}</p>
          <span className="text-utility border border-[var(--color-border)] bg-[var(--color-surface-2)] px-1.5 py-0.5 text-[var(--color-muted)]">{badge}</span>
        </div>
        <p className="mt-1 text-sm leading-relaxed text-[var(--color-muted)]">{sub}</p>
      </div>
    </button>
  );
}
