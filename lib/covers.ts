/**
 * Deterministic cover art. When a series has no uploaded cover, its id maps
 * stably to one of the bundled novel covers in /public/covers. Same series →
 * same cover, every render.
 */
import { HERO_COVERS } from "@/lib/hero-covers";

const COVERS = HERO_COVERS.map((c) => c.cover);

export function coverFor(id: string, override?: string | null): string {
  if (override) return override;
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return COVERS[h % COVERS.length];
}
