export type Theme = "dark" | "sepia" | "light";

export const THEMES: { id: Theme; label: string }[] = [
  { id: "dark", label: "Dark" },
  { id: "sepia", label: "Sepia" },
  { id: "light", label: "Light" },
];

const KEY = "charon_theme";

export function getTheme(): Theme {
  if (typeof document === "undefined") return "dark";
  return (document.documentElement.getAttribute("data-theme") as Theme) || "dark";
}

export function setTheme(t: Theme) {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-theme", t);
  try {
    localStorage.setItem(KEY, t);
  } catch {
    /* ignore */
  }
}

/** Inline script string — run before paint to apply the saved theme (no flash). */
export const THEME_SCRIPT = `try{document.documentElement.setAttribute('data-theme',localStorage.getItem('charon_theme')||'dark')}catch(e){}`;
