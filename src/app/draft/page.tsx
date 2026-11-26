"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { HeroPicker } from "@/components/HeroPicker";
import { HeroAvatar } from "@/components/HeroAvatar";
import { PhaseRow } from "@/components/PhaseBadge";
import { ComboCard, TeamPhaseCard, MasteryTag, AiNote } from "@/components/AnalysisCards";
import { useHeroPower, useTier } from "@/lib/storage";
import { RANK_TIERS, getInitialDraftConfig, TIER_META_NOTES } from "@/lib/database/draftRules";
import {
  LANE_LABELS,
  generateBanRecommendations,
  generatePickRecommendations,
  getMissingLanes,
  predictEnemyThreats,
  evaluateTeamComposition,
} from "@/lib/engine/recommendationEngine";
import { buildComboRecommendations } from "@/lib/database/combosData";
import { getHeroById } from "@/lib/database/heroesData";
import type { Hero, Lane, RankTier } from "@/lib/types";

type Phase = "ban" | "pick" | "result";
type Side = "blue" | "red";

const ALL_LANES: Lane[] = ["Jungle", "Gold Lane", "Mid Lane", "EXP Lane", "Roam"];

const tierIcon: Record<string, string> = {
  Epic: "🔵",
  Legend: "🟣",
  Mythic: "🔴",
  "Mythical Honor": "🟠",
  "Mythical Glory": "⭐",
  "Mythical Immortal": "👑",
};

function Badge({ text, color }: { text: string; color: string }) {
  return <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${color}`}>{text}</span>;
}

interface RecRowProps {
  hero: Hero;
  badgeText: string;
  badgeColor: string;
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
              {extraBadges}
            </div>
            <p className="text-[11px] text-slate-300 mt-0.5 line-clamp-2 leading-snug">{reasons[0]}</p>
            <div className="text-[10px] text-slate-500 mt-0.5">
              Skor {score} · {hero.roles.join("/")} · {expanded ? "Tutup ▲" : "Detail ▼"}
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

export default function DraftPage() {
  const [tier, setTier] = useTier();
  const [heroPower] = useHeroPower();
  const [mySide, setMySide] = useState<Side>("blue");
  const [phase, setPhase] = useState<Phase>("ban");

  // Draft state
  const [myBans, setMyBans] = useState<string[]>([]);
  const [enemyBans, setEnemyBans] = useState<string[]>([]);
  const [myPicks, setMyPicks] = useState<string[]>([]);
  const [enemyPicks, setEnemyPicks] = useState<string[]>([]);

  // UI state
  const [showMoreBans, setShowMoreBans] = useState(false);
  const [showMorePicks, setShowMorePicks] = useState(false);
  const [pickLaneFilter, setPickLaneFilter] = useState<Lane | null>(null);

  const config = getInitialDraftConfig(tier);
  const bansPerTeam = config.bansPerTeam;

  const selectTier = (nextTier: RankTier) => {
    setTier(nextTier);
    const nextBans = getInitialDraftConfig(nextTier).bansPerTeam;
    setMyBans((b) => b.slice(0, nextBans));
    setEnemyBans((b) => b.slice(0, nextBans));
  };

  const allBans = useMemo(() => [...myBans, ...enemyBans], [myBans, enemyBans]);
  const allUsed = useMemo(() => [...allBans, ...myPicks, ...enemyPicks], [allBans, myPicks, enemyPicks]);
  const without = (own: string[]) => allUsed.filter((id) => !own.includes(id));

  const bansDone = myBans.length >= bansPerTeam && enemyBans.length >= bansPerTeam;
  const picksDone = myPicks.length >= 5 && enemyPicks.length >= 5;

  const myHeroes = useMemo(
    () => myPicks.map((id) => getHeroById(id)).filter((h): h is Hero => !!h),
    [myPicks]
  );
  const missingLanes = useMemo(() => getMissingLanes(myHeroes), [myHeroes]);

  // Real-time Ban & Pick Predictions
  const banRecs = useMemo(
    () => generateBanRecommendations(allUsed, heroPower, tier, myPicks, enemyPicks, 10),
    [allUsed, heroPower, tier, myPicks, enemyPicks]
  );

  const pickRecs = useMemo(
    () =>
      generatePickRecommendations(myPicks, enemyPicks, allBans, heroPower, {
        tier,
        mySide,
        laneFilter: pickLaneFilter,
        limit: 10,
      }),
    [myPicks, enemyPicks, allBans, heroPower, tier, mySide, pickLaneFilter]
  );

  const enemyThreats = useMemo(
    () => predictEnemyThreats(myPicks, enemyPicks, allBans),
    [myPicks, enemyPicks, allBans]
  );

  const myEval = useMemo(() => (myPicks.length > 0 ? evaluateTeamComposition(myPicks) : null), [myPicks]);
  const enemyEval = useMemo(() => (enemyPicks.length > 0 ? evaluateTeamComposition(enemyPicks) : null), [enemyPicks]);
  const combos = useMemo(() => buildComboRecommendations(myPicks, enemyPicks), [myPicks, enemyPicks]);

  const reset = () => {
    setMyBans([]);
    setEnemyBans([]);
    setMyPicks([]);
    setEnemyPicks([]);
    setPickLaneFilter(null);
    setShowMoreBans(false);
    setShowMorePicks(false);
    setPhase("ban");
  };

  const quickBan = (id: string) => {
    if (allUsed.includes(id)) return;
    if (myBans.length < bansPerTeam) {
      setMyBans([...myBans, id]);
    } else if (enemyBans.length < bansPerTeam) {
      setEnemyBans([...enemyBans, id]);
    }
  };

  const quickPick = (id: string) => {
    if (myPicks.length < 5 && !allUsed.includes(id)) {
      setMyPicks([...myPicks, id]);
    }
  };

  const shownBanRecs = banRecs.slice(0, showMoreBans ? 10 : 5);
  const shownPickRecs = pickRecs.slice(0, showMorePicks ? 10 : 5);

  const compareAdvantage = (label: string, myScore: number, enScore: number) => {
    const diff = myScore - enScore;
    const winner = Math.abs(diff) < 5 ? "Seimbang" : diff > 0 ? "Tim Kamu" : "Tim Lawan";
    const tone = winner === "Tim Kamu" ? "text-emerald-300" : winner === "Tim Lawan" ? "text-rose-300" : "text-slate-300";
    return { label, winner, tone };
  };

  return (
    <div className="max-w-2xl mx-auto px-4 pt-5 pb-24 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black" style={{ fontFamily: "'Orbitron', sans-serif" }}>
            DRAFT ASSISTANT
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            {tier} · {bansPerTeam} ban/tim · Prediksi ban &amp; pick real-time
          </p>
        </div>
        <button onClick={reset} className="px-3 py-2 rounded-xl bg-white/5 text-xs text-slate-300 active:scale-95">
          ↺ Reset
        </button>
      </div>

      {/* Tier & Side Selection */}
      <div className="space-y-2.5">
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
          {RANK_TIERS.map((t) => (
            <button
              key={t}
              onClick={() => selectTier(t)}
              className={`px-3 py-2 rounded-xl text-xs font-medium border shrink-0 transition active:scale-95 ${
                t === tier ? "bg-[#f4c430] text-black border-[#f4c430]" : "border-white/10 text-slate-400 bg-white/[0.03]"
              }`}
            >
              {tierIcon[t]} {t}
            </button>
          ))}
        </div>
        <p className="text-[11px] text-slate-500 leading-snug">{TIER_META_NOTES[tier]}</p>

        <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-white/[0.04]">
          {(["blue", "red"] as Side[]).map((s) => (
            <button
              key={s}
              onClick={() => setMySide(s)}
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

      {/* Sticky Clickable Phase Navigation */}
      <div className="sticky top-14 z-30 py-2 bg-[#0a0e1a]/95 backdrop-blur">
        <div className="grid grid-cols-3 gap-1.5 p-1 rounded-2xl bg-white/[0.05]">
          {(
            [
              ["ban", `1. Ban (${allBans.length}/${bansPerTeam * 2})`, bansDone],
              ["pick", `2. Pick (${myPicks.length + enemyPicks.length}/10)`, picksDone],
              ["result", "3. Hasil", picksDone],
            ] as [Phase, string, boolean][]
          ).map(([k, label, done]) => (
            <button
              key={k}
              onClick={() => setPhase(k)}
              className={`py-2.5 px-2 rounded-xl text-xs font-bold transition ${
                phase === k
                  ? "bg-[#f4c430] text-black"
                  : done
                    ? "text-emerald-300 bg-emerald-500/10"
                    : "text-slate-400 hover:text-white"
              }`}
            >
              {done && phase !== k ? "✓ " : ""}
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ===== BAN PHASE ===== */}
      {phase === "ban" && (
        <div className="space-y-4">
          <div className="card p-4 border-[#f4c430]/20 space-y-3">
            <div>
              <h2 className="text-sm font-bold text-[#f4c430]">🚫 Prediksi Hero untuk Di-Ban</h2>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Prioritas ban untuk meta {tier} dan counter terhadap Hero Power {myPicks.length > 0 ? "& tim kamu" : "kamu"}.
              </p>
            </div>

            {heroPower.length === 0 && (
              <Link href="/hero-power" className="block rounded-xl border border-[#f4c430]/30 bg-[#f4c430]/10 p-3 text-xs text-[#f4c430]">
                💡 Isi My Hero Power dulu supaya sistem bisa memprediksi counter yang wajib kamu ban →
              </Link>
            )}

            <div className="space-y-2">
              {shownBanRecs.map((rec) => {
                const badgeColor =
                  rec.category === "MUST BAN"
                    ? "bg-red-500/20 text-red-300"
                    : rec.category === "PRIORITY BAN"
                      ? "bg-orange-500/20 text-orange-300"
                      : "bg-slate-500/20 text-slate-300";
                const myFull = myBans.length >= bansPerTeam;
                const actionLabel = !myFull ? "Ban" : enemyBans.length < bansPerTeam ? "+ Lawan" : "Penuh";
                return (
                  <RecRow
                    key={rec.hero.id}
                    hero={rec.hero}
                    badgeText={rec.category}
                    badgeColor={badgeColor}
                    score={rec.banScore}
                    reasons={rec.reasons}
                    actionLabel={actionLabel}
                    actionClassName="bg-rose-500/20 text-rose-200 hover:bg-rose-500/30"
                    actionDisabled={bansDone || allUsed.includes(rec.hero.id)}
                    onAction={() => quickBan(rec.hero.id)}
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
          </div>

          {/* Ban inputs */}
          <div className="card p-4 border-sky-500/20">
            <HeroPicker
              label={`🛡️ Ban tim kamu (${myBans.length}/${bansPerTeam})`}
              value={myBans}
              onChange={setMyBans}
              max={bansPerTeam}
              exclude={without(myBans)}
              accent="blue"
            />
          </div>

          <div className="card p-4 border-rose-500/20">
            <HeroPicker
              label={`🔴 Ban tim lawan (${enemyBans.length}/${bansPerTeam})`}
              value={enemyBans}
              onChange={setEnemyBans}
              max={bansPerTeam}
              exclude={without(enemyBans)}
              accent="red"
            />
          </div>

          {bansDone && (
            <div className="text-center text-xs text-emerald-300 font-semibold">
              ✓ Fase ban selesai! Lanjut ke fase pick untuk rekomendasi hero.
            </div>
          )}

          <button
            type="button"
            onClick={() => setPhase("pick")}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#f4c430] to-[#c99a2e] text-black font-bold active:scale-[0.98] transition"
          >
            Lanjut ke Fase Pick →
          </button>
        </div>
      )}

      {/* ===== PICK PHASE ===== */}
      {phase === "pick" && (
        <div className="space-y-4">
          {/* Missing lane checklist */}
          <div className="card p-3.5 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-200">📋 Kebutuhan Role Tim Kamu</span>
              <span className="text-slate-400">{myPicks.length}/5 hero</span>
            </div>
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
            <p className="text-[10px] text-slate-500">
              Ketuk salah satu role di atas untuk memfilter rekomendasi pick khusus lane tersebut.
            </p>
          </div>

          {/* Banned heroes summary */}
          {allBans.length > 0 && (
            <div className="card p-3">
              <p className="text-xs text-slate-400 mb-2">Hero yang di-ban ({allBans.length}):</p>
              <div className="flex flex-wrap gap-1.5">
                {allBans.map((id) => {
                  const h = getHeroById(id);
                  return h ? (
                    <div key={id} className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/5 opacity-60">
                      <HeroAvatar hero={h} size={20} />
                      <span className="text-[11px] text-slate-400 line-through">{h.name}</span>
                    </div>
                  ) : null;
                })}
              </div>
            </div>
          )}

          {/* Pick Recommendations */}
          {myPicks.length < 5 && (
            <div className="card p-4 border-[#f4c430]/20 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h2 className="text-sm font-bold text-[#f4c430]">⚡ Prediksi Hero untuk Di-Pick</h2>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {myPicks.length === 0
                      ? mySide === "blue"
                        ? "Kamu First Pick: prioritaskan hero meta fleksibel atau Hero Power terkuat."
                        : "Kamu Second Pick: perhatikan pick pertama lawan untuk langsung counter pick."
                      : `Pick ke-${myPicks.length + 1}: dihitung dari Hero Power, counter lawan, sinergi & role kosong.`}
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

              {heroPower.length === 0 && (
                <Link href="/hero-power" className="block rounded-xl border border-[#f4c430]/30 bg-[#f4c430]/10 p-3 text-xs text-[#f4c430]">
                  💡 Isi My Hero Power agar rekomendasi pick memprioritaskan hero andalanmu →
                </Link>
              )}

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
                      actionDisabled={myPicks.length >= 5 || allUsed.includes(rec.hero.id)}
                      onAction={() => quickPick(rec.hero.id)}
                    />
                  );
                })}
                {shownPickRecs.length === 0 && (
                  <p className="text-xs text-slate-400 text-center py-3">
                    Semua hero pada filter ini sudah terpakai atau di-ban.
                  </p>
                )}
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
            </div>
          )}

          {/* Enemy Next-Pick / Counter Threat Prediction */}
          {(enemyThreats.counterThreats.length > 0 || enemyThreats.synergyThreats.length > 0) && enemyPicks.length < 5 && (
            <div className="card p-4 border-orange-500/20 space-y-2.5">
              <div>
                <h2 className="text-xs font-bold text-orange-300">👁️ Prediksi Ancaman Pick Lawan Berikutnya</h2>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Lawan masih butuh:{" "}
                  {enemyThreats.enemyMissingLanes.map((l) => LANE_LABELS[l]).join(", ") || "Fleksibel"}.
                </p>
              </div>
              {enemyThreats.counterThreats.length > 0 && (
                <div className="space-y-1.5">
                  <div className="text-[11px] font-semibold text-rose-300">Waspada lawan pick counter tim kamu:</div>
                  <div className="flex flex-wrap gap-2">
                    {enemyThreats.counterThreats.map(({ hero, threatens }) => (
                      <div key={hero.id} className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-rose-500/10 border border-rose-500/20">
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
                      <div key={hero.id} className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
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

          {/* My Picks & Enemy Picks */}
          <div className="card p-4 border-sky-500/20">
            <HeroPicker
              label={`✅ Pick tim kamu (${myPicks.length}/5)`}
              value={myPicks}
              onChange={setMyPicks}
              max={5}
              exclude={without(myPicks)}
              accent="blue"
            />
          </div>

          <div className="card p-4 border-rose-500/20">
            <HeroPicker
              label={`🔴 Pick tim lawan (${enemyPicks.length}/5)`}
              value={enemyPicks}
              onChange={setEnemyPicks}
              max={5}
              exclude={without(enemyPicks)}
              accent="red"
            />
          </div>

          {/* Live team composition hint */}
          {myEval && (
            <div className="card p-3.5 border-emerald-500/15 space-y-1">
              <p className="text-xs font-bold text-emerald-300">📊 Status Komposisi Tim Kamu</p>
              <p className="text-[11px] text-slate-300 leading-snug">{myEval.winCondition}</p>
              {myEval.weaknesses.length > 0 && (
                <p className="text-[11px] text-amber-300">⚠️ {myEval.weaknesses[0]}</p>
              )}
            </div>
          )}

          <button
            type="button"
            onClick={() => setPhase("result")}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#f4c430] to-[#c99a2e] text-black font-bold active:scale-[0.98] transition"
          >
            Lihat Hasil &amp; Analisis Lengkap →
          </button>
        </div>
      )}

      {/* ===== RESULT / ANALYSIS PHASE ===== */}
      {phase === "result" && (
        <div className="space-y-4">
          <div className="card p-4 text-center">
            <p className="text-lg font-bold text-[#f4c430]">
              {picksDone ? "🎮 Draft Selesai!" : "📊 Ringkasan Draft Sementara"}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              {picksDone
                ? "Berikut perbandingan kekuatan, kombo terbaik, dan win condition kedua tim."
                : "Kamu tetap bisa kembali ke tab Ban/Pick untuk melengkapi atau mengubah hero."}
            </p>
          </div>

          {/* Teams side by side */}
          <div className="grid grid-cols-2 gap-3">
            <div className={`card p-3 ${mySide === "blue" ? "border-sky-500/20" : "border-rose-500/20"}`}>
              <p className={`text-xs font-bold mb-2 ${mySide === "blue" ? "text-sky-300" : "text-rose-300"}`}>
                Tim Kamu ({myPicks.length}/5)
              </p>
              <div className="space-y-1.5">
                {myPicks.length === 0 && <p className="text-[11px] text-slate-500">Belum ada pick</p>}
                {myPicks.map((id) => {
                  const h = getHeroById(id);
                  return h ? (
                    <div key={id} className="flex items-center gap-1.5">
                      <HeroAvatar hero={h} size={24} />
                      <span className="text-[11px] font-medium truncate">{h.name}</span>
                    </div>
                  ) : null;
                })}
              </div>
            </div>
            <div className={`card p-3 ${mySide === "blue" ? "border-rose-500/20" : "border-sky-500/20"}`}>
              <p className={`text-xs font-bold mb-2 ${mySide === "blue" ? "text-rose-300" : "text-sky-300"}`}>
                Tim Lawan ({enemyPicks.length}/5)
              </p>
              <div className="space-y-1.5">
                {enemyPicks.length === 0 && <p className="text-[11px] text-slate-500">Belum ada pick</p>}
                {enemyPicks.map((id) => {
                  const h = getHeroById(id);
                  return h ? (
                    <div key={id} className="flex items-center gap-1.5">
                      <HeroAvatar hero={h} size={24} />
                      <span className="text-[11px] font-medium truncate">{h.name}</span>
                    </div>
                  ) : null;
                })}
              </div>
            </div>
          </div>

          {/* Phase & advantage comparison */}
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

          {/* Detailed Team Cards */}
          <div className="space-y-3">
            {myEval && (
              <TeamPhaseCard
                title={`${mySide === "blue" ? "🔵" : "🔴"} Evaluasi Tim Kamu`}
                ev={myEval}
                tone={mySide}
              />
            )}
            {enemyEval && (
              <TeamPhaseCard
                title={`${mySide === "blue" ? "🔴" : "🔵"} Evaluasi Tim Lawan`}
                ev={enemyEval}
                tone={mySide === "blue" ? "red" : "blue"}
              />
            )}
          </div>

          {/* Best Combos for your draft */}
          <section className="space-y-2">
            <div>
              <h2 className="text-sm font-bold">🔗 Rekomendasi Kombo Tim</h2>
              <p className="text-xs text-slate-500">Strategi eksekusi paling cocok berdasarkan pick kamu &amp; lawan.</p>
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
    </div>
  );
}
