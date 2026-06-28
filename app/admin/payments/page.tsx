"use client";

import { useCallback, useEffect, useState } from "react";

interface Row {
  id: string;
  amount: number;
  status: string;
  tx: string | null;
  created_at: string;
  creator: string | null;
  chapter: string | null;
}

const ARC = "https://testnet.arcscan.app";
const FILTERS = [
  { id: "", label: "All" },
  { id: "settled", label: "Settled" },
  { id: "pending", label: "Pending" },
  { id: "failed", label: "Failed" },
];

export default function AdminPayments() {
  const [rows, setRows] = useState<Row[]>([]);
  const [status, setStatus] = useState("");

  const load = useCallback(() => {
    fetch(`/api/admin/payments?status=${status}`)
      .then((r) => r.json())
      .then((d) => setRows(d.payments ?? []))
      .catch(() => {});
  }, [status]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-6">
      <h1 className="font-display display-md font-semibold">Payments</h1>

      <div className="flex gap-1.5">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setStatus(f.id)}
            className={`rounded-full border px-3 py-1 text-utility transition-colors ${
              status === f.id ? "border-[var(--color-gold)] bg-[var(--color-gold)] text-black" : "border-[var(--color-border)] text-[var(--color-muted)] hover:text-[var(--color-ink)]"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto scrollbar-thin border border-[var(--color-border)]">
        <table className="w-full min-w-[42rem] border-collapse text-sm">
          <thead>
            <tr className="bg-[var(--color-surface-2)] text-left text-utility text-[var(--color-muted)]">
              <th className="px-4 py-3 font-medium">Chapter</th>
              <th className="px-4 py-3 font-medium">Creator</th>
              <th className="px-4 py-3 font-medium">Amount</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">When</th>
              <th className="px-4 py-3 font-medium">Tx</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id} className="border-t border-[var(--color-border)] bg-[var(--color-surface)]">
                <td className="max-w-[14rem] truncate px-4 py-3">{p.chapter ?? "—"}</td>
                <td className="px-4 py-3 text-[var(--color-muted)]">{p.creator ?? "—"}</td>
                <td className="tabular px-4 py-3 font-semibold text-[var(--color-gold)]">${p.amount.toFixed(2)}</td>
                <td className="px-4 py-3">
                  <span
                    className="capitalize"
                    style={{ color: p.status === "settled" ? "var(--color-accent-2)" : p.status === "failed" ? "#f87171" : "var(--color-muted)" }}
                  >
                    {p.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-utility text-[var(--color-muted)]">{new Date(p.created_at).toLocaleString()}</td>
                <td className="px-4 py-3">
                  {p.tx ? (
                    <a href={`${ARC}/tx/${p.tx}`} target="_blank" rel="noreferrer" className="text-[var(--color-muted)] underline hover:text-[var(--color-ink)]">
                      ↗
                    </a>
                  ) : (
                    <span className="text-[var(--color-muted)]">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <p className="px-4 py-6 text-sm text-[var(--color-muted)]">No payments.</p>}
      </div>
    </div>
  );
}
