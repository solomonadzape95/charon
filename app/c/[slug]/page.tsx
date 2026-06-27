import { notFound } from "next/navigation";
import { getCreatorBySlug, getCreatorPublicStats, listCreatorIdentities } from "@/lib/db";
import type { CreatorIdentity } from "@/lib/supabase";
import { TipButton } from "./TipButton";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BOT = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME ?? "";

const PLATFORM_LABEL: Record<string, string> = {
  x: "X / Twitter",
  youtube: "YouTube",
  substack: "Substack",
  github: "GitHub",
  mirror: "Mirror",
  ens: "ENS",
  farcaster: "Farcaster",
};

function identityUrl(i: CreatorIdentity): string | null {
  switch (i.platform) {
    case "x":
      return `https://x.com/${i.handle.replace(/^@/, "")}`;
    case "github":
      return `https://github.com/${i.handle}`;
    case "substack":
      return `https://${i.handle}.substack.com`;
    case "youtube":
      return i.handle.startsWith("@")
        ? `https://youtube.com/${i.handle}`
        : `https://youtube.com/${i.handle.startsWith("channel/") ? i.handle : `c/${i.handle}`}`;
    case "mirror":
      return `https://mirror.xyz/${i.handle}`;
    default:
      return null;
  }
}

export default async function CreatorProfile({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const creator = await getCreatorBySlug(slug);
  if (!creator) notFound();

  const [identities, stats] = await Promise.all([
    listCreatorIdentities(creator.id),
    getCreatorPublicStats(creator.id),
  ]);
  const verified = identities.filter((i) => i.verified);
  const display = creator.name ?? verified[0]?.handle ?? "Creator";
  const tgTipLink = BOT ? `https://t.me/${BOT}?start=tip` : null;
  // A representative verified URL the extension can resolve back to this creator.
  const tipUrl = verified.map(identityUrl).find((u): u is string => Boolean(u)) ?? null;

  return (
    <div className="mx-auto max-w-xl space-y-8 pt-8">
      <div className="flex items-center gap-4">
        {creator.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={creator.avatar_url} alt={display} className="h-16 w-16 rounded-full object-cover" />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-surface-2)] text-2xl font-semibold">
            {display.slice(0, 1).toUpperCase()}
          </div>
        )}
        <div>
          <h1 className="text-2xl font-semibold">{display}</h1>
          {creator.registered && <p className="text-sm text-[var(--color-accent-2)]">✓ Verified creator</p>}
        </div>
      </div>

      {creator.bio && <p className="text-[var(--color-muted)]">{creator.bio}</p>}

      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
          <div className="text-xs uppercase tracking-wide text-[var(--color-muted)]">Tips received</div>
          <div className="text-3xl font-semibold">{stats.tipCount}</div>
        </div>
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
          <div className="text-xs uppercase tracking-wide text-[var(--color-muted)]">Total earned</div>
          <div className="text-3xl font-semibold">${stats.totalUsd.toFixed(2)}</div>
        </div>
      </div>

      {verified.length > 0 && (
        <div>
          <h3 className="mb-3 font-semibold">Verified handles</h3>
          <div className="flex flex-wrap gap-2">
            {verified.map((i) => {
              const url = identityUrl(i);
              const label = `${PLATFORM_LABEL[i.platform] ?? i.platform} · ${i.handle}`;
              return url ? (
                <a
                  key={i.id}
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-1.5 text-sm hover:border-[var(--color-accent-2)]"
                >
                  {label}
                </a>
              ) : (
                <span
                  key={i.id}
                  className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-1.5 text-sm"
                >
                  {label}
                </span>
              );
            })}
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
        <h3 className="mb-2 font-semibold">Tip {display}</h3>
        <p className="mb-4 text-sm text-[var(--color-muted)]">
          A tip routes straight to their wallet — instantly, on Arc, no claim step.
        </p>
        <TipButton tipUrl={tipUrl} telegramHref={tgTipLink} name={display} />
      </div>
    </div>
  );
}
