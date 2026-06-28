import { Logo } from "@/components/Logo";

/** Branded loading state — the landing coin, hovering, with a label. */
export function Loading({ label = "Loading…", full = false }: { label?: string; full?: boolean }) {
  return (
    <div className={`grid place-items-center ${full ? "min-h-screen" : "min-h-[60vh]"}`}>
      <div className="flex flex-col items-center gap-6">
        <div className="relative grid place-items-center">
          <div className="absolute h-32 w-32 rounded-full bg-[var(--color-gold-soft)] opacity-25 blur-2xl" />
          <div className="charon-loadcoin text-[var(--color-gold)]">
            <Logo size={84} />
          </div>
        </div>
        <p className="text-utility animate-pulse text-[var(--color-muted)]">{label}</p>
      </div>
      <style>{`
        @keyframes charon-loadcoin { 0%,100% { transform: translateY(-9px) rotate(-6deg); } 50% { transform: translateY(9px) rotate(6deg); } }
        .charon-loadcoin { animation: charon-loadcoin 3s ease-in-out infinite; filter: drop-shadow(0 14px 22px rgba(0,0,0,0.35)); }
      `}</style>
    </div>
  );
}
