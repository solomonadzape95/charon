"use client";

import { useState } from "react";

/** An <img> that quietly removes itself if the source is missing/broken. */
export function SafeImage({ src, alt = "", className }: { src: string; alt?: string; className?: string }) {
  const [ok, setOk] = useState(true);
  if (!ok) return null;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} className={className} loading="lazy" onError={() => setOk(false)} />;
}
