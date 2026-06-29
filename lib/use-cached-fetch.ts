"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Stale-while-revalidate fetch. Returns cached data from sessionStorage instantly
 * (so re-visiting a page paints immediately), then refetches in the background and
 * updates. `loading` is only true on a true cold start with nothing cached.
 *
 * Keep keys stable per logical resource (e.g. `series:all`, `library:<userId>`).
 */
export function useCachedFetch<T>(url: string | null, key: string): { data: T | null; loading: boolean; refresh: () => void } {
  const [data, setData] = useState<T | null>(() => readCache<T>(key));
  const [loading, setLoading] = useState<boolean>(() => readCache<T>(key) == null);
  const urlRef = useRef(url);
  urlRef.current = url;

  function run() {
    const u = urlRef.current;
    if (!u) {
      setLoading(false);
      return;
    }
    fetch(u)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d != null) {
          setData(d as T);
          writeCache(key, d);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, key]);

  return { data, loading, refresh: run };
}

function readCache<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(`charon_cache:${key}`);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeCache(key: string, value: unknown) {
  try {
    sessionStorage.setItem(`charon_cache:${key}`, JSON.stringify(value));
  } catch {
    /* quota / disabled — ignore */
  }
}
