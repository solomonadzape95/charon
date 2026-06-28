"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { syncSession } from "@/lib/account";
import { Loading } from "@/components/Loading";

/** Post-OAuth landing — wait for the session, sync identity, then route. */
export default function AuthFinish() {
  const router = useRouter();
  useEffect(() => {
    const supabase = supabaseBrowser();
    (async () => {
      // Cookie was set by /auth/callback; give the client a beat to read it.
      for (let i = 0; i < 8; i++) {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session) break;
        await new Promise((r) => setTimeout(r, 150));
      }
      const d = await syncSession();
      router.replace(d?.created ? "/onboarding" : "/dashboard");
    })();
  }, [router]);

  return <Loading full label="Signing you in…" />;
}
