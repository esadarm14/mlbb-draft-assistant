"use client";
import { useMemo, useState } from "react";
import { MLBB_HEROES } from "@/lib/database/heroesData";
import { HeroAvatar } from "@/components/HeroAvatar";
import { PhaseRow } from "@/components/PhaseBadge";
import type { Hero, Role } from "@/lib/types";

const ROLES: (Role | "All")[] = ["All", "Tank", "Fighter", "Assassin", "Mage", "Marksman", "Support"];

function Stat({ label, v }: { label: string; v: number }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-20 text-slate-400">{label}</span>
      <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
        <div className="h-full rounded-full bg-gradient-to-r from-[#c99a2e] to-[#f4c430]" style={{ width: `${v * 10}%` }} />
      </div>
      <span className="w-6 text-right text-slate-300">{v}</span>
    </div>
  );
}

function HeroSheet({ hero, onClose }: { hero: Hero; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full md:max-w-lg max-h-[85vh] overflow-y-auto rounded-t-3xl md:rounded-3xl bg-[#121829] border border-white/10 p-5 space-y-4"
        style={{ paddingBottom: "calc(1.25rem + env(safe-area-inset-bottom))" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto w-10 h-1.5 rounded-full bg-white/20 md:hidden" />
        <div className="flex items-center gap-3">
          <HeroAvatar hero={hero} size={64} />
          <div className="flex-1">
            <h2 className="text-xl font-black">{hero.name}</h2>
            <p className="text-xs text-slate-400">{hero.roles.join(" / ")} · {hero.lanes.join(", ")} · {hero.damageType}</p>
            <p className="text-xs text-slate-500">{hero.specialties.join(", ")}</p>
          </div>
          <button onClick={onClose} className="w-10 h-10 rounded-xl bg-white/5" aria-label="Tutup">✕</button>
        </div>
        <PhaseRow early={hero.earlyStrength} mid={hero.midStrength} late={hero.lateStrength} />
        <div className="space-y-1.5">
          <Stat label="Durability" v={hero.durability} />
          <Stat label="Offense" v={hero.offense} />
          <Stat label="Control" v={hero.controlEffect} />
          <Stat label="Difficulty" v={hero.difficulty} />
        </div>
        <div className="space-y-2 text-sm">
          <p><b className="text-emerald-300">Early:</b> <span className="text-slate-300">{hero.earlyNotes}</span></p>
          <p><b className="text-amber-300">Mid:</b> <span className="text-slate-300">{hero.midNotes}</span></p>
          <p><b className="text-rose-300">Late:</b> <span className="text-slate-300">{hero.lateNotes}</span></p>
        </div>
        <p className="text-[11px] text-slate-500">Analisis fase berbasis kemampuan hero, bukan statistik resmi. Sumber: <a href={hero.sourceUrl} target="_blank" rel="noreferrer" className="underline">mobilelegends.com</a></p>
      </div>
    </div>
  );
}

export default function HeroesPage() {
  const [role, setRole] = useState<Role | "All">("All");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<Hero | null>(null);

  const list = useMemo(() => {
    const query = q.trim().toLowerCase();
    return MLBB_HEROES.filter((h) => (role === "All" || h.roles.includes(role)) && (!query || h.name.toLowerCase().includes(query))).sort((a, b) =>
      a.name.localeCompare(b.name)
    );
  }, [role, q]);

  return (
    <div className="max-w-5xl mx-auto px-4 pt-5 space-y-4">
      <div>
        <h1 className="text-2xl font-black" style={{ fontFamily: "'Orbitron', sans-serif" }}>HEROES</h1>
        <p className="text-sm text-slate-400">{MLBB_HEROES.length} hero di database. Ketuk hero untuk detail.</p>
      </div>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Cari hero…"
        className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3.5 text-base outline-none focus:border-[#f4c430]/60"
      />
      <div className="flex flex-wrap gap-1.5">
        {ROLES.map((r) => (
          <button
            key={r}
            onClick={() => setRole(r)}
            className={`shrink-0 px-3.5 py-2 rounded-full text-sm border transition active:scale-95 ${
              role === r ? "bg-[#f4c430] text-black border-[#f4c430]" : "border-white/10 text-slate-400"
            }`}
          >
            {r === "All" ? "Semua" : r}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2.5">
        {list.map((h) => (
          <button key={h.id} onClick={() => setOpen(h)} className="card p-2 flex flex-col items-center active:scale-95 transition">
            <HeroAvatar hero={h} size={64} />
            <span className="text-xs font-semibold mt-1.5 truncate w-full text-center">{h.name}</span>
            <span className="text-[10px] text-slate-500 truncate w-full text-center">{h.roles[0]}</span>
          </button>
        ))}
      </div>
      {list.length === 0 && <p className="text-center text-sm text-slate-500 py-10">Hero tidak ditemukan.</p>}
      {open && <HeroSheet hero={open} onClose={() => setOpen(null)} />}
    </div>
  );
}
