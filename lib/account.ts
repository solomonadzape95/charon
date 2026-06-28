/**
 * Client-side account/session helpers. One account (a reader) that can also be
 * a creator. Creator status is keyed off the account email — if a creator row
 * exists for the signed-in email, the account gains creator powers.
 */
const USER_ID = "charon_user_id";
const USER_EMAIL = "charon_user_email";
const CREATOR_ID = "charon_creator_id";
const USERNAME = "charon_username";

export function defaultUsername(email?: string | null): string {
  const base = (email ?? getEmail() ?? "reader").split("@")[0].replace(/[^a-zA-Z0-9_]/g, "");
  return base || "reader";
}
export function getUsername(): string {
  if (typeof window === "undefined") return "reader";
  return localStorage.getItem(USERNAME) || defaultUsername();
}
export function setUsername(name: string) {
  localStorage.setItem(USERNAME, name);
}

export function getUserId(): string | null {
  return typeof window === "undefined" ? null : localStorage.getItem(USER_ID);
}
export function getEmail(): string | null {
  return typeof window === "undefined" ? null : localStorage.getItem(USER_EMAIL);
}
export function getCreatorId(): string | null {
  return typeof window === "undefined" ? null : localStorage.getItem(CREATOR_ID);
}

export function setSession(userId: string, email: string) {
  localStorage.setItem(USER_ID, userId);
  localStorage.setItem(USER_EMAIL, email);
}
export function setCreatorId(id: string) {
  localStorage.setItem(CREATOR_ID, id);
}
export function clearSession() {
  localStorage.removeItem(USER_ID);
  localStorage.removeItem(USER_EMAIL);
  localStorage.removeItem(CREATOR_ID);
  localStorage.removeItem(USERNAME);
}

/**
 * Pull the authenticated session into the local identity cache. Returns the
 * synced record (incl. `created` for first-time users) or null if unauthenticated.
 */
export async function syncSession(): Promise<{ userId: string; email: string; creatorId: string | null; created: boolean; username?: string } | null> {
  try {
    const res = await fetch("/api/auth/sync", { method: "POST" });
    if (!res.ok) return null;
    const d = await res.json();
    setSession(d.userId, d.email);
    if (d.creatorId) setCreatorId(d.creatorId);
    if (d.username && !localStorage.getItem(USERNAME)) setUsername(d.username);
    return d;
  } catch {
    return null;
  }
}

/** Sign out of Supabase auth and clear the local identity cache. */
export async function signOutEverywhere() {
  try {
    const { supabaseBrowser } = await import("@/lib/supabase-browser");
    await supabaseBrowser().auth.signOut();
  } catch {
    /* ignore */
  }
  clearSession();
}

/**
 * Look up whether the signed-in email already has a creator profile and cache
 * its id. Returns the creator id or null. Safe to call on every load.
 */
export async function resolveCreatorId(email?: string | null): Promise<string | null> {
  const e = email ?? getEmail();
  if (!e) return null;
  const cached = getCreatorId();
  try {
    const res = await fetch(`/api/creators?email=${encodeURIComponent(e)}`);
    if (!res.ok) {
      if (cached) localStorage.removeItem(CREATOR_ID);
      return null;
    }
    const data = await res.json();
    if (data.creator?.id) {
      setCreatorId(data.creator.id);
      return data.creator.id;
    }
  } catch {
    return cached;
  }
  return null;
}
