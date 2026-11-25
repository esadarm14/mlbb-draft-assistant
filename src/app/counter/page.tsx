"use client";
import { useMemo, useState } from "react";
import { HeroPicker } from "@/components/HeroPicker";
import { CounterCard, AiNote } from "@/components/AnalysisCards";
import { HeroAvatar } from "@/components/HeroAvatar";
import { PhaseRow } from "@/components/PhaseBadge";
import { useHeroPower } from "@/lib/storage";
import { analyzeEnemyCounters } from "@/lib/engine/recommendationEngine";
import { getHeroById } from "@/lib/database/heroesData";
import type { CounterBreakdown } from "@/lib/types";

const GROUPS: { key: CounterBreakdown["category"]; title: string; hint: string }[] = [
  { key: "Best Counter", title: "🟢 Best Counter", hint: "Matchup paling unggul terhadap hero lawan." },
  { key: "Alternative Counter", title: "🔵 Alternative Counter", hint: "Pilihan kuat bila best counter di-ban / diambil." },
  { key: "Situational Counter", title: "🟡 Situational Counter", hint: "Efektif pada kondisi tertentu." },
];

export default function CounterPage() {
  const [enemies, setEnemies] = useState<string[]>([]);
  const [heroPower] = useHeroPower();
  const [onlyHP, setOnlyHP] = useState(false);

  const results = useMemo(() => analyzeEnemyCounters(enemies, heroPower), [enemies, heroPower]);
  const shown = onlyHP ? results.filter((r) => r.isHeroPower) : results;

  return (
    <div className="max-w-2xl mx-auto px-4 pt-5 space-y-5">
      <div>
        <h1 className="text-2xl font-black" style={{ fontFamily: "'Orbitron', sans-serif" }}>SMART COUNTER</h1>
        <p className="text-sm text-slate-400 mt-1">Masukkan satu atau beberapa hero lawan. Hero Power kamu diprioritaskan.</p>
      </div>

      <div className="card p-4">
        <HeroPicker label="Hero lawan" value={enemies} onChange={setEnemies} max={5} accent="red" />
      </div>

      {enemies.length > 0 && (
        <div className="w-full max-w-full flex gap-2 overflow-x-auto no-scrollbar">
          {enemies.map((id) => {
            const h = getHeroById(id);
            if (!h) return null;
            return (
              <div key={id} className="card p-2.5 shrink-0 w-52">
                <div className="flex items-center gap-2 mb-2">
                  <HeroAvatar hero={h} size={32} />
                  <div className="min-w-0">
                    <div className="text-sm font-bold truncate">{h.name}</div>
                    <div className="text-[10px] text-slate-400">{h.damageType} · CC {h.controlEffect}/10</div>
                  </div>
                </div>
                <PhaseRow early={h.earlyStrength} mid={h.midStrength} late={h.lateStrength} />
              </div>
            );
          })}
        </div>
      )}

      {enemies.length === 0 ? (
        <div className="card p-6 text-center text-sm text-slate-400">Belum ada hero lawan. Coba ketik &quot;fa&quot; → Fanny.</div>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <AiNote />
          </div>
          {heroPower.length > 0 && (
            <label className="flex items-center gap-2 text-sm text-slate-300">
              <input type="checkbox" checked={onlyHP} onChange={(e) => setOnlyHP(e.target.checked)} className="w-4 h-4 accent-[#f4c430]" />
              Tampilkan hanya Hero Power saya
            </label>
          )}
          {GROUPS.map((g) => {
            const list = shown.filter((r) => r.category === g.key);
            if (!list.length) return null;
            return (
              <section key={g.key} className="space-y-2">
                <div>
                  <h2 className="text-sm font-bold">{g.title}</h2>
                  <p className="text-xs text-slate-500">{g.hint}</p>
                </div>
                {list.map((c) => <CounterCard key={c.hero.id} c={c} />)}
              </section>
            );
          })}
          {shown.length === 0 && <div className="card p-4 text-sm text-slate-400">Tidak ada Hero Power yang cocok. Matikan filter untuk melihat alternatif dari seluruh hero.</div>}
        </>
      )}
    </div>
  );
}
