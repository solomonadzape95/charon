/**
 * App mode — one signed-in account, two clearly separated surfaces:
 *
 *   "read"   → the reader: discovering and reading series. Opening a chapter
 *              here can settle a nanopayment to its creator.
 *   "studio" → the creator studio: your series, earnings, audience, withdrawals.
 *              Nothing here ever charges you.
 *
 * Keeping the two apart means a creator who also reads can never wander out of
 * their studio and accidentally open (and pay for) a chapter mid-task. The mode
 * is a per-device preference; creator powers themselves are still keyed off the
 * account email (see lib/account.ts), so this is purely which surface you're in.
 */
export type AppMode = "read" | "studio";

const MODE_KEY = "charon_mode";
const MODE_EVENT = "charon:mode";

export function getMode(): AppMode {
  if (typeof window === "undefined") return "read";
  return localStorage.getItem(MODE_KEY) === "studio" ? "studio" : "read";
}

export function setMode(mode: AppMode) {
  if (typeof window === "undefined") return;
  localStorage.setItem(MODE_KEY, mode);
  window.dispatchEvent(new CustomEvent(MODE_EVENT, { detail: mode }));
}

/** Subscribe to mode changes (this tab + other tabs). Returns an unsubscribe fn. */
export function onModeChange(cb: (mode: AppMode) => void): () => void {
  if (typeof window === "undefined") return () => {};
  const local = (e: Event) => cb((e as CustomEvent<AppMode>).detail);
  const storage = (e: StorageEvent) => {
    if (e.key === MODE_KEY) cb(getMode());
  };
  window.addEventListener(MODE_EVENT, local);
  window.addEventListener("storage", storage);
  return () => {
    window.removeEventListener(MODE_EVENT, local);
    window.removeEventListener("storage", storage);
  };
}

/** Paths that always belong to the studio, regardless of the stored mode. */
export function isStudioPath(pathname: string): boolean {
  return isCreatorWorkspacePath(pathname);
}

/** Creator workspace pages (the `/creator/*` app, excluding the public `/creator` landing). */
export function isCreatorWorkspacePath(pathname: string): boolean {
  return pathname.startsWith("/creator/") && pathname !== "/creator/onboarding";
}
