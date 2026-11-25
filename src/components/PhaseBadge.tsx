import type { PhaseStrength } from "@/lib/types";

const styles: Record<PhaseStrength, string> = {
  Strong: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  Average: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  Weak: "bg-red-500/15 text-red-300 border-red-500/30",
};

const label: Record<PhaseStrength, string> = { Strong: "Kuat", Average: "Sedang", Weak: "Lemah" };

export function PhaseBadge({ phase, value }: { phase: string; value: PhaseStrength }) {
  return (
    <div className={`flex-1 rounded-xl border px-2 py-1.5 text-center ${styles[value]}`}>
      <div className="text-[10px] uppercase tracking-wider opacity-70">{phase}</div>
      <div className="text-xs font-bold">{label[value]}</div>
    </div>
  );
}

export function PhaseRow({ early, mid, late }: { early: PhaseStrength; mid: PhaseStrength; late: PhaseStrength }) {
  return (
    <div className="flex gap-1.5">
      <PhaseBadge phase="Early" value={early} />
      <PhaseBadge phase="Mid" value={mid} />
      <PhaseBadge phase="Late" value={late} />
    </div>
  );
}
