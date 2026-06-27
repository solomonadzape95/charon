"use client";

import { useEffect, useState } from "react";

/**
 * Tip CTA on a public profile. If the Charon extension is installed (it sets
 * data-charon-ext on <html>), clicking opens the extension's tip panel for one of
 * the creator's verified URLs. Otherwise it falls back to the Telegram bot.
 */
export function TipButton({
  tipUrl,
  telegramHref,
  name,
}: {
  tipUrl: string | null;
  telegramHref: string | null;
  name: string;
}) {
  const [hasExt, setHasExt] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    setHasExt(document.documentElement.getAttribute("data-charon-ext") === "1");
  }, []);

  function onClick() {
    if (hasExt && tipUrl) {
      window.postMessage({ type: "CHARON_TIP", url: tipUrl }, window.location.origin);
      setSent(true);
      return;
    }
    if (telegramHref) window.open(telegramHref, "_blank", "noreferrer");
  }

  const label =
    hasExt && tipUrl ? `✦ Tip ${name} with Charon` : telegramHref ? "Tip via Telegram →" : "Open the Charon bot";

  return (
    <div>
      <button
        onClick={onClick}
        disabled={!tipUrl && !telegramHref}
        className="inline-block rounded-lg bg-[var(--color-gold)] px-4 py-2 font-medium text-black disabled:opacity-50"
      >
        {label}
      </button>
      {sent && (
        <p className="mt-2 text-sm text-[var(--color-accent-2)]">
          Opening the Charon panel — confirm the amount there. ↘
        </p>
      )}
      {!hasExt && tipUrl && (
        <p className="mt-2 text-xs text-[var(--color-muted)]">
          Install the Charon browser extension to tip in one click — for now, Telegram works too.
        </p>
      )}
    </div>
  );
}
