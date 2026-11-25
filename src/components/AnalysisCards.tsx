"use client";
import { useState } from "react";
import type { ComboCardData, CounterBreakdown, HeroRecommendation, TeamPhaseEvaluation } from "@/lib/types";
import { HeroAvatar } from "./HeroAvatar";
import { PhaseRow } from "./PhaseBadge";

function ScoreRing({ value, color = "#f4c430" }: { value: number; color?: string }) {
  const v = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div
      className="w-12 h-12 rounded-full grid place-items-center shrink-0"
      style={{ background: `conic-gradient(${color} ${v * 3.6}deg, rgba(255,255,255,0.08) 0)` }}
    >
      <div className="w-[40px] h-[40px] rounded-full bg-[#141a2e] grid place-items-center text-xs font-bold">{v}</div>
    </div>
  );
}

function Bullets({ title, items, tone }: { title: string; items: string[]; tone: string }) {
  if (!items?.length) return null;
  return (
    <div>
      <div className={`text-[11px] uppercase tracking-wider font-semibold mb-1 ${tone}`}>{title}</div>
      <ul className="space-y-1">
        {items.map((t, i) => (
          <li key={i} className="text-sm text-slate-300 leading-snug flex gap-2">
            <span className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 bg-current ${tone}`} />
            <span>{t}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Expandable({ children, summary }: { children: React.ReactNode; summary: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="card overflow-hidden">
      <button onClick={() => setOpen((o) => !o)} className="w-full text-left p-3.5 active:bg-white/[0.03]">
        {summary}
        <div className="mt-2 text-[11px] text-slate-500 flex items-center gap-1">
          {open ? "Sembunyikan detail ▲" : "Lihat alasan & detail ▼"}
        </div>
      </button>
      {open && <div className="px-3.5 pb-4 space-y-3 border-t border-white/[0.06] pt-3">{children}</div>}
    </div>
  );
}

export function MasteryTag({ level }: { level?: string }) {
  if (!level) return null;
  return <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#f4c430]/15 text-[#f4c430] border border-[#f4c430]/30">⚡ {level}</span>;
}

export function RecommendationCard({ rec }: { rec: HeroRecommendation }) {
  const h = rec.hero;
  return (
    <Expandable
      summary={
        <div className="flex items-center gap-3">
          <HeroAvatar hero={h} size={52} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold">{h.name}</span>
              {rec.isHeroPower && <MasteryTag level={rec.masteryLevel} />}
            </div>
            <div className="text-xs text-slate-400">{h.roles.join(" / ")} · {h.lanes.join(", ")}</div>
            {rec.reasons[0] && <div className="text-xs text-slate-300 mt-1 line-clamp-2">{rec.reasons[0]}</div>}
          </div>
          <ScoreRing value={rec.totalScore} />
        </div>
      }
    >
      <PhaseRow early={h.earlyStrength} mid={h.midStrength} late={h.lateStrength} />
      <Bullets title="Alasan direkomendasikan" items={rec.reasons} tone="text-sky-300" />
      <Bullets title="Kelebihan" items={rec.pros} tone="text-emerald-300" />
      <Bullets title="Kekurangan" items={rec.cons} tone="text-amber-300" />
      <Bullets title="Risiko" items={rec.risks} tone="text-rose-300" />
    </Expandable>
  );
}

export function CounterCard({ c }: { c: CounterBreakdown }) {
  const h = c.hero;
  const color = c.category === "Best Counter" ? "#34d399" : c.category === "Alternative Counter" ? "#38bdf8" : "#fbbf24";
  return (
    <Expandable
      summary={
        <div className="flex items-center gap-3">
          <HeroAvatar hero={h} size={52} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold">{h.name}</span>
              {c.isHeroPower && <MasteryTag level={c.masteryLevel} />}
            </div>
            <div className="text-xs text-slate-400">{h.roles.join(" / ")}</div>
            <div className="text-xs text-slate-300 mt-1 line-clamp-2">{c.counterReason}</div>
          </div>
          <ScoreRing value={c.counterEffectiveness} color={color} />
        </div>
      }
    >
      <PhaseRow early={h.earlyStrength} mid={h.midStrength} late={h.lateStrength} />
      <Bullets title="Alasan counter" items={[c.counterReason]} tone="text-sky-300" />
      <Bullets title="Kelebihan" items={c.pros} tone="text-emerald-300" />
      <Bullets title="Kekurangan" items={c.cons} tone="text-amber-300" />
      <Bullets title="Risiko" items={[c.risk]} tone="text-rose-300" />
    </Expandable>
  );
}

export function ComboCard({ combo, index }: { combo: ComboCardData; index: number }) {
  return (
    <Expandable
      summary={
        <div>
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="text-[11px] text-[#f4c430] font-semibold">COMBO #{index + 1} · {combo.type}</div>
              <div className="font-bold truncate">{combo.name}</div>
            </div>
            <ScoreRing value={combo.effectivenessScore} color="#a78bfa" />
          </div>
          <div className="flex gap-1.5 mt-2 flex-wrap">
            {combo.coreHeroes.map((h) => (
              <div key={h.id} className="flex flex-col items-center w-14">
                <HeroAvatar hero={h} size={40} />
                <span className="text-[10px] text-slate-400 mt-0.5 truncate w-full text-center">{h.name}</span>
              </div>
            ))}
          </div>
          <div className="text-xs text-slate-400 mt-1">Role: {combo.requiredRoles.join(", ")} · ⏱ {combo.effectiveGameTime}</div>
        </div>
      }
    >
      <Bullets title="Sinergi" items={[combo.synergyExplanation]} tone="text-sky-300" />
      <Bullets title="Cara kerja" items={[combo.howItWorks]} tone="text-emerald-300" />
      <Bullets title="Cara menjalankan" items={[combo.executionGuide]} tone="text-violet-300" />
      <Bullets title="Kelemahan" items={[combo.weaknesses]} tone="text-rose-300" />
    </Expandable>
  );
}

export function TeamPhaseCard({ title, ev, tone }: { title: string; ev: TeamPhaseEvaluation; tone: "blue" | "red" }) {
  const head = tone === "blue" ? "text-sky-300" : "text-rose-300";
  return (
    <div className="card p-3.5 space-y-3">
      <div className={`font-bold ${head}`}>{title}</div>
      <PhaseRow early={ev.early} mid={ev.mid} late={ev.late} />
      <div className="flex flex-wrap gap-1.5 text-[11px]">
        <span className="px-2 py-1 rounded-full bg-white/5">CC: {ev.ccRating}</span>
        <span className="px-2 py-1 rounded-full bg-white/5">Damage: {ev.magicPhysicalBalance}</span>
        <span className="px-2 py-1 rounded-full bg-white/5">Frontline: {ev.frontlineAdequate ? "Cukup" : "Kurang"}</span>
        {ev.teamFightAdvantage && <span className="px-2 py-1 rounded-full bg-emerald-500/15 text-emerald-300">Team fight</span>}
        {ev.objectiveAdvantage && <span className="px-2 py-1 rounded-full bg-emerald-500/15 text-emerald-300">Objektif</span>}
        {ev.splitPushAdvantage && <span className="px-2 py-1 rounded-full bg-emerald-500/15 text-emerald-300">Split push</span>}
      </div>
      <Bullets title="Kekuatan" items={ev.strengths} tone="text-emerald-300" />
      <Bullets title="Kelemahan" items={ev.weaknesses} tone="text-amber-300" />
      <div className="rounded-xl bg-[#f4c430]/[0.07] border border-[#f4c430]/20 p-3">
        <div className="text-[11px] uppercase tracking-wider font-semibold text-[#f4c430] mb-1">Win Condition</div>
        <p className="text-sm text-slate-200 leading-snug">{ev.winCondition}</p>
      </div>
    </div>
  );
}

export function AiNote() {
  return (
    <p className="text-[11px] text-slate-500 leading-snug">
      🤖 Analisis dihasilkan otomatis dari atribut & kemampuan hero (bukan statistik resmi Moonton). Gunakan sebagai referensi, bukan prediksi pasti.
    </p>
  );
}
