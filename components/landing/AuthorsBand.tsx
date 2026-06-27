"use client";

import { useEffect, useState } from "react";
import { Logo } from "@/components/Logo";

const FALLBACK = [
  "ELENA VARGAS",
  "K. OKONKWO",
  "MARA DELACROIX",
  "JUN TAKEDA",
  "S. ABIODUN",
  "RAVEN HOLLOWAY",
  "THEO MARCHETTI",
];

export function AuthorsBand() {
  const [names, setNames] = useState<string[]>(FALLBACK);

  useEffect(() => {
    fetch("/api/stats")
      .then((r) => r.json())
      .then((d) => {
        const real = (d.topCreators ?? [])
          .map((c: { name: string | null; slug: string | null }) => (c.name ?? c.slug ?? "").toUpperCase())
          .filter(Boolean);
        if (real.length >= 4) setNames(real.slice(0, 8));
      })
      .catch(() => {});
  }, []);

  return (
    <section className="relative overflow-hidden bg-[var(--color-gold)] py-20 text-[#1a1304]">
      <div className="relative mx-auto max-w-[88rem] px-6 lg:px-10">
        <p className="text-utility mb-8 text-[#1a1304]/70">Back the writers you love</p>

        <div className="relative">
          {/* Names */}
          <div className="space-y-1">
            {names.map((n, i) => (
              <div
                key={`${n}-${i}`}
                className="font-display font-bold uppercase leading-[0.95] tracking-tight"
                style={{ fontSize: "clamp(2rem, 7vw, 5.5rem)", opacity: 1 - i * 0.05 }}
              >
                {n}
              </div>
            ))}
          </div>

          {/* The coin, drifting over the names */}
          <div
            className="pointer-events-none absolute right-[8%] top-1/2 -translate-y-1/2 text-[#1a1304]"
            style={{ animation: "coin-float 6s ease-in-out infinite" }}
          >
            <Logo size={200} className="drop-shadow-[0_20px_30px_rgba(0,0,0,0.35)]" />
          </div>
        </div>

        <p className="mt-10 max-w-md text-lg text-[#1a1304]/80">
          Every coin goes to the author, per chapter — no middle cut. Follow them, and your
          reading keeps them writing.
        </p>
      </div>

      <style>{`
        @keyframes coin-float {
          0%, 100% { transform: translateY(-50%) rotate(-6deg); }
          50% { transform: translateY(-58%) rotate(6deg); }
        }
      `}</style>
    </section>
  );
}
