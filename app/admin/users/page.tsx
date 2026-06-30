"use client";

import { useCallback, useEffect, useState } from "react";
import { Search } from "lucide-react";
import { Pagination } from "@/components/admin/Pagination";

interface Row {
  id: string;
  email: string | null;
  balance_usd: number;
  session_cap_usd: number;
  created_at: string;
}

export default function AdminUsers() {
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    fetch(`/api/admin/users?search=${encodeURIComponent(search)}&page=${page}`)
      .then((r) => r.json())
      .then((d) => {
        setRows(d.users ?? []);
        setTotal(d.total ?? 0);
        if (d.pageSize) setPageSize(d.pageSize);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [search, page]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  async function adjust(id: string) {
    const input = prompt("Adjust balance by (e.g. 5 to credit, -2 to debit):");
    if (input == null) return;
    const delta = Number(input);
    if (Number.isNaN(delta) || delta === 0) return;
    const res = await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, deltaUsd: delta }),
    });
    const d = await res.json();
    if (!res.ok) {
      alert(d.error ?? "Failed");
      return;
    }
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, balance_usd: d.balance } : r)));
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display display-md font-semibold">Readers</h1>
        <div className="relative w-full sm:w-72">
          <Search size={16} strokeWidth={1.75} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-muted)]" />
          <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search by email…" className="charon-input rounded-full pl-10" />
        </div>
      </div>

      <div className="overflow-x-auto scrollbar-thin border border-[var(--color-border)]">
        <table className="w-full min-w-[40rem] border-collapse text-sm">
          <thead>
            <tr className="bg-[var(--color-surface-2)] text-left text-utility text-[var(--color-muted)]">
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Balance</th>
              <th className="px-4 py-3 font-medium">Session cap</th>
              <th className="px-4 py-3 font-medium">Joined</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {rows.map((u) => (
              <tr key={u.id} className="border-t border-[var(--color-border)] bg-[var(--color-surface)]">
                <td className="max-w-[16rem] truncate px-4 py-3">{u.email ?? "—"}</td>
                <td className="tabular px-4 py-3 font-semibold text-[var(--color-gold)]">${Number(u.balance_usd).toFixed(2)}</td>
                <td className="tabular px-4 py-3 text-[var(--color-muted)]">${Number(u.session_cap_usd).toFixed(2)}</td>
                <td className="px-4 py-3 text-utility text-[var(--color-muted)]">{new Date(u.created_at).toLocaleDateString()}</td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => adjust(u.id)} className="text-utility text-[var(--color-gold)] hover:underline">
                    Adjust
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && rows.length === 0 && <p className="px-4 py-6 text-sm text-[var(--color-muted)]">No readers found.</p>}
        {loading && <p className="px-4 py-6 text-sm text-[var(--color-muted)]">Loading…</p>}
      </div>

      <Pagination page={page} pageSize={pageSize} total={total} onPage={setPage} />
    </div>
  );
}
