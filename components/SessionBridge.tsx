"use client";

import { useEffect } from "react";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { syncSession, clearSession } from "@/lib/account";

/**
 * Bridges the Supabase auth session to the app's localStorage identity cache
 * that the rest of the UI reads. Runs once globally (mounted in the layout).
 */
export function SessionBridge() {
  useEffect(() => {
    const supabase = supabaseBrowser();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) syncSession();
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") clearSession();
      else if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") syncSession();
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  return null;
}
