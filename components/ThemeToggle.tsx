"use client";

import { useEffect, useState } from "react";
import { Moon, Sun, BookOpen } from "lucide-react";
import { getTheme, setTheme, THEMES, type Theme } from "@/lib/theme";

const ICON: Record<Theme, typeof Moon> = { dark: Moon, sepia: BookOpen, light: Sun };

/** Compact cycle button for the nav. */
export function ThemeToggle() {
  const [theme, setT] = useState<Theme>("dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setT(getTheme());
    setMounted(true);
  }, []);

  function cycle() {
    const order = THEMES.map((t) => t.id);
    const next = order[(order.indexOf(theme) + 1) % order.length];
    setTheme(next);
    setT(next);
  }

  if (!mounted) return <span className="h-9 w-9" />;
  const Icon = ICON[theme];
  return (
    <button
      onClick={cycle}
      aria-label={`Theme: ${theme}. Switch theme`}
      title={`Theme: ${theme}`}
      className="grid h-9 w-9 place-items-center rounded-full border border-[var(--color-border)] text-[var(--color-muted)] transition-colors hover:border-[var(--color-gold)] hover:text-[var(--color-ink)]"
    >
      <Icon size={15} />
    </button>
  );
}

/** Full segmented selector for the profile/settings page. */
export function ThemeSelector() {
  const [theme, setT] = useState<Theme>("dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setT(getTheme());
    setMounted(true);
  }, []);

  function choose(t: Theme) {
    setTheme(t);
    setT(t);
  }

  return (
    <div className="inline-flex border border-[var(--color-border)]">
      {THEMES.map((t) => {
        const Icon = ICON[t.id];
        const active = mounted && theme === t.id;
        return (
          <button
            key={t.id}
            onClick={() => choose(t.id)}
            className={`flex items-center gap-2 px-4 py-2 text-utility transition-colors ${
              active ? "bg-[var(--color-gold)] text-black" : "text-[var(--color-muted)] hover:text-[var(--color-ink)]"
            }`}
          >
            <Icon size={14} /> {t.label}
          </button>
        );
      })}
    </div>
  );
}
