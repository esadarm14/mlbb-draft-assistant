"use client";
import { useMemo, useState } from "react";
import { HeroPicker } from "@/components/HeroPicker";
import { HeroAvatar } from "@/components/HeroAvatar";
import { PhaseRow } from "@/components/PhaseBadge";
import { ComboCard, TeamPhaseCard, MasteryTag, AiNote } from "@/components/AnalysisCards";
import { CounterDrawer, HeroPowerDrawer, HeroesDrawer } from "@/components/QuickDrawers";
import { useHeroPower, useTier } from "@/lib/storage";
import {
  RANK_TIERS,
  TIER_META_NOTES,
  buildDraftSequence,
  getInitialDraftConfig,
} from "@/lib/database/draftRules";
import { getTopMetaBans, type MetaTier } from "@/lib/database/metaData";
import {
  LANE_LABELS,
  buildStepBriefing,
  evaluateTeamComposition,
  generateBanRecommendations,
  generatePickRecommendations,
  getMissingLanes,
  predictEnemyThreats,
  type DraftLogEntry,
} from "@/lib/engine/recommendationEngine";
import { buildComboRecommendations } from "@/lib/database/combosData";
import { MLBB_HEROES, getHeroById } from "@/lib/database/heroesData";
import type { DraftMode, Hero, Lane, RankTier } from "@/lib/types";

type Side = "blue" | "red";
type Drawer = "hero-power" | "counter" | "heroes" | null;

const ALL_LANES: Lane[] = ["Jungle", "Gold Lane", "Mid Lane", "EXP Lane", "Roam"];

const tierIcon: Record<string, string> = {
  Epic: "🔵",
  Legend: "🟣",
  Mythic: "🔴",
  "Mythical Honor": "🟠",
  "Mythical Glory": "⭐",
  "Mythical Immortal": "👑",
};

const metaTierBadgeColor: Record<MetaTier, string> = {
  "S+": "bg-rose-500/25 text-rose-200 border border-rose-500/40",
  S: "bg-amber-500/20 text-amber-200 border border-amber-500/35",
  A: "bg-sky-500/20 text-sky-200 border border-sky-500/30",
  B: "bg-slate-500/20 text-slate-300",
  C: "bg-slate-700/30 text-slate-400",
};

function Badge({ text, color }: { text: string; color: string }) {
  return <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${color}`}>{text}</span>;
}

interface RecRowProps {
  hero: Hero;
  badgeText: string;
  badgeColor: string;
  metaTier?: MetaTier;
  statText?: string;
  extraBadges?: React.ReactNode;
  score: number;
  reasons: string[];
  actionLabel: string;
  actionClassName: string;
  actionDisabled?: boolean;
  onAction: () => void;
}

function RecRow({
  hero,
  badgeText,
  badgeColor,
  metaTier,
  statText,
  extraBadges,
  score,
  reasons,
  actionLabel,
  actionClassName,
  actionDisabled,
  onAction,
}: RecRowProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-xl bg-white/[0.03] border border-white/5 overflow-hidden">
      <div className="flex items-center gap-2.5 p-2.5">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex flex-1 min-w-0 items-center gap-2.5 text-left"
        >
          <HeroAvatar hero={hero} size={40} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-sm font-bold truncate">{hero.name}</span>
              <Badge text={badgeText} color={badgeColor} />
              {metaTier && <Badge text={`Tier ${metaTier}`} color={metaTierBadgeColor[metaTier]} />}
              {extraBadges}
            </div>
            <p className="text-[11px] text-slate-300 mt-0.5 line-clamp-2 leading-snug">{reasons[0]}</p>
            <div className="text-[10px] text-slate-500 mt-0.5">
              Skor {score}
              {statText ? ` · ${statText}` : ""} · {hero.roles.join("/")} · {expanded ? "Tutup ▲" : "Detail ▼"}
            </div>
          </div>
        </button>

        <button
          type="button"
          onClick={onAction}
          disabled={actionDisabled}
          className={`px-3 py-2 rounded-xl text-xs font-bold active:scale-95 disabled:opacity-30 shrink-0 transition ${actionClassName}`}
        >
          {actionLabel}
        </button>
      </div>

      {expanded && (
        <div className="px-3 pb-3 pt-2 border-t border-white/5 space-y-2 text-xs">
          <PhaseRow early={hero.earlyStrength} mid={hero.midStrength} late={hero.lateStrength} />
          <div className="text-[11px] text-slate-400">
            Lane: {hero.lanes.join(", ")} · Damage: {hero.damageType} · CC: {hero.controlEffect}/10
          </div>
          <ul className="space-y-1">
            {reasons.map((r, idx) => (
              <li key={idx} className="text-[11px] text-slate-300 flex gap-1.5">
                <span className="text-[#f4c430]">•</span>
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export function DraftWorkspace() {
  const [tier, setTier] = useTier();
  const [heroPower] = useHeroPower();
  const [mode, setMode] = useState<DraftMode>("Ranked Draft");
  const [mySide, setMySide] = useState<Side>("blue");
  const [drawer, setDrawer] = useState<Drawer>(null);

  // Sequential live draft log
  const [log, setLog] = useState<DraftLogEntry[]>([]);
  const [viewAnalysis, setViewAnalysis] = useState(false);

  // List UI state
  const [showMoreBans, setShowMoreBans] = useState(false);
  const [showMorePicks, setShowMorePicks] = useState(false);
  const [pickLaneFilter, setPickLaneFilter] = useState<Lane | null>(null);

  const config = useMemo(() => getInitialDraftConfig(tier, mode), [tier, mode]);
  const bansPerTeam = config.bansPerTeam;

  const draftSequence = useMemo(() => buildDraftSequence(tier, mode, mySide), [tier, mode, mySide]);

  // Derive teams from sequential log
  const { myBans, enemyBans, myPicks, enemyPicks } = useMemo(() => {
    const mb: string[] = [];
    const eb: string[] = [];
    const mp: string[] = [];
    const ep: string[] = [];
    for (const entry of log) {
      if (entry.action === "ban" && entry.actor === "me") mb.push(entry.heroId);
      else if (entry.action === "ban" && entry.actor === "enemy") eb.push(entry.heroId);
      else if (entry.action === "pick" && entry.actor === "me") mp.push(entry.heroId);
      else ep.push(entry.heroId);
    }
    return { myBans: mb, enemyBans: eb, myPicks: mp, enemyPicks: ep };
  }, [log]);

  const allBans = useMemo(() => [...myBans, ...enemyBans], [myBans, enemyBans]);
  const allUsed = useMemo(() => [...allBans, ...myPicks, ...enemyPicks], [allBans, myPicks, enemyPicks]);

  const currentStep = log.length < draftSequence.length ? draftSequence[log.length] : null;
  const draftFinished = log.length >= draftSequence.length;
  const lastEntry = log.length > 0 ? log[log.length - 1] : undefined;

  const selectTier = (nextTier: RankTier) => {
    setTier(nextTier);
    setLog([]);
    setViewAnalysis(false);
  };

  const selectMode = (nextMode: DraftMode) => {
    setMode(nextMode);
    setLog([]);
    setViewAnalysis(false);
  };

  const selectSide = (nextSide: Side) => {
    setMySide(nextSide);
    setLog([]);
    setViewAnalysis(false);
  };

  const recordStep = (heroId: string) => {
    if (!currentStep || allUsed.includes(heroId)) return;
    setLog((prev) => [
      ...prev,
      {
        stepIndex: currentStep.index,
        action: currentStep.action,
        actor: currentStep.actor,
        heroId,
      },
    ]);
    setShowMoreBans(false);
    setShowMorePicks(false);
  };

  const undoStep = () => {
    setLog((prev) => prev.slice(0, -1));
    setViewAnalysis(false);
  };

  const reset = () => {
    setLog([]);
    setPickLaneFilter(null);
    setShowMoreBans(false);
    setShowMorePicks(false);
    setViewAnalysis(false);
  };

  const myHeroes = useMemo(
    () => myPicks.map((id) => getHeroById(id)).filter((h): h is Hero => !!h),
    [myPicks]
  );
  const missingLanes = useMemo(() => getMissingLanes(myHeroes), [myHeroes]);

  // Real-time Ban & Pick Predictions
  const banRecs = useMemo(
    () => generateBanRecommendations(allUsed, heroPower, tier, myPicks, enemyPicks, 10, mode),
    [allUsed, heroPower, tier, myPicks, enemyPicks, mode]
  );

  const pickRecs = useMemo(
    () =>
      generatePickRecommendations(myPicks, enemyPicks, allBans, heroPower, {
        tier,
        mode,
        mySide,
        laneFilter: pickLaneFilter,
        limit: 10,
      }),
    [myPicks, enemyPicks, allBans, heroPower, tier, mode, mySide, pickLaneFilter]
  );

  const topMetaBans = useMemo(() => getTopMetaBans(tier, mode, allUsed, 6), [tier, mode, allUsed]);
  const enemyThreats = useMemo(
    () => predictEnemyThreats(myPicks, enemyPicks, allBans),
    [myPicks, enemyPicks, allBans]
  );

  const stepBriefing = useMemo(
    () => buildStepBriefing(lastEntry, heroPower, allBans, tier, mode),
    [lastEntry, heroPower, allBans, tier, mode]
  );

  const myEval = useMemo(() => (myPicks.length > 0 ? evaluateTeamComposition(myPicks) : null), [myPicks]);
  const enemyEval = useMemo(() => (enemyPicks.length > 0 ? evaluateTeamComposition(enemyPicks) : null), [enemyPicks]);
  const combos = useMemo(() => buildComboRecommendations(myPicks, enemyPicks, allBans), [myPicks, enemyPicks, allBans]);

  const shownBanRecs = banRecs.slice(0, showMoreBans ? 10 : 5);
  const shownPickRecs = pickRecs.slice(0, showMorePicks ? 10 : 5);

  const compareAdvantage = (label: string, myScore: number, enScore: number) => {
    const diff = myScore - enScore;
    const winner = Math.abs(diff) < 5 ? "Seimbang" : diff > 0 ? "Tim Kamu" : "Tim Lawan";
    const tone = winner === "Tim Kamu" ? "text-emerald-300" : winner === "Tim Lawan" ? "text-rose-300" : "text-slate-300";
    return { label, winner, tone };
  };

  const heroPowerPrompt = heroPower.length === 0 && (
    <button
      type="button"
      onClick={() => setDrawer("hero-power")}
      className="w-full text-left rounded-xl border border-[#f4c430]/30 bg-[#f4c430]/10 p-3 text-xs text-[#f4c430] active:scale-[0.99] transition"
    >
      💡 Isi Hero Power kamu agar prediksi ban, pick &amp; counter lebih personal →
    </button>
  );

  return (
    <div className="max-w-2xl mx-auto px-4 pt-4 pb-8 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black" style={{ fontFamily: "'Orbitron', sans-serif" }}>
            LIVE DRAFT GUIDE
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            {mode === "Tournament Draft" ? "Mode Turnamen (MPL)" : tier} · {bansPerTeam} ban/tim · Panduan langkah demi langkah
          </p>
        </div>
        <div className="flex gap-1.5">
          {log.length > 0 && (
            <button
              type="button"
              onClick={undoStep}
              className="px-3 py-2 rounded-xl bg-white/5 text-xs text-slate-200 hover:bg-white/10 active:scale-95"
            >
              ↩ Undo
            </button>
          )}
          <button
            type="button"
            onClick={reset}
            className="px-3 py-2 rounded-xl bg-white/5 text-xs text-slate-300 hover:bg-white/10 active:scale-95"
          >
            ↺ Reset
          </button>
        </div>
      </div>

      {/* Single-page compact tool strip */}
      <div className="grid grid-cols-3 gap-2">
        <button
          type="button"
          onClick={() => setDrawer("hero-power")}
          className={`card p-2.5 text-left transition active:scale-95 ${
            heroPower.length === 0 ? "border-[#f4c430]/40 bg-[#f4c430]/10" : "hover:border-white/20"
          }`}
        >
          <div className="text-xs font-bold text-[#f4c430] truncate">⚡ Hero Power</div>
          <div className="text-[11px] text-slate-300 truncate mt-0.5">
            {heroPower.length > 0 ? `${heroPower.length} andalan` : "Atur hero"}
          </div>
        </button>
        <button
          type="button"
          onClick={() => setDrawer("counter")}
          className="card p-2.5 text-left hover:border-white/20 transition active:scale-95"
        >
          <div className="text-xs font-bold text-emerald-300 truncate">🛡️ Counter</div>
          <div className="text-[11px] text-slate-400 truncate mt-0.5">Cek cepat</div>
        </button>
        <button
          type="button"
          onClick={() => setDrawer("heroes")}
          className="card p-2.5 text-left hover:border-white/20 transition active:scale-95"
        >
          <div className="text-xs font-bold text-sky-300 truncate">📚 Heroes</div>
          <div className="text-[11px] text-slate-400 truncate mt-0.5">{MLBB_HEROES.length} hero</div>
        </button>
      </div>

      {/* Mode, Tier & Side Selection */}
      <div className="space-y-2">
        <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-white/[0.04]">
          {(["Ranked Draft", "Tournament Draft"] as DraftMode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => selectMode(m)}
              className={`py-2 rounded-xl text-xs font-semibold transition ${
                mode === m ? "bg-[#f4c430] text-black" : "text-slate-400 hover:text-white"
              }`}
            >
              {m === "Ranked Draft" ? "🏆 Meta Ranked" : "🏟️ Meta Turnamen (MPL)"}
            </button>
          ))}
        </div>

        {mode === "Ranked Draft" && (
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
            {RANK_TIERS.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => selectTier(t)}
                className={`px-3 py-2 rounded-xl text-xs font-medium border shrink-0 transition active:scale-95 ${
                  t === tier ? "bg-[#f4c430] text-black border-[#f4c430]" : "border-white/10 text-slate-400 bg-white/[0.03]"
                }`}
              >
                {tierIcon[t]} {t}
              </button>
            ))}
          </div>
        )}
        <p className="text-[11px] text-slate-500 leading-snug">
          {mode === "Tournament Draft"
            ? "Meta Turnamen (5 ban/tim): prioritas pada hero flex, kontrol zona (Zhuxin), dan snowball agresif (Freya, Fanny, Chip)."
            : TIER_META_NOTES[tier]}
        </p>

        <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-white/[0.04]">
          {(["blue", "red"] as Side[]).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => selectSide(s)}
              className={`py-2 rounded-xl text-xs sm:text-sm font-semibold transition ${
                mySide === s
                  ? s === "blue"
                    ? "bg-sky-500/20 text-sky-200"
                    : "bg-rose-500/20 text-rose-200"
                  : "text-slate-400"
              }`}
            >
              {s === "blue" ? "🔵 Tim Biru (First Pick)" : "🔴 Tim Merah (Counter Pick)"}
            </button>
          ))}
        </div>
      </div>

      {/* Compact Live Draft Board */}
      <div className="card p-3 space-y-2.5">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-slate-200">
            {draftFinished
              ? "✅ Draft Selesai"
              : `📍 Langkah ${log.length + 1}/${draftSequence.length} · ${currentStep?.phaseLabel}`}
          </span>
          <button
            type="button"
            onClick={() => setViewAnalysis((v) => !v)}
            className="text-[11px] font-semibold text-[#f4c430] hover:underline"
          >
            {viewAnalysis ? "← Kembali ke Panduan Live" : "📊 Lihat Ringkasan"}
          </button>
        </div>

        {/* Progress bar */}
        <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#f4c430] to-emerald-400 transition-all duration-300"
            style={{ width: `${Math.round((log.length / draftSequence.length) * 100)}%` }}
          />
        </div>

        <div className="grid grid-cols-2 gap-2 text-[11px]">
          <div className="rounded-xl bg-sky-500/5 border border-sky-500/15 p-2 space-y-1.5">
            <div className="font-bold text-sky-300">Tim Kamu ({mySide === "blue" ? "Biru" : "Merah"})</div>
            <div className="text-[10px] text-slate-400">
              Ban ({myBans.length}/{bansPerTeam}):{" "}
              {myBans.length === 0
                ? "—"
                : myBans.map((id) => getHeroById(id)?.name ?? id).join(", ")}
            </div>
            <div className="flex flex-wrap gap-1">
              {myPicks.length === 0 ? (
                <span className="text-[10px] text-slate-500">Pick: belum ada</span>
              ) : (
                myPicks.map((id) => {
                  const h = getHeroById(id);
                  return h ? (
                    <div key={id} className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-sky-500/15">
                      <HeroAvatar hero={h} size={18} />
                      <span className="text-[10px] font-medium">{h.name}</span>
                    </div>
                  ) : null;
                })
              )}
            </div>
          </div>

          <div className="rounded-xl bg-rose-500/5 border border-rose-500/15 p-2 space-y-1.5">
            <div className="font-bold text-rose-300">Tim Lawan ({mySide === "blue" ? "Merah" : "Biru"})</div>
            <div className="text-[10px] text-slate-400">
              Ban ({enemyBans.length}/{bansPerTeam}):{" "}
              {enemyBans.length === 0
                ? "—"
                : enemyBans.map((id) => getHeroById(id)?.name ?? id).join(", ")}
            </div>
            <div className="flex flex-wrap gap-1">
              {enemyPicks.length === 0 ? (
                <span className="text-[10px] text-slate-500">Pick: belum ada</span>
              ) : (
                enemyPicks.map((id) => {
                  const h = getHeroById(id);
                  return h ? (
                    <div key={id} className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-rose-500/15">
                      <HeroAvatar hero={h} size={18} />
                      <span className="text-[10px] font-medium">{h.name}</span>
                    </div>
                  ) : null;
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Live Briefing after last action */}
      {stepBriefing && !viewAnalysis && (
        <div
          className={`card p-3.5 space-y-1.5 ${
            stepBriefing.tone === "warning"
              ? "border-rose-500/30 bg-rose-500/5"
              : stepBriefing.tone === "opportunity"
                ? "border-emerald-500/30 bg-emerald-500/5"
                : "border-sky-500/25 bg-sky-500/5"
          }`}
        >
          <div className="text-xs font-bold text-white">⚡ {stepBriefing.headline}</div>
          {stepBriefing.impacts.map((imp, idx) => (
            <p key={idx} className="text-[11px] text-slate-300 leading-snug">
              • {imp}
            </p>
          ))}
          <p className="text-[11px] text-[#f4c430] font-medium leading-snug">→ {stepBriefing.opportunity}</p>
        </div>
      )}

      {/* ===== LIVE STEP-BY-STEP GUIDANCE ===== */}
      {!draftFinished && !viewAnalysis && currentStep && (
        <div className="space-y-4">
          {heroPowerPrompt}

          {/* ENEMY TURN (BAN OR PICK) */}
          {currentStep.actor === "enemy" && (
            <div className="card p-4 border-rose-500/30 space-y-3">
              <div>
                <div className="flex items-center gap-2">
                  <Badge text="GILIRAN LAWAN" color="bg-rose-500/25 text-rose-200" />
                  <h2 className="text-sm font-bold text-rose-200">{currentStep.label}</h2>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  {currentStep.action === "ban"
                    ? "Pilih hero yang di-ban lawan — sistem akan langsung merekomendasikan ban berikutnya & opsi kombo yang terbuka."
                    : "Pilih hero yang di-pick lawan — sistem akan langsung menyiapkan counter pick & opsi kombo terbaik."}
                </p>
              </div>

              <HeroPicker
                label={currentStep.action === "ban" ? "Masukkan hero ban lawan:" : "Masukkan hero pick lawan:"}
                value={[]}
                onChange={(ids) => {
                  if (ids[0]) recordStep(ids[0]);
                }}
                max={1}
                hideCounter
                exclude={allUsed}
                accent="red"
                placeholder={
                  currentStep.action === "ban" ? "Ketik nama hero yang di-ban lawan..." : "Ketik nama hero yang di-pick lawan..."
                }
              />

              {/* Quick tap chips for common meta bans / predicted enemy picks */}
              {currentStep.action === "ban" && topMetaBans.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-[11px] text-slate-400">Tap cepat hero yang sering di-ban di meta ini:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {topMetaBans.map((m) => {
                      const h = getHeroById(m.heroId);
                      if (!h) return null;
                      return (
                        <button
                          key={h.id}
                          type="button"
                          onClick={() => recordStep(h.id)}
                          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white/[0.04] hover:bg-rose-500/20 border border-white/10 text-xs active:scale-95 transition"
                        >
                          <HeroAvatar hero={h} size={20} />
                          <span className="font-medium">{h.name}</span>
                          <span className="text-[10px] text-rose-300">{m.banRate}%</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {currentStep.action === "pick" &&
                (enemyThreats.counterThreats.length > 0 || topMetaBans.length > 0) && (
                  <div className="space-y-1.5">
                    <p className="text-[11px] text-slate-400">Tap cepat jika lawan mengambil hero meta/ancaman:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {(enemyThreats.counterThreats.length > 0
                        ? enemyThreats.counterThreats.map((t) => t.hero)
                        : topMetaBans.map((m) => getHeroById(m.heroId)).filter((h): h is Hero => !!h)
                      )
                        .slice(0, 6)
                        .map((h) => (
                          <button
                            key={h.id}
                            type="button"
                            onClick={() => recordStep(h.id)}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white/[0.04] hover:bg-rose-500/20 border border-white/10 text-xs active:scale-95 transition"
                          >
                            <HeroAvatar hero={h} size={20} />
                            <span className="font-medium">{h.name}</span>
                          </button>
                        ))}
                    </div>
                  </div>
                )}
            </div>
          )}

          {/* MY TURN: BAN */}
          {currentStep.actor === "me" && currentStep.action === "ban" && (
            <div className="card p-4 border-[#f4c430]/30 space-y-3">
              <div>
                <div className="flex items-center gap-2">
                  <Badge text="GILIRAN KAMU" color="bg-[#f4c430] text-black" />
                  <h2 className="text-sm font-bold text-[#f4c430]">🚫 {currentStep.label} — Rekomendasi Ban</h2>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Berdasarkan data ban rate {mode === "Tournament Draft" ? "Turnamen MPL" : `Meta ${tier}`} &amp; ancaman terhadap Hero Power kamu.
                </p>
              </div>

              <div className="space-y-2">
                {shownBanRecs.map((rec) => {
                  const badgeColor =
                    rec.category === "MUST BAN"
                      ? "bg-red-500/20 text-red-300"
                      : rec.category === "PRIORITY BAN"
                        ? "bg-orange-500/20 text-orange-300"
                        : "bg-slate-500/20 text-slate-300";
                  return (
                    <RecRow
                      key={rec.hero.id}
                      hero={rec.hero}
                      badgeText={rec.category}
                      badgeColor={badgeColor}
                      metaTier={rec.metaTier}
                      statText={`Ban ${rec.banRate}% · WR ${rec.winRate}%`}
                      score={rec.banScore}
                      reasons={rec.reasons}
                      actionLabel="Ban"
                      actionClassName="bg-rose-500/20 text-rose-200 hover:bg-rose-500/30"
                      onAction={() => recordStep(rec.hero.id)}
                    />
                  );
                })}
              </div>

              {banRecs.length > 5 && (
                <button
                  type="button"
                  onClick={() => setShowMoreBans((v) => !v)}
                  className="w-full py-2 rounded-xl bg-white/5 text-xs text-slate-300 hover:bg-white/10 transition"
                >
                  {showMoreBans ? "Tampilkan 5 teratas ▲" : "Lihat 5 kandidat ban lainnya ▼"}
                </button>
              )}

              <div className="pt-2 border-t border-white/5">
                <HeroPicker
                  label="Atau pilih hero lain yang kamu/rekan ban:"
                  value={[]}
                  onChange={(ids) => {
                    if (ids[0]) recordStep(ids[0]);
                  }}
                  max={1}
                  hideCounter
                  exclude={allUsed}
                  accent="blue"
                  placeholder="Cari hero ban tim kamu..."
                />
              </div>
            </div>
          )}

          {/* MY TURN: PICK */}
          {currentStep.actor === "me" && currentStep.action === "pick" && (
            <div className="card p-4 border-[#f4c430]/30 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <Badge text="GILIRAN KAMU" color="bg-[#f4c430] text-black" />
                    <h2 className="text-sm font-bold text-[#f4c430]">⚡ {currentStep.label} — Rekomendasi Pick</h2>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    {myPicks.length === 0
                      ? mySide === "blue"
                        ? "First Pick: prioritaskan hero meta S+/S fleksibel atau Hero Power terkuat."
                        : "Counter Pick: pilih hero yang langsung menekan pick awal lawan."
                      : "Diurutkan dari kecocokan role kosong, counter lawan, sinergi tim & Hero Power."}
                  </p>
                </div>
                {pickLaneFilter && (
                  <button
                    type="button"
                    onClick={() => setPickLaneFilter(null)}
                    className="text-[11px] text-[#f4c430] underline shrink-0"
                  >
                    Semua lane
                  </button>
                )}
              </div>

              {/* Lane filter pills */}
              <div className="flex flex-wrap gap-1.5">
                {ALL_LANES.map((lane) => {
                  const isOpen = missingLanes.includes(lane);
                  const isFiltered = pickLaneFilter === lane;
                  return (
                    <button
                      key={lane}
                      type="button"
                      onClick={() => setPickLaneFilter((cur) => (cur === lane ? null : lane))}
                      className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition ${
                        isFiltered
                          ? "bg-[#f4c430] text-black border-[#f4c430]"
                          : isOpen
                            ? "border-[#f4c430]/40 bg-[#f4c430]/10 text-[#f4c430]"
                            : "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                      }`}
                    >
                      {isOpen ? "?" : "✓"} {LANE_LABELS[lane]}
                    </button>
                  );
                })}
              </div>

              <div className="space-y-2">
                {shownPickRecs.map((rec) => {
                  const badgeColor =
                    rec.category === "BEST PICK"
                      ? "bg-emerald-500/20 text-emerald-300"
                      : rec.category === "COUNTER PICK"
                        ? "bg-purple-500/20 text-purple-300"
                        : "bg-slate-500/20 text-slate-300";
                  return (
                    <RecRow
                      key={rec.hero.id}
                      hero={rec.hero}
                      badgeText={rec.category}
                      badgeColor={badgeColor}
                      metaTier={rec.metaTier}
                      statText={`WR ${rec.winRate}%`}
                      extraBadges={
                        <>
                          {rec.missingRole && <Badge text={rec.missingRole} color="bg-sky-500/20 text-sky-300" />}
                          {rec.isHeroPower && <MasteryTag level={rec.masteryLevel} />}
                        </>
                      }
                      score={rec.pickScore}
                      reasons={rec.reasons}
                      actionLabel="+ Pick"
                      actionClassName="bg-[#f4c430]/20 text-[#f4c430] hover:bg-[#f4c430]/30"
                      onAction={() => recordStep(rec.hero.id)}
                    />
                  );
                })}
              </div>

              {pickRecs.length > 5 && (
                <button
                  type="button"
                  onClick={() => setShowMorePicks((v) => !v)}
                  className="w-full py-2 rounded-xl bg-white/5 text-xs text-slate-300 hover:bg-white/10 transition"
                >
                  {showMorePicks ? "Tampilkan 5 teratas ▲" : "Lihat 5 kandidat pick lainnya ▼"}
                </button>
              )}

              <div className="pt-2 border-t border-white/5">
                <HeroPicker
                  label="Atau masukkan hero lain yang dipilih tim kamu:"
                  value={[]}
                  onChange={(ids) => {
                    if (ids[0]) recordStep(ids[0]);
                  }}
                  max={1}
                  hideCounter
                  exclude={allUsed}
                  accent="blue"
                  placeholder="Cari hero pick tim kamu..."
                />
              </div>
            </div>
          )}

          {/* LIVE COMBO OPTIONS (ALWAYS VISIBLE AT EVERY STEP) */}
          <section className="space-y-2">
            <div>
              <h2 className="text-sm font-bold text-[#f4c430]">🔗 Opsi Kombo Melawan Lawan (Live)</h2>
              <p className="text-[11px] text-slate-400">
                Diperbarui otomatis setiap ada hero di-ban atau di-pick — manfaatkan celah draft lawan dengan kombo berikut.
              </p>
            </div>
            <div className="space-y-2">
              {combos.map((c, i) => (
                <ComboCard key={c.id} combo={c} index={i} />
              ))}
            </div>
          </section>

          {/* ENEMY THREATS PREVIEW */}
          {(enemyThreats.counterThreats.length > 0 || enemyThreats.synergyThreats.length > 0) &&
            enemyPicks.length < 5 && (
              <div className="card p-4 border-orange-500/20 space-y-2.5">
                <div>
                  <h2 className="text-xs font-bold text-orange-300">👁️ Prediksi Ancaman Pick Lawan Berikutnya</h2>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Lawan masih butuh: {enemyThreats.enemyMissingLanes.map((l) => LANE_LABELS[l]).join(", ") || "Fleksibel"}.
                  </p>
                </div>
                {enemyThreats.counterThreats.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="text-[11px] font-semibold text-rose-300">Waspada lawan pick counter tim kamu:</div>
                    <div className="flex flex-wrap gap-2">
                      {enemyThreats.counterThreats.map(({ hero, threatens }) => (
                        <div
                          key={hero.id}
                          className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-rose-500/10 border border-rose-500/20"
                        >
                          <HeroAvatar hero={hero} size={24} />
                          <div>
                            <div className="text-xs font-bold">{hero.name}</div>
                            <div className="text-[10px] text-rose-300">Counter {threatens.join(", ")}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {enemyThreats.synergyThreats.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="text-[11px] font-semibold text-amber-300">Potensi kombo lanjutan lawan:</div>
                    <div className="flex flex-wrap gap-2">
                      {enemyThreats.synergyThreats.map(({ hero, comboWith }) => (
                        <div
                          key={hero.id}
                          className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20"
                        >
                          <HeroAvatar hero={hero} size={24} />
                          <div>
                            <div className="text-xs font-bold">{hero.name}</div>
                            <div className="text-[10px] text-amber-300">Sinergi dgn {comboWith.join(", ")}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
        </div>
      )}

      {/* ===== RESULT / FULL ANALYSIS VIEW ===== */}
      {(draftFinished || viewAnalysis) && (
        <div className="space-y-4">
          <div className="card p-4 text-center">
            <p className="text-lg font-bold text-[#f4c430]">
              {draftFinished ? "🎮 Draft Selesai!" : "📊 Ringkasan Draft Sementara"}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              {draftFinished
                ? "Berikut perbandingan kekuatan, kombo terbaik, dan win condition kedua tim."
                : "Klik 'Kembali ke Panduan Live' di atas untuk melanjutkan langkah draft."}
            </p>
          </div>

          {myEval && enemyEval && (
            <div className="card p-4 space-y-2">
              <p className="text-sm font-bold mb-1">📊 Perbandingan Kekuatan</p>
              {[
                compareAdvantage("Early Game", myEval.earlyScore, enemyEval.earlyScore),
                compareAdvantage("Mid Game", myEval.midScore, enemyEval.midScore),
                compareAdvantage("Late Game", myEval.lateScore, enemyEval.lateScore),
              ].map((c) => (
                <div key={c.label} className="flex justify-between text-sm">
                  <span className="text-slate-400">{c.label}</span>
                  <span className={`font-semibold ${c.tone}`}>{c.winner}</span>
                </div>
              ))}
              {(["teamFightAdvantage", "objectiveAdvantage", "splitPushAdvantage"] as const).map((k) => {
                const label =
                  k === "teamFightAdvantage" ? "Team fight" : k === "objectiveAdvantage" ? "Objektif (Turtle/Lord)" : "Split push";
                const myHas = myEval[k];
                const enHas = enemyEval[k];
                const w = myHas === enHas ? "Seimbang" : myHas ? "Tim Kamu" : "Tim Lawan";
                const tone = w === "Tim Kamu" ? "text-emerald-300" : w === "Tim Lawan" ? "text-rose-300" : "text-slate-300";
                return (
                  <div key={k} className="flex justify-between text-sm">
                    <span className="text-slate-400">{label}</span>
                    <span className={`font-semibold ${tone}`}>{w}</span>
                  </div>
                );
              })}
            </div>
          )}

          <div className="space-y-3">
            {myEval && (
              <TeamPhaseCard title={`${mySide === "blue" ? "🔵" : "🔴"} Evaluasi Tim Kamu`} ev={myEval} tone={mySide} />
            )}
            {enemyEval && (
              <TeamPhaseCard
                title={`${mySide === "blue" ? "🔴" : "🔵"} Evaluasi Tim Lawan`}
                ev={enemyEval}
                tone={mySide === "blue" ? "red" : "blue"}
              />
            )}
          </div>

          <section className="space-y-2">
            <div>
              <h2 className="text-sm font-bold">🔗 Rekomendasi Kombo Tim</h2>
              <p className="text-xs text-slate-500">Strategi eksekusi paling cocok berdasarkan ban, pick kamu &amp; lawan.</p>
            </div>
            <div className="space-y-2">
              {combos.map((c, i) => (
                <ComboCard key={c.id} combo={c} index={i} />
              ))}
            </div>
          </section>

          <AiNote />
        </div>
      )}

      {/* Drawers (keep everything on 1 page) */}
      {drawer === "hero-power" && <HeroPowerDrawer onClose={() => setDrawer(null)} />}
      {drawer === "counter" && <CounterDrawer onClose={() => setDrawer(null)} />}
      {drawer === "heroes" && <HeroesDrawer onClose={() => setDrawer(null)} />}
    </div>
  );
}
