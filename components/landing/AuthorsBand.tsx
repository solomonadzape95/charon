"use client";

import { useEffect, useState } from "react";
import { Logo } from "@/components/Logo";

const FALLBACK = [
  "GUILTYTHREE",
  "CUTTLEFISH THAT LOVES DIVING",
  "ER GEN",
  "GU ZHEN REN",
  "MAXIME J. DURAND",
  "MOGMA",
  "MCENROE",
  "NEMOROSUS",
  "CHOCOLION",
  "WARMAISACH",
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
        if (real.length >= 4) setNames(real.slice(0, 10));
      })
      .catch(() => {});
  }, []);

  // Repeat enough times that the column always fills the viewport (no cut-off
  // at the loop seam on tall/mobile screens). translateY(-50%) keeps it seamless.
  const loop = [...names, ...names, ...names, ...names];

  return (
    <section className="relative h-screen overflow-hidden bg-[var(--color-gold)] text-[#1a1304]">
      {/* Full-bleed vertical marquee of massive names */}
      <div className="absolute inset-0 flex justify-center">
        <div className="authors-marquee flex w-full flex-col items-center">
          {loop.map((n, i) => (
            <div
              key={`${n}-${i}`}
              className="font-display w-full whitespace-nowrap text-center font-bold uppercase tracking-tight text-[#1a1304]/40"
              style={{ fontSize: "clamp(3rem, 12vw, 11rem)", lineHeight: 1.05 }}
            >
              {n}
            </div>
          ))}
        </div>
      </div>

      {/* Edge fades */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-[var(--color-gold)] to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[var(--color-gold)] to-transparent" />

      {/* Coin, centered, hovering above the marquee */}
      <div className="pointer-events-none absolute inset-0 grid place-items-center">
        <div className="relative grid place-items-center">
          <div className="absolute h-80 w-80 rounded-full bg-[var(--color-gold-soft)] opacity-70 blur-3xl" />
          <div className="authors-coin relative text-[#1a1304]">
            <Logo size={440} className="drop-shadow-[0_26px_40px_rgba(0,0,0,0.42)]" />
          </div>
        </div>
      </div>

      {/* Only two texts */}
      <div className="pointer-events-none relative z-10 mx-auto flex h-full max-w-[88rem] flex-col justify-between px-6 py-14 lg:px-10">
        <p className="text-utility text-[#1a1304]/70">Back the writers you love</p>
        <p className="max-w-md text-lg text-[#1a1304]/85 sm:text-xl">
          Every coin goes to the author, per chapter — no middle cut. Follow them, and your reading keeps them writing.
        </p>
      </div>

      <style>{`
        @keyframes authors-marquee {
          from { transform: translateY(0); }
          to { transform: translateY(-50%); }
        }
        .authors-marquee { animation: authors-marquee 24s linear infinite; will-change: transform; }
        @keyframes authors-coin {
          0%, 100% { transform: translateY(-12px) rotate(-5deg); }
          50% { transform: translateY(12px) rotate(5deg); }
        }
        .authors-coin { animation: authors-coin 6s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .authors-marquee, .authors-coin { animation: none; }
        }
      `}</style>
    </section>
  );
}
