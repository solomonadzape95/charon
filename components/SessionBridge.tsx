"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { syncSession, clearSession, getUserId } from "@/lib/account";

/**
 * Bridges the Supabase auth session to the app's localStorage identity cache
 * that the rest of the UI reads. Runs once globally (mounted in the layout).
 *
 * Also guards protected surfaces: if the Supabase session is gone (expired /
 * signed out) while the local cache still thinks we're signed in, it clears the
 * cache and bounces to the login page rather than leaving a dead UI.
 */
const PROTECTED = ["/dashboard", "/library", "/wallet", "/agent", "/profile", "/creator/", "/chapter/"];

function isProtected(pathname: string): boolean {
  // The public creator landing + onboarding/claim/join are not protected.
  if (pathname === "/creator" || pathname === "/creator/onboarding" || pathname === "/creator/join" || pathname === "/creator/claim") return false;
  return PROTECTED.some((p) => pathname.startsWith(p));
}

export function SessionBridge() {
  const pathname = usePathname();
  const router = useRouter();

  // Self-heal an OAuth redirect that landed on a client page with `?code=…`
  // instead of /auth/callback (e.g. Supabase Redirect URLs not allowlisted, so it
  // fell back to the Site URL). The browser client auto-exchanges the code and
  // sets the session; here we just wait for it, sync, and route to the app —
  // instead of leaving the user stranded on the landing page.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.location.pathname === "/auth/callback") return; // the real callback handles itself
    if (!new URLSearchParams(window.location.search).has("code")) return;

    const supabase = supabaseBrowser();
    let cancelled = false;
    (async () => {
      for (let i = 0; i < 12 && !cancelled; i++) {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session) {
          const d = await syncSession();
          // router.replace to a clean path drops the ?code from the URL.
          router.replace(d?.created ? "/onboarding" : "/dashboard");
          return;
        }
        await new Promise((r) => setTimeout(r, 150));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  useEffect(() => {
    const supabase = supabaseBrowser();

    function bounceIfLoggedOut() {
      // Only act when the local cache claims a session but Supabase has none.
      if (getUserId() && isProtected(window.location.pathname)) {
        clearSession();
        router.replace("/join?expired=1");
      }
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) syncSession();
      else bounceIfLoggedOut();
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        clearSession();
        if (isProtected(window.location.pathname)) router.replace("/join?expired=1");
      } else if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        if (session) syncSession();
      }
    });
    return () => sub.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  return null;
}
