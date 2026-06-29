"use client";

import { usePathname } from "next/navigation";
import { AccountNav } from "@/components/AccountNav";

/**
 * Studio chrome. Mounting AccountNav here — once, at the segment root — means it
 * persists across every studio tab (studio · audience · analytics · withdraw ·
 * series management) instead of remounting (and flashing) on each navigation.
 *
 * The marketing / standalone creator pages render their own chrome, so they opt
 * out and just pass children straight through.
 */
const BARE_PATHS = new Set(["/creator", "/creator/onboarding", "/creator/join", "/creator/claim"]);

export default function CreatorLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (BARE_PATHS.has(pathname)) return <>{children}</>;
  return (
    <>
      <AccountNav />
      {children}
    </>
  );
}
