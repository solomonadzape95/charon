"use client";

import { useCallback, useEffect, useState } from "react";
import { Star, Mail, Check, Archive, RotateCcw } from "lucide-react";
import { Pagination } from "@/components/admin/Pagination";

interface Review {
  id: string;
  created_at: string;
  rating: number | null;
  message: string;
  name: string | null;
  email: string | null;
  page: string | null;
  status: "new" | "read" | "archived";
}

const FILTERS = [
  { id: "", label: "All" },
  { id: "new", label: "New" },
  { id: "read", label: "Read" },
  { id: "archived", label: "Archived" },
];

export default function AdminReviews() {
  const [rows, setRows] = useState<Review[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [status, setStatus] = useState("");
  const [needsMigration, setNeedsMigration] = useState(false);

  const load = useCallback(() => {
    fetch(`/api/reviews?status=${status}&page=${page}`)
      .then((r) => r.json())
      .then((d) => {
        setRows(d.reviews ?? []);
        setTotal(d.total ?? 0);
        setNeedsMigration(!!d.needsMigration);
        if (d.pageSize) setPageSize(d.pageSize);
      })
      .catch(() => {});
  }, [status, page]);

  useEffect(() => {
    load();
  }, [load]);

  async function setReviewStatus(id: string, next: Review["status"]) {
    await fetch("/api/reviews", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status: next }),
    });
    load();
  }

  return (
    <div className="space-y-6">
      <h1 className="font-display display-md font-semibold">Reviews</h1>

      {needsMigration && (
        <p className="border border-[#f87171] bg-[color-mix(in_srgb,#f87171_10%,transparent)] px-4 py-3 text-sm text-[#f87171]">
          The <code>reviews</code> table doesn&apos;t exist yet. Run the <code>create table public.reviews …</code> block from{" "}
          <code>supabase/schema.sql</code> in the Supabase SQL editor, then refresh.
        </p>
      )}

      <div className="flex gap-1.5">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => { setStatus(f.id); setPage(1); }}
            className={`rounded-full border px-3 py-1 text-utility transition-colors ${
              status === f.id ? "border-[var(--color-gold)] bg-[var(--color-gold)] text-black" : "border-[var(--color-border)] text-[var(--color-muted)] hover:text-[var(--color-ink)]"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {rows.map((r) => (
          <div key={r.id} className="border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  {r.rating ? (
                    <span className="inline-flex items-center gap-0.5">
                      {Array.from({ length: r.rating }).map((_, i) => (
                        <Star key={i} size={13} className="fill-[var(--color-gold)] text-[var(--color-gold)]" />
                      ))}
                    </span>
                  ) : (
                    <span className="text-utility text-[var(--color-muted)]">no rating</span>
                  )}
                  <span className="font-medium">{r.name ?? "Anonymous"}</span>
                  {r.status !== "new" && (
                    <span className="rounded-full border border-[var(--color-border)] px-2 py-0.5 text-utility capitalize text-[var(--color-muted)]">{r.status}</span>
                  )}
                </div>
                <p className="mt-2 max-w-2xl whitespace-pre-wrap text-sm text-[var(--color-ink)]">{r.message}</p>
                <div className="mt-2 flex flex-wrap items-center gap-3 text-utility text-[var(--color-muted)]">
                  <span>{new Date(r.created_at).toLocaleString()}</span>
                  {r.page && <span className="tabular">from {r.page}</span>}
                  {r.email && (
                    <a href={`mailto:${r.email}`} className="inline-flex items-center gap-1 hover:text-[var(--color-ink)]">
                      <Mail size={12} /> {r.email}
                    </a>
                  )}
                </div>
              </div>
              <div className="flex shrink-0 gap-1.5">
                {r.status !== "read" && (
                  <button onClick={() => setReviewStatus(r.id, "read")} title="Mark read" className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[var(--color-border)] text-[var(--color-muted)] transition-colors hover:border-[var(--color-gold)] hover:text-[var(--color-ink)]">
                    <Check size={14} />
                  </button>
                )}
                {r.status !== "archived" ? (
                  <button onClick={() => setReviewStatus(r.id, "archived")} title="Archive" className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[var(--color-border)] text-[var(--color-muted)] transition-colors hover:border-[var(--color-gold)] hover:text-[var(--color-ink)]">
                    <Archive size={14} />
                  </button>
                ) : (
                  <button onClick={() => setReviewStatus(r.id, "new")} title="Restore" className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[var(--color-border)] text-[var(--color-muted)] transition-colors hover:border-[var(--color-gold)] hover:text-[var(--color-ink)]">
                    <RotateCcw size={14} />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
        {rows.length === 0 && !needsMigration && <p className="text-sm text-[var(--color-muted)]">No reviews yet.</p>}
      </div>

      <Pagination page={page} pageSize={pageSize} total={total} onPage={setPage} />
    </div>
  );
}
