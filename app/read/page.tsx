import Link from "next/link";
import { listSeries } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function ReadPage() {
  const series = await listSeries(60);

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-6 py-12">
      <div>
        <h1 className="font-display text-3xl font-semibold">Browse</h1>
        <p className="mt-1 text-[var(--color-muted)]">
          Read anything. Value flows to creators automatically after each session.
        </p>
      </div>

      {series.length === 0 ? (
        <p className="text-sm text-[var(--color-muted)]">
          No series yet.{" "}
          <Link href="/creator" className="text-[var(--color-gold)]">
            Upload the first one →
          </Link>
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {series.map((s) => (
            <Link
              key={s.id}
              href={`/series/${s.id}`}
              className="group rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 transition-colors hover:border-[var(--color-gold)]"
            >
              <div className="flex items-center justify-between">
                {s.genre && (
                  <span className="rounded-full bg-[var(--color-surface-2)] px-2 py-0.5 text-xs text-[var(--color-muted)]">
                    {s.genre}
                  </span>
                )}
                {s.status === "completed" && (
                  <span className="text-xs text-[var(--color-accent-2)]">completed</span>
                )}
              </div>
              <h2 className="mt-3 text-lg font-semibold group-hover:text-[var(--color-gold)]">{s.title}</h2>
              {s.description && (
                <p className="mt-1 line-clamp-3 text-sm text-[var(--color-muted)]">{s.description}</p>
              )}
              {s.follower_count > 0 && (
                <p className="mt-3 text-xs text-[var(--color-muted)]">{s.follower_count} readers</p>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
