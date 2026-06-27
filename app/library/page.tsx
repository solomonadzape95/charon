"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SubNav } from "@/components/SubNav";

interface Lib {
  follows: { id: string; title: string; genre: string | null; status: string; mode: string }[];
  history: { id: string; title: string; chaptersRead: number; lastReadAt: string }[];
}

const MODE_LABEL: Record<string, string> = {
  standard: "Following",
  pre_release: "Pre-release",
  series_unlock: "Unlocked",
};

export default function LibraryPage() {
  const router = useRouter();
  const [lib, setLib] = useState<Lib | null>(null);

  useEffect(() => {
    const id = localStorage.getItem("charon_user_id");
    if (!id) {
      router.replace("/join");
      return;
    }
    fetch(`/api/me/library?userId=${id}`)
      .then((r) => r.json())
      .then(setLib)
      .catch(() => {});
  }, [router]);

  return (
    <>
      <SubNav role="reader" />
      <div className="mx-auto max-w-6xl space-y-12 px-6 py-10">
        <section className="space-y-4">
          <h1 className="font-display text-3xl font-semibold">Following</h1>
          {!lib?.follows.length ? (
            <p className="text-[var(--color-muted)]">
              You&apos;re not following anything yet. <Link href="/read" className="text-[var(--color-gold)]">Browse stories →</Link>
            </p>
          ) : (
            <div className="grid gap-px border border-[var(--color-border)] bg-[var(--color-border)] sm:grid-cols-2 lg:grid-cols-3">
              {lib.follows.map((f) => (
                <Link key={f.id} href={`/series/${f.id}`} className="group bg-[var(--color-bg)] p-5 transition-colors hover:bg-[var(--color-surface)]">
                  <div className="flex items-center justify-between">
                    <span className="text-utility text-[var(--color-muted)]">{f.genre ?? "—"}</span>
                    <span className="text-utility text-[var(--color-gold)]">{MODE_LABEL[f.mode] ?? f.mode}</span>
                  </div>
                  <h3 className="font-display mt-3 text-xl font-semibold group-hover:text-[var(--color-gold)]">{f.title}</h3>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section className="space-y-4">
          <h2 className="font-display text-2xl font-semibold">Reading history</h2>
          {!lib?.history.length ? (
            <p className="text-[var(--color-muted)]">Nothing read yet.</p>
          ) : (
            <ul className="divide-y divide-[var(--color-border)] border border-[var(--color-border)]">
              {lib.history.map((h) => (
                <li key={h.id} className="flex items-center justify-between bg-[var(--color-surface)] px-4 py-3">
                  <Link href={`/series/${h.id}`} className="font-medium hover:text-[var(--color-gold)]">{h.title}</Link>
                  <span className="text-utility text-[var(--color-muted)]">{h.chaptersRead} read</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
