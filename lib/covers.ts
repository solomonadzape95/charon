/**
 * Deterministic cover art. We don't store per-series uploads in the demo, so a
 * series' id maps stably to one of the bundled editorial plates in /public/hero.
 * Same series → same cover, every render.
 */
const COVERS = Array.from({ length: 10 }, (_, i) => `/hero/${String(i + 1).padStart(2, "0")}-edited.jpg`);

export function coverFor(id: string, override?: string | null): string {
  if (override) return override;
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return COVERS[h % COVERS.length];
}
