"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { HeroPicker } from "@/components/HeroPicker";
import { HeroAvatar } from "@/components/HeroAvatar";
import { PhaseRow } from "@/components/PhaseBadge";
import { ComboCard, TeamPhaseCard, MasteryTag, AiNote } from "@/components/AnalysisCards";
import { CounterDrawer, HeroPowerDrawer, HeroesDrawer } from "@/components/QuickDrawers";
import { useHeroPower, useMyLane, useMySide, useTier } from "@/lib/storage";
import {
  RANK_TIERS,
  buildDraftSequence,
  getInitialDraftConfig,
} from "@/lib/database/draftRules";
import {
  META_PATCH_INFO,
  getQuickHeroesByRole,
  setLiveMetaOverrides,
  type LiveMetaOverride,
  type MetaTier,
} from "@/lib/database/metaData";
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
import type { Hero, Lane, RankTier, Role } from "@/lib/types";

type Side = "blue" | "red";
type Drawer = "hero-power" | "counter" | "heroes" | null;

const ALL_LANES: Lane[] = ["Jungle", "Gold Lane", "Mid Lane", "EXP Lane", "Roam"];
const QUICK_ROLES: Array<Role | "All"> = ["All", "Tank", "Fighter", "Assassin", "Mage", "Marksman", "Support"];

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
  rank: number;
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
  rank,
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
    <div
      className={`rounded-xl border overflow-hidden ${
        rank <= 3
          ? "bg-[#f4c430]/[0.06] border-[#f4c430]/25"
          : "bg-white/[0.03] border-white/5"
      }`}
    >
      <div className="flex items-center gap-2.5 p-2.5">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex flex-1 min-w-0 items-center gap-2.5 text-left"
        >
          <div className="relative shrink-0">
            <HeroAvatar hero={hero} size={40} />
            <span
              className={`absolute -top-1 -left-1 w-4 h-4 rounded-full text-[9px] font-black flex items-center justify-center ${
                rank === 1
                  ? "bg-[#f4c430] text-black"
                  : rank <= 3
                    ? "bg-white/90 text-black"
                    : "bg-slate-700 text-slate-200"
              }`}
            >
              {rank}
            </span>
          </div>
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
  const mode = "Ranked Draft" as const;
  const [mySide, setMySide] = useMySide();
  const [myLane, setMyLane] = useMyLane();
  const [drawer, setDrawer] = useState<Drawer>(null);
  const [showSettings, setShowSettings] = useState(false);

  // Meta sync state
  const [metaVersion, setMetaVersion] = useState(0);
  const [metaSyncing, setMetaSyncing] = useState(false);
  const [metaStatus, setMetaStatus] = useState<string>(`Auto-sync · ${META_PATCH_INFO.patch}`);

  // Sequential live draft log + active step index
  const [log, setLog] = useState<DraftLogEntry[]>([]);
  const [stepIdx, setStepIdx] = useState(0);
  const [viewAnalysis, setViewAnalysis] = useState(false);

  // List UI state
  const [showMoreBans, setShowMoreBans] = useState(false);
  const [showMorePicks, setShowMorePicks] = useState(false);
  const [laneOverride, setLaneOverride] = useState<Lane | null | "unset">("unset");
  const [quickRole, setQuickRole] = useState<Role | "All">("All");

  const activeLaneFilter = laneOverride === "unset" ? myLane : laneOverride;

  const syncMeta = useCallback(async (signal?: AbortSignal) => {
    try {
      const res = await fetch(`/api/meta?tier=${encodeURIComponent(tier)}`, { signal });
      const data = (await res.json()) as {
        live?: boolean;
        source?: string;
        patch?: string;
        count?: number;
        overrides?: Record<string, LiveMetaOverride>;
      };
      if (data.overrides && Object.keys(data.overrides).length > 0) {
        setLiveMetaOverrides(data.overrides);
        setMetaVersion((v) => v + 1);
        setMetaStatus(`Auto-sync Live (${data.count} hero)`);
      } else {
        setMetaStatus(`Auto-sync · ${data.patch ?? META_PATCH_INFO.patch}`);
      }
    } catch {
      if (!signal?.aborted) {
        setMetaStatus(`${META_PATCH_INFO.patch} · Lokal`);
      }
    } finally {
      if (!signal?.aborted) {
        setMetaSyncing(false);
      }
    }
  }, [tier]);

  // Auto-sync on mount & whenever rank tier changes
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      void syncMeta(controller.signal);
    }, 0);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [syncMeta]);

  const config = useMemo(() => getInitialDraftConfig(tier, mode), [tier, mode]);
  const bansPerTeam = config.bansPerTeam;

  const draftSequence = useMemo(() => buildDraftSequence(tier, mode, mySide), [tier, mode, mySide]);

  // Derive teams from log
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

  const currentStep = stepIdx < draftSequence.length ? draftSequence[stepIdx] : null;
  const draftFinished = stepIdx >= draftSequence.length;
  const lastEntry = log.length > 0 ? log[log.length - 1] : undefined;

  const currentStepEntries = useMemo(
    () => (currentStep ? log.filter((e) => e.stepIndex === currentStep.index) : []),
    [log, currentStep]
  );

  const resetWith = (nextTier: RankTier, nextSide: Side) => {
    setTier(nextTier);
    setMySide(nextSide);
    setLog([]);
    setStepIdx(0);
    setViewAnalysis(false);
  };

  const recordStep = (heroId: string) => {
    if (!currentStep || allUsed.includes(heroId)) return;
    const nextEntry: DraftLogEntry = {
      stepIndex: currentStep.index,
      action: currentStep.action,
      actor: currentStep.actor,
      heroId,
    };
    const newCountInStep = currentStepEntries.length + 1;
    setLog((prev) => [...prev, nextEntry]);
    if (newCountInStep >= currentStep.slots) {
      setStepIdx((i) => i + 1);
      setShowMoreBans(false);
      setShowMorePicks(false);
    }
  };

  const advanceSimultaneousStep = () => {
    if (!currentStep) return;
    setStepIdx((i) => i + 1);
    setShowMoreBans(false);
    setShowMorePicks(false);
  };

  const undoStep = () => {
    if (log.length === 0) {
      if (stepIdx > 0) setStepIdx((i) => i - 1);
      return;
    }
    const removed = log[log.length - 1];
    setLog((prev) => prev.slice(0, -1));
    setStepIdx(removed.stepIndex);
    setViewAnalysis(false);
  };

  const reset = () => {
    setLog([]);
    setStepIdx(0);
    setLaneOverride("unset");
    setShowMoreBans(false);
    setShowMorePicks(false);
    setViewAnalysis(false);
    setShowSettings(false);
  };

  const myHeroes = useMemo(
    () => myPicks.map((id) => getHeroById(id)).filter((h): h is Hero => !!h),
    [myPicks]
  );
  const missingLanes = useMemo(() => getMissingLanes(myHeroes), [myHeroes]);

  // Real-time Ban & Pick Predictions
  const banRecs = useMemo(
    () => generateBanRecommendations(allUsed, heroPower, tier, myPicks, enemyPicks, 10, mode),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [allUsed, heroPower, tier, myPicks, enemyPicks, mode, metaVersion]
  );

  const pickRecs = useMemo(
    () =>
      generatePickRecommendations(myPicks, enemyPicks, allBans, heroPower, {
        tier,
        mode,
        mySide,
        laneFilter: activeLaneFilter,
        limit: 10,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [myPicks, enemyPicks, allBans, heroPower, tier, mode, mySide, activeLaneFilter, metaVersion]
  );

  const quickRoleHeroes = useMemo(
    () => getQuickHeroesByRole(quickRole, tier, mode, allUsed, 8),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [quickRole, tier, mode, allUsed, metaVersion]
  );
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

  return (
    <div className="max-w-2xl mx-auto px-4 pt-3 pb-8 space-y-3">
      {/* Compact Header */}
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-lg sm:text-xl font-black" style={{ fontFamily: "'Orbitron', sans-serif" }}>
            LIVE DRAFT GUIDE
          </h1>
          <div className="flex items-center gap-2 flex-wrap mt-0.5">
            <span className="text-[11px] text-slate-400">
              {tier} · {bansPerTeam} ban/tim · {metaStatus}
            </span>
            <button
              type="button"
              onClick={() => {
                setMetaSyncing(true);
                void syncMeta();
              }}
              disabled={metaSyncing}
              className="px-2 py-0.5 rounded-full bg-white/5 hover:bg-white/10 text-[10px] font-semibold text-[#f4c430] disabled:opacity-50"
            >
              {metaSyncing ? "⏳ Sync..." : "🔄"}
            </button>
          </div>
        </div>
        <div className="flex gap-1.5">
          {(log.length > 0 || stepIdx > 0) && (
            <button
              type="button"
              onClick={undoStep}
              className="px-2.5 py-1.5 rounded-xl bg-white/5 text-xs text-slate-200 hover:bg-white/10 active:scale-95"
            >
              ↩ Undo
            </button>
          )}
          <button
            type="button"
            onClick={reset}
            className="px-2.5 py-1.5 rounded-xl bg-white/5 text-xs text-slate-300 hover:bg-white/10 active:scale-95"
          >
            ↺ Reset
          </button>
        </div>
      </div>

      {/* Single-page compact tool strip + Settings toggle once draft starts */}
      <div className="grid grid-cols-3 gap-2">
        <button
          type="button"
          onClick={() => setDrawer("hero-power")}
          className={`card p-2 text-left transition active:scale-95 ${
            heroPower.length === 0 ? "border-[#f4c430]/40 bg-[#f4c430]/10" : "hover:border-white/20"
          }`}
        >
          <div className="text-xs font-bold text-[#f4c430] truncate">⚡ Hero Power</div>
          <div className="text-[10px] text-slate-300 truncate">
            {heroPower.length > 0 ? `${heroPower.length} andalan` : "Atur hero"}
          </div>
        </button>
        <button
          type="button"
          onClick={() => setDrawer("counter")}
          className="card p-2 text-left hover:border-white/20 transition active:scale-95"
        >
          <div className="text-xs font-bold text-emerald-300 truncate">🛡️ Counter</div>
          <div className="text-[10px] text-slate-400 truncate">Cek cepat</div>
        </button>
        <button
          type="button"
          onClick={() => setDrawer("heroes")}
          className="card p-2 text-left hover:border-white/20 transition active:scale-95"
        >
          <div className="text-xs font-bold text-sky-300 truncate">📚 Heroes</div>
          <div className="text-[10px] text-slate-400 truncate">{MLBB_HEROES.length} hero</div>
        </button>
      </div>

      {/* Collapsible Tier, Side & Sticky Posisi Saya */}
      {(log.length > 0 || stepIdx > 0) && !showSettings ? (
        <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-xs">
          <span className="text-slate-300 truncate">
            {tierIcon[tier]} {tier} · {mySide === "blue" ? "🔵 Biru" : "🔴 Merah"}
            {myLane ? ` · 📌 ${LANE_LABELS[myLane]}` : ""}
          </span>
          <button
            type="button"
            onClick={() => setShowSettings(true)}
            className="text-[11px] font-semibold text-[#f4c430] shrink-0 ml-2"
          >
            ⚙️ Ubah
          </button>
        </div>
      ) : (
        <div className="card p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300">⚙️ Pengaturan Match &amp; Posisi Kamu</span>
            {(log.length > 0 || stepIdx > 0) && (
              <button
                type="button"
                onClick={() => setShowSettings(false)}
                className="text-[11px] text-[#f4c430]"
              >
                Tutup ▲
              </button>
            )}
          </div>

          {/* Sticky Posisi Saya */}
          <div className="space-y-1">
            <div className="text-[10px] text-slate-400 font-semibold">📌 Posisi Saya (Tersimpan otomatis):</div>
            <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
              <button
                type="button"
                onClick={() => {
                  setMyLane(null);
                  setLaneOverride("unset");
                }}
                className={`px-2.5 py-1 rounded-full text-[11px] font-medium border shrink-0 transition ${
                  myLane === null ? "bg-[#f4c430] text-black border-[#f4c430]" : "border-white/10 text-slate-400 bg-white/[0.03]"
                }`}
              >
                Semua Lane
              </button>
              {ALL_LANES.map((lane) => (
                <button
                  key={lane}
                  type="button"
                  onClick={() => {
                    setMyLane(lane);
                    setLaneOverride("unset");
                  }}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-medium border shrink-0 transition ${
                    myLane === lane ? "bg-[#f4c430] text-black border-[#f4c430]" : "border-white/10 text-slate-400 bg-white/[0.03]"
                  }`}
                >
                  {LANE_LABELS[lane]}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
            {RANK_TIERS.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => resetWith(t, mySide)}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-medium border shrink-0 transition active:scale-95 ${
                  t === tier ? "bg-[#f4c430] text-black border-[#f4c430]" : "border-white/10 text-slate-400 bg-white/[0.03]"
                }`}
              >
                {tierIcon[t]} {t}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-white/[0.04]">
            {(["blue", "red"] as Side[]).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => resetWith(tier, s)}
                className={`py-1.5 rounded-lg text-xs font-semibold transition ${
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
      )}

      {/* Compact Live Draft Board */}
      <div className="card p-2.5 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-slate-200">
            {draftFinished
              ? "✅ Draft Selesai"
              : `📍 Giliran ${stepIdx + 1}/${draftSequence.length} · ${currentStep?.phaseLabel}`}
          </span>
          <button
            type="button"
            onClick={() => setViewAnalysis((v) => !v)}
            className="text-[11px] font-semibold text-[#f4c430] hover:underline"
          >
            {viewAnalysis ? "← Kembali ke Panduan" : "📊 Ringkasan"}
          </button>
        </div>

        <div className="h-1 w-full rounded-full bg-white/10 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#f4c430] to-emerald-400 transition-all duration-300"
            style={{ width: `${Math.round((stepIdx / draftSequence.length) * 100)}%` }}
          />
        </div>

        <div className="grid grid-cols-2 gap-2 text-[11px]">
          <div className="rounded-xl bg-sky-500/5 border border-sky-500/15 p-2 space-y-1">
            <div className="font-bold text-sky-300">Tim Kamu ({mySide === "blue" ? "Biru" : "Merah"})</div>
            <div className="text-[10px] text-slate-400 truncate">
              Ban: {myBans.length === 0 ? "—" : myBans.map((id) => getHeroById(id)?.name ?? id).join(", ")}
            </div>
            <div className="flex flex-wrap gap-1">
              {myPicks.length === 0 ? (
                <span className="text-[10px] text-slate-500">Pick: —</span>
              ) : (
                myPicks.map((id) => {
                  const h = getHeroById(id);
                  return h ? (
                    <div key={id} className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-sky-500/15">
                      <HeroAvatar hero={h} size={16} />
                      <span className="text-[10px] font-medium">{h.name}</span>
                    </div>
                  ) : null;
                })
              )}
            </div>
          </div>

          <div className="rounded-xl bg-rose-500/5 border border-rose-500/15 p-2 space-y-1">
            <div className="font-bold text-rose-300">Tim Lawan ({mySide === "blue" ? "Merah" : "Biru"})</div>
            <div className="text-[10px] text-slate-400 truncate">
              Ban: {enemyBans.length === 0 ? "—" : enemyBans.map((id) => getHeroById(id)?.name ?? id).join(", ")}
            </div>
            <div className="flex flex-wrap gap-1">
              {enemyPicks.length === 0 ? (
                <span className="text-[10px] text-slate-500">Pick: —</span>
              ) : (
                enemyPicks.map((id) => {
                  const h = getHeroById(id);
                  return h ? (
                    <div key={id} className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-rose-500/15">
                      <HeroAvatar hero={h} size={16} />
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
          className={`card p-3 space-y-1 ${
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
          {/* ENEMY TURN (BAN OR PICK) */}
          {currentStep.actor === "enemy" && (
            <div className="card p-4 border-rose-500/30 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <Badge text="GILIRAN LAWAN" color="bg-rose-500/25 text-rose-200" />
                    <h2 className="text-sm font-bold text-rose-200">{currentStep.label}</h2>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    {currentStep.simultaneous
                      ? `Masukkan hero yang di-ban lawan setelah reveal (${currentStepEntries.length}/${currentStep.slots}). Jika ada ban kembar, klik Lanjut Pick.`
                      : currentStep.action === "ban"
                        ? "Pilih hero yang di-ban lawan — sistem langsung memperbarui rekomendasi ban & kombo."
                        : `Pilih hero yang di-pick lawan (${currentStepEntries.length}/${currentStep.slots}) — sistem langsung menyiapkan counter & kombo.`}
                  </p>
                </div>
                {currentStep.simultaneous && (
                  <button
                    type="button"
                    onClick={advanceSimultaneousStep}
                    className="px-3 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-200 text-xs font-bold shrink-0 hover:bg-emerald-500/30"
                  >
                    Lanjut Pick →
                  </button>
                )}
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
                  currentStep.action === "ban" ? "Ketik hero ban lawan..." : "Ketik hero pick lawan..."
                }
              />

              {/* 1-Tap Role Grid (No typing needed!) */}
              <div className="space-y-2 pt-1 border-t border-white/5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-slate-400 font-semibold">
                    ⚡ Pilih Cepat 1-Tap per Role (Tanpa Ketik):
                  </span>
                </div>
                <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
                  {QUICK_ROLES.map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setQuickRole(r)}
                      className={`px-2.5 py-1 rounded-full text-[11px] font-medium border shrink-0 transition ${
                        quickRole === r
                          ? "bg-rose-500/30 text-rose-100 border-rose-400/50"
                          : "border-white/10 text-slate-400 bg-white/[0.03]"
                      }`}
                    >
                      {r === "All" ? "🔥 Populer" : r}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  {quickRoleHeroes.map(({ hero: h, meta }) => (
                    <button
                      key={h.id}
                      type="button"
                      onClick={() => recordStep(h.id)}
                      className="flex items-center gap-1.5 p-1.5 rounded-xl bg-white/[0.04] hover:bg-rose-500/20 border border-white/10 text-left active:scale-95 transition"
                    >
                      <HeroAvatar hero={h} size={24} />
                      <div className="min-w-0 flex-1">
                        <div className="text-[11px] font-semibold truncate">{h.name}</div>
                        <div className="text-[9px] text-slate-400 truncate">
                          {meta.metaTier} · {currentStep.action === "ban" ? `Ban ${meta.banRate}%` : `WR ${meta.winRate}%`}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* MY TURN: BAN */}
          {currentStep.actor === "me" && currentStep.action === "ban" && (
            <div className="card p-4 border-[#f4c430]/30 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <Badge text="GILIRAN KAMU" color="bg-[#f4c430] text-black" />
                    <h2 className="text-sm font-bold text-[#f4c430]">🚫 {currentStep.label}</h2>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Diurutkan dari prioritas tertinggi (#1 teratas) sesuai data ban rate {tier}.
                  </p>
                </div>
                {currentStep.simultaneous && (
                  <button
                    type="button"
                    onClick={advanceSimultaneousStep}
                    className="px-3 py-1.5 rounded-xl bg-sky-500/20 text-sky-200 text-xs font-bold shrink-0 hover:bg-sky-500/30"
                  >
                    Reveal Ban Lawan →
                  </button>
                )}
              </div>

              <div className="space-y-2">
                {shownBanRecs.map((rec, idx) => {
                  const badgeColor =
                    rec.category === "MUST BAN"
                      ? "bg-red-500/20 text-red-300"
                      : rec.category === "PRIORITY BAN"
                        ? "bg-orange-500/20 text-orange-300"
                        : "bg-slate-500/20 text-slate-300";
                  return (
                    <RecRow
                      key={rec.hero.id}
                      rank={idx + 1}
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
                  label="Atau pilih hero lain yang diban tim kamu:"
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
                    <h2 className="text-sm font-bold text-[#f4c430]">
                      ⚡ {currentStep.label} ({currentStepEntries.length}/{currentStep.slots})
                    </h2>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Diurutkan dari prioritas #1 teratas (role kosong, counter lawan, sinergi &amp; meta {tier}).
                  </p>
                </div>
                {activeLaneFilter && (
                  <button
                    type="button"
                    onClick={() => setLaneOverride(null)}
                    className="text-[11px] text-[#f4c430] underline shrink-0"
                  >
                    Semua lane
                  </button>
                )}
              </div>

              {/* Lane filter pills ("Posisi Saya") */}
              <div className="space-y-1">
                <div className="text-[10px] text-slate-400 font-semibold">
                  Filter Posisi / Lane {myLane ? `(📌 Tersimpan: ${LANE_LABELS[myLane]})` : "Kamu"}:
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {ALL_LANES.map((lane) => {
                    const isOpen = missingLanes.includes(lane);
                    const isFiltered = activeLaneFilter === lane;
                    return (
                      <button
                        key={lane}
                        type="button"
                        onClick={() => {
                          const next = activeLaneFilter === lane ? null : lane;
                          setLaneOverride(next);
                          setMyLane(next);
                        }}
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
              </div>

              <div className="space-y-2">
                {shownPickRecs.map((rec, idx) => {
                  const badgeColor =
                    rec.category === "BEST PICK"
                      ? "bg-emerald-500/20 text-emerald-300"
                      : rec.category === "COUNTER PICK"
                        ? "bg-purple-500/20 text-purple-300"
                        : "bg-slate-500/20 text-slate-300";
                  return (
                    <RecRow
                      key={rec.hero.id}
                      rank={idx + 1}
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

          {/* LIVE COMBO OPTIONS */}
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
                : "Klik 'Kembali ke Panduan' di atas untuk melanjutkan langkah draft."}
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
