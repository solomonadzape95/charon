"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Search, Trash2 } from "lucide-react";
import { Pagination } from "@/components/admin/Pagination";

interface Row {
  id: string;
  slug: string | null;
  title: string;
  genre: string | null;
  status: "ongoing" | "completed";
  follower_count: number;
  momentum_score: number;
  creatorName: string | null;
  chapterCount: number;
}

export default function AdminContent() {
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [search, setSearch] = useState("");

  const load = useCallback(() => {
    fetch(`/api/admin/content?search=${encodeURIComponent(search)}&page=${page}`)
      .then((r) => r.json())
      .then((d) => {
        setRows(d.series ?? []);
        setTotal(d.total ?? 0);
        if (d.pageSize) setPageSize(d.pageSize);
      })
      .catch(() => {});
  }, [search, page]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  async function setStatus(id: string, status: string) {
    await fetch("/api/admin/content", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    load();
  }

  async function del(id: string, title: string) {
    if (!confirm(`Delete “${title}”? This cannot be undone.`)) return;
    const res = await fetch(`/api/admin/content?id=${id}`, { method: "DELETE" });
    const d = await res.json();
    if (!res.ok) {
      alert(d.error ?? "Failed");
      return;
    }
    load();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display display-md font-semibold">Content</h1>
        <div className="relative w-full sm:w-72">
          <Search size={16} strokeWidth={1.75} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-muted)]" />
          <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search title…" className="charon-input rounded-full pl-10" />
        </div>
      </div>

      <div className="overflow-x-auto scrollbar-thin border border-[var(--color-border)]">
        <table className="w-full min-w-[46rem] border-collapse text-sm">
          <thead>
            <tr className="bg-[var(--color-surface-2)] text-left text-utility text-[var(--color-muted)]">
              <th className="px-4 py-3 font-medium">Title</th>
              <th className="px-4 py-3 font-medium">Creator</th>
              <th className="px-4 py-3 font-medium">Genre</th>
              <th className="px-4 py-3 font-medium">Chapters</th>
              <th className="px-4 py-3 font-medium">Readers</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {rows.map((s) => (
              <tr key={s.id} className="border-t border-[var(--color-border)] bg-[var(--color-surface)]">
                <td className="max-w-[14rem] truncate px-4 py-3 font-medium">
                  <Link href={`/series/${s.slug ?? s.id}`} className="hover:text-[var(--color-gold)]">{s.title}</Link>
                </td>
                <td className="px-4 py-3 text-[var(--color-muted)]">{s.creatorName ?? "—"}</td>
                <td className="px-4 py-3 text-[var(--color-muted)]">{s.genre ?? "—"}</td>
                <td className="tabular px-4 py-3 text-[var(--color-muted)]">{s.chapterCount}</td>
                <td className="tabular px-4 py-3 text-[var(--color-muted)]">{s.follower_count.toLocaleString()}</td>
                <td className="px-4 py-3">
                  <select
                    value={s.status}
                    onChange={(e) => setStatus(s.id, e.target.value)}
                    className="border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1 text-utility text-[var(--color-ink)] outline-none"
                  >
                    <option value="ongoing">ongoing</option>
                    <option value="completed">completed</option>
                  </select>
                </td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => del(s.id, s.title)} aria-label="Delete" className="text-[var(--color-muted)] transition-colors hover:text-red-400">
                    <Trash2 size={15} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <p className="px-4 py-6 text-sm text-[var(--color-muted)]">No series found.</p>}
      </div>

      <Pagination page={page} pageSize={pageSize} total={total} onPage={setPage} />
    </div>
  );
}
