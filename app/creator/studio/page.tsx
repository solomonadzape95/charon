"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CreatorOverview } from "@/components/CreatorOverview";
import { StudioSkeleton } from "@/components/Skeletons";
import { getUserId, getCreatorId, resolveCreatorId } from "@/lib/account";
import { setMode } from "@/lib/mode";

/**
 * The Creator Studio home — a surface entirely separate from the reader. Nothing
 * here ever opens a paid reading session, so a creator who also reads can work on
 * their series without any risk of being charged for opening their own chapters.
 */
export default function StudioHome() {
  const router = useRouter();
  const [creatorId, setCreatorId] = useState<string | null>(null);

  useEffect(() => {
    if (!getUserId()) {
      router.replace("/join");
      return;
    }
    setMode("studio");
    (async () => {
      const id = getCreatorId() ?? (await resolveCreatorId());
      if (!id) {
        router.replace("/creator/onboarding");
        return;
      }
      setCreatorId(id);
    })();
  }, [router]);

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <header className="mb-8">
        <p className="text-utility text-[var(--color-gold)]">Creator studio</p>
        <h1 className="font-display display-md mt-2 font-semibold">Your studio</h1>
        <p className="mt-2 max-w-xl text-[var(--color-muted)]">
          Earnings, audience and series — all in one place. You&apos;re in studio mode, so opening your own chapters here
          is always free.
        </p>
      </header>
      {creatorId ? <CreatorOverview creatorId={creatorId} /> : <StudioSkeleton />}
    </div>
  );
}
