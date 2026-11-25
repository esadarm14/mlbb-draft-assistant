"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { HeroPicker } from "@/components/HeroPicker";
import { RecommendationCard, ComboCard, TeamPhaseCard, AiNote } from "@/components/AnalysisCards";
import { useHeroPower, useTier } from "@/lib/storage";
import { RANK_TIERS, getInitialDraftConfig, TIER_META_NOTES } from "@/lib/database/draftRules";
import { generateDraftRecommendations, evaluateTeamComposition } from "@/lib/engine/recommendationEngine";
import { buildComboRecommendations } from "@/lib/database/combosData";
import type { PhaseStrength } from "@/lib/types";

type Tab = "ban" | "pick" | "analisis";
type Side = "blue" | "red";

const tierIcon: Record<string, string> = {
  Epic: "🔵", Legend: "🟣", Mythic: "🔴", "Mythical Honor": "🟠", "Mythical Glory": "⭐", "Mythical Immortal": "👑",
};

function Section({ title, children, hint }: { title: string; children: React.ReactNode; hint?: string }) {
  return (
    <section className="space-y-2">
      <div>
        <h2 className="text-sm font-bold">{title}</h2>
        {hint && <p className="text-xs text-slate-500">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

function compare(label: string, blue: number, red: number) {
  const diff = blue - red;
  const winner = Math.abs(diff) < 0.35 ? "Seimbang" : diff > 0 ? "Tim Biru" : "Tim Merah";
  const tone = winner === "Tim Biru" ? "text-sky-300" : winner === "Tim Merah" ? "text-rose-300" : "text-slate-300";
  return { label, winner, tone };
}

export default function DraftPage() {
  const [tier, setTier] = useTier();
  const [heroPower] = useHeroPower();
  const [tab, setTab] = useState<Tab>("ban");
  const [mySide, setMySide] = useState<Side>("blue");
  const [blueBans, setBlueBans] = useState<string[]>([]);
  const [redBans, setRedBans] = useState<string[]>([]);
  const [bluePicks, setBluePicks] = useState<string[]>([]);
  const [redPicks, setRedPicks] = useState<string[]>([]);

  const config = getInitialDraftConfig(tier);
  const bans = config.bansPerTeam;

  // Tier lowered: drop bans that no longer fit.
  useEffect(() => {
    setBlueBans((b) => b.slice(0, bans));
    setRedBans((b) => b.slice(0, bans));
  }, [bans]);

  const allUsed = [...blueBans, ...redBans, ...bluePicks, ...redPicks];
  const without = (own: string[]) => allUsed.filter((id) => !own.includes(id));

  const allies = mySide === "blue" ? bluePicks : redPicks;
  const enemies = mySide === "blue" ? redPicks : bluePicks;

  const recs = useMemo(
    () => generateDraftRecommendations(allies, enemies, [...blueBans, ...redBans], heroPower),
    [allies, enemies, blueBans, redBans, heroPower]
  );
  const combos = useMemo(() => buildComboRecommendations(allies, enemies).slice(0, 3), [allies, enemies]);
  const blueEval = useMemo(() => (bluePicks.length ? evaluateTeamComposition(bluePicks) : null), [bluePicks]);
  const redEval = useMemo(() => (redPicks.length ? evaluateTeamComposition(redPicks) : null), [redPicks]);

  const reset = () => {
    setBlueBans([]); setRedBans([]); setBluePicks([]); setRedPicks([]); setTab("ban");
  };

  const myPicksSetter = mySide === "blue" ? setBluePicks : setRedPicks;
  const quickPick = (id: string) => {
    if (allies.length < 5 && !allUsed.includes(id)) myPicksSetter([...allies, id]);
  };

  const phaseVal = (p: PhaseStrength) => (p === "Strong" ? 3 : p === "Average" ? 2 : 1);

  return (
    <div className="max-w-2xl mx-auto px-4 pt-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black" style={{ fontFamily: "'Orbitron', sans-serif" }}>DRAFT</h1>
          <p className="text-xs text-slate-400">{tier} · {bans} ban per tim · 5 pick per tim</p>
        </div>
        <button onClick={reset} className="px-3 py-2 rounded-xl bg-white/5 text-xs text-slate-300 active:scale-95">↺ Reset</button>
      </div>

      {/* Tier select */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {RANK_TIERS.map((t) => (
          <button
            key={t}
            onClick={() => setTier(t)}
            className={`px-3 py-2.5 rounded-2xl text-xs sm:text-sm font-medium border transition active:scale-95 text-left truncate ${
              t === tier ? "bg-[#f4c430] text-black border-[#f4c430]" : "border-white/10 text-slate-300 bg-white/[0.03]"
            }`}
          >
            {tierIcon[t]} {t}
          </button>
        ))}
      </div>
      <p className="text-[11px] text-slate-500 leading-snug">
        {TIER_META_NOTES[tier]} <span className="text-slate-600">(Jumlah ban adalah konfigurasi awal — cek ulang dengan aturan Ranked terbaru.)</span>
      </p>

      {/* Side */}
      <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-white/[0.04]">
        {(["blue", "red"] as Side[]).map((s) => (
          <button
            key={s}
            onClick={() => setMySide(s)}
            className={`py-2.5 rounded-xl text-sm font-semibold transition ${
              mySide === s ? (s === "blue" ? "bg-sky-500/20 text-sky-200" : "bg-rose-500/20 text-rose-200") : "text-slate-400"
            }`}
          >
            Saya Tim {s === "blue" ? "Biru" : "Merah"}
          </button>
        ))}
      </div>

      {/* Tabs (sticky) */}
      <div className="sticky top-14 z-30 py-2 bg-[#0a0e1a]/95 backdrop-blur">
        <div className="grid grid-cols-3 gap-1 p-1 rounded-2xl bg-white/[0.05]">
          {([
            ["ban", `Ban ${blueBans.length + redBans.length}/${bans * 2}`],
            ["pick", `Pick ${bluePicks.length + redPicks.length}/10`],
            ["analisis", "Analisis"],
          ] as [Tab, string][]).map(([k, l]) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={`py-2.5 rounded-xl text-sm font-semibold transition ${tab === k ? "bg-[#f4c430] text-black" : "text-slate-400"}`}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      {tab === "ban" && (
        <div className="space-y-4">
          <div className="card p-4 border-sky-500/20">
            <HeroPicker label="🔵 Ban Tim Biru" value={blueBans} onChange={setBlueBans} max={bans} exclude={without(blueBans)} accent="gray" />
          </div>
          <div className="card p-4 border-rose-500/20">
            <HeroPicker label="🔴 Ban Tim Merah" value={redBans} onChange={setRedBans} max={bans} exclude={without(redBans)} accent="gray" />
          </div>
          <button onClick={() => setTab("pick")} className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#f4c430] to-[#c99a2e] text-black font-bold active:scale-[0.98]">
            Lanjut ke Pick →
          </button>
        </div>
      )}

      {tab === "pick" && (
        <div className="space-y-4">
          <div className="card p-4 border-rose-500/20">
            <HeroPicker
              label={`🔴 Pick Tim Merah${mySide === "red" ? " (Kamu)" : " (Lawan)"}`}
              value={redPicks} onChange={setRedPicks} max={5} exclude={without(redPicks)} accent="red"
            />
          </div>
          <div className="card p-4 border-sky-500/20">
            <HeroPicker
              label={`🔵 Pick Tim Biru${mySide === "blue" ? " (Kamu)" : " (Lawan)"}`}
              value={bluePicks} onChange={setBluePicks} max={5} exclude={without(bluePicks)} accent="blue"
            />
          </div>

          {allies.length < 5 && (
            <Section title="⚡ Saran pick cepat untuk tim kamu" hint={heroPower.length ? "Diprioritaskan dari Hero Power kamu. Ketuk + untuk langsung pick." : undefined}>
              {heroPower.length === 0 && (
                <Link href="/hero-power" className="block card p-3 text-sm text-[#f4c430]">
                  + Isi My Hero Power dulu agar saran sesuai hero andalanmu →
                </Link>
              )}
              <div className="space-y-2">
                {(recs.bestHeroPower.length ? recs.bestHeroPower : recs.bestCounters).slice(0, 3).map((r) => (
                  <div key={r.hero.id} className="relative">
                    <RecommendationCard rec={r} />
                    <button
                      onClick={() => quickPick(r.hero.id)}
                      className="absolute top-3 right-[70px] w-9 h-9 rounded-xl bg-[#f4c430] text-black font-black active:scale-90"
                      aria-label={`Pick ${r.hero.name}`}
                    >
                      +
                    </button>
                  </div>
                ))}
              </div>
            </Section>
          )}

          <button onClick={() => setTab("analisis")} className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#f4c430] to-[#c99a2e] text-black font-bold active:scale-[0.98]">
            Lihat Analisis →
          </button>
        </div>
      )}

      {tab === "analisis" && (
        <div className="space-y-6">
          <AiNote />

          {allies.length < 5 && (
            <>
              <Section title="⚡ BEST HERO POWER" hint="Hero andalanmu yang paling cocok dengan kondisi draft saat ini.">
                {recs.bestHeroPower.length ? (
                  <div className="space-y-2">{recs.bestHeroPower.slice(0, 5).map((r) => <RecommendationCard key={r.hero.id} rec={r} />)}</div>
                ) : (
                  <Link href="/hero-power" className="block card p-3 text-sm text-slate-400">
                    Belum ada Hero Power yang cocok / tersedia. <span className="text-[#f4c430]">Atur Hero Power →</span>
                  </Link>
                )}
              </Section>
              <Section title="🎯 BEST COUNTER PICK" hint="Dari seluruh database hero, berdasarkan matchup terhadap pick lawan.">
                <div className="space-y-2">{recs.bestCounters.slice(0, 5).map((r) => <RecommendationCard key={r.hero.id} rec={r} />)}</div>
              </Section>
            </>
          )}

          <Section title="🔗 SMART COMBO SUGGESTION" hint="3 kombinasi terbaik berdasarkan tim kamu & draft lawan.">
            <div className="space-y-2">{combos.map((c, i) => <ComboCard key={c.id} combo={c} index={i} />)}</div>
          </Section>

          <Section title="📊 DRAFT PHASE ANALYZER" hint="Kekuatan tim di early, mid, dan late game.">
            {!blueEval && !redEval && <div className="card p-4 text-sm text-slate-400">Masukkan pick tim untuk melihat analisis fase.</div>}
            {blueEval && redEval && (
              <div className="card p-3.5 space-y-2">
                {[
                  compare("Early game", blueEval.earlyScore, redEval.earlyScore),
                  compare("Mid game", blueEval.midScore, redEval.midScore),
                  compare("Late game", blueEval.lateScore, redEval.lateScore),
                ].map((c) => (
                  <div key={c.label} className="flex justify-between text-sm">
                    <span className="text-slate-400">{c.label}</span>
                    <span className={`font-semibold ${c.tone}`}>{c.winner}</span>
                  </div>
                ))}
                {(["teamFightAdvantage", "objectiveAdvantage", "splitPushAdvantage"] as const).map((k) => {
                  const label = k === "teamFightAdvantage" ? "Team fight" : k === "objectiveAdvantage" ? "Objektif (Turtle/Lord)" : "Split push";
                  const b = blueEval[k], r = redEval[k];
                  const w = b === r ? "Seimbang" : b ? "Tim Biru" : "Tim Merah";
                  return (
                    <div key={k} className="flex justify-between text-sm">
                      <span className="text-slate-400">{label}</span>
                      <span className={`font-semibold ${w === "Tim Biru" ? "text-sky-300" : w === "Tim Merah" ? "text-rose-300" : "text-slate-300"}`}>{w}</span>
                    </div>
                  );
                })}
                {(bluePicks.length < 5 || redPicks.length < 5) && (
                  <p className="text-[11px] text-slate-500 pt-1">Analisis akan lebih akurat setelah kedua tim memiliki 5 hero.</p>
                )}
              </div>
            )}
            <div className="space-y-3">
              {blueEval && <TeamPhaseCard title={`🔵 Tim Biru${mySide === "blue" ? " (Kamu)" : ""}`} ev={blueEval} tone="blue" />}
              {redEval && <TeamPhaseCard title={`🔴 Tim Merah${mySide === "red" ? " (Kamu)" : ""}`} ev={redEval} tone="red" />}
            </div>
            {blueEval && redEval && (
              <p className="text-[11px] text-slate-500">
                Skor fase (1–3): Biru {phaseVal(blueEval.early)}/{phaseVal(blueEval.mid)}/{phaseVal(blueEval.late)} · Merah {phaseVal(redEval.early)}/{phaseVal(redEval.mid)}/{phaseVal(redEval.late)}. Bukan prediksi kemenangan pasti.
              </p>
            )}
          </Section>
        </div>
      )}
    </div>
  );
}
