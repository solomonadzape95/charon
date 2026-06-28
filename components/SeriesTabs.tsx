"use client";

import { useState } from "react";

/** About | Table of Contents tabs for the series page. Sections are rendered on
 *  the server and passed in as props. */
export function SeriesTabs({
  about,
  contents,
  chapterCount,
}: {
  about: React.ReactNode;
  contents: React.ReactNode;
  chapterCount: number;
}) {
  const [tab, setTab] = useState<"about" | "contents">("about");
  return (
    <div>
      <div className="flex items-end gap-8 border-b border-[var(--color-border)]">
        <Tab active={tab === "about"} onClick={() => setTab("about")}>
          About
        </Tab>
        <Tab active={tab === "contents"} onClick={() => setTab("contents")}>
          Table of Contents
          <span className="ml-2 text-utility text-[var(--color-muted)]">
            {chapterCount}
          </span>
        </Tab>
      </div>
      <div className="pt-7">{tab === "about" ? about : contents}</div>
    </div>
  );
}

function Tab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`font-display -mb-px border-b-2 pb-3 text-xl font-semibold transition-colors ${
        active
          ? "border-[var(--color-gold)] text-[var(--color-gold)]"
          : "border-transparent text-[var(--color-muted)] hover:text-[var(--color-ink)]"
      }`}
    >
      {children}
    </button>
  );
}
