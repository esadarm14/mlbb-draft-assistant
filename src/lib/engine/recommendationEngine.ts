import type {
  Hero,
  HeroPowerItem,
  HeroRecommendation,
  CounterBreakdown,
  TeamPhaseEvaluation,
  PhaseStrength,
  Lane,
  MasteryLevel,
  RankTier,
  DraftMode,
} from '../types';
import { MLBB_HEROES, getHeroById } from '../database/heroesData';
import { getHeroMetaStats, type MetaTier } from '../database/metaData';

export interface ScoringWeights {
  counter: number; // default 0.25
  heroPower: number; // default 0.25
  synergy: number; // default 0.20
  roleFit: number; // default 0.10
  gamePhase: number; // default 0.10
  objective: number; // default 0.10
}

export const DEFAULT_WEIGHTS: ScoringWeights = {
  counter: 0.25,
  heroPower: 0.25,
  synergy: 0.20,
  roleFit: 0.10,
  gamePhase: 0.10,
  objective: 0.10,
};

const MASTERY_SCORES: Record<MasteryLevel, number> = {
  'Main Hero': 100,
  'Highly Mastered': 85,
  'Comfortable': 70,
  'Backup Hero': 55,
};

const ALL_LANES: Lane[] = ['Jungle', 'Gold Lane', 'Mid Lane', 'EXP Lane', 'Roam'];

export const LANE_LABELS: Record<Lane, string> = {
  'Jungle': 'Jungler',
  'Gold Lane': 'Gold Lane',
  'Mid Lane': 'Mid Lane',
  'EXP Lane': 'EXP Lane',
  'Roam': 'Roamer',
};

function isCounterMatch(attacker: Hero, target: Hero): boolean {
  return attacker.keyCounters.includes(target.id) || target.counteredBy.includes(attacker.id);
}

function hasSynergy(a: Hero, b: Hero): boolean {
  return a.id !== b.id && (a.synergyWith.includes(b.id) || b.synergyWith.includes(a.id));
}

/**
 * Assigns each picked hero to at most one MLBB lane (constrained heroes first)
 * so flex picks do not falsely consume multiple lanes simultaneously.
 */
export function getMissingLanes(heroes: Hero[]): Lane[] {
  if (heroes.length === 0) return [...ALL_LANES];
  const open = new Set<Lane>(ALL_LANES);
  const sorted = [...heroes].sort((a, b) => a.lanes.length - b.lanes.length);
  for (const hero of sorted) {
    const match = hero.lanes.find((l) => open.has(l));
    if (match) open.delete(match);
  }
  return ALL_LANES.filter((l) => open.has(l));
}

// ============================================================
// BAN RECOMMENDATION ENGINE
// ============================================================
export interface BanRecommendation {
  hero: Hero;
  banScore: number; // 0-100
  reasons: string[];
  category: 'MUST BAN' | 'PRIORITY BAN' | 'SITUATIONAL BAN';
  metaTier: MetaTier;
  banRate: number;
  winRate: number;
  sourceLabel: string;
}

export function generateBanRecommendations(
  unavailableIds: string[],
  userHeroPower: HeroPowerItem[],
  tier: RankTier,
  myPicks: string[] = [],
  enemyPicks: string[] = [],
  limit = 10,
  mode: DraftMode = 'Ranked Draft'
): BanRecommendation[] {
  const unavailable = new Set([...unavailableIds, ...myPicks, ...enemyPicks].map((s) => s.toLowerCase()));
  const candidates = MLBB_HEROES.filter((h) => !unavailable.has(h.id.toLowerCase()));

  const myHeroes = myPicks.map((id) => getHeroById(id)).filter((h): h is Hero => !!h);
  const enemyHeroes = enemyPicks.map((id) => getHeroById(id)).filter((h): h is Hero => !!h);

  const heroPowerMap = new Map<string, HeroPowerItem>();
  for (const item of userHeroPower) {
    heroPowerMap.set(item.heroId.toLowerCase(), item);
  }

  const isMythicPlus = ['Mythic', 'Mythical Honor', 'Mythical Glory', 'Mythical Immortal'].includes(tier);

  const scored: BanRecommendation[] = candidates.map((hero) => {
    let banScore = 0;
    const reasons: string[] = [];
    const meta = getHeroMetaStats(hero.id, tier, mode);

    // 1. Real Meta Ban Rate & Tier Priority (up to 42 pts)
    const metaTierPts =
      meta.metaTier === 'S+' ? 18 : meta.metaTier === 'S' ? 12 : meta.metaTier === 'A' ? 6 : 2;
    const banRatePts = Math.min(24, (meta.banRate / 85) * 24);
    banScore += metaTierPts + banRatePts;
    if (meta.banRate >= 25 || meta.metaTier === 'S+' || meta.metaTier === 'S') {
      reasons.push(`Meta ${meta.metaTier} (Ban Rate ${meta.banRate}% · WR ${meta.winRate}%): ${meta.metaReason}`);
    }

    // 2. Base OP potential (offense + control + durability, up to 18 pts)
    const opScore = (hero.offense * 0.45 + hero.controlEffect * 0.35 + hero.durability * 0.2) / 10;
    banScore += opScore * 18;

    // 3. Urgent threat against already-picked allies (useful in ban phase 2 / mid-draft)
    let teamCounterThreat = 0;
    for (const ally of myHeroes) {
      if (isCounterMatch(hero, ally)) {
        teamCounterThreat += 22;
        reasons.unshift(`Meng-counter ${ally.name} yang sudah kamu pick`);
      }
    }
    banScore += Math.min(36, teamCounterThreat);

    // 4. Threat against user's Hero Power pool (weighted by mastery level)
    let hpThreat = 0;
    for (const hpItem of userHeroPower) {
      const hpHero = getHeroById(hpItem.heroId);
      if (hpHero && isCounterMatch(hero, hpHero)) {
        const w =
          hpItem.masteryLevel === 'Main Hero'
            ? 14
            : hpItem.masteryLevel === 'Highly Mastered'
              ? 11
              : hpItem.masteryLevel === 'Comfortable'
                ? 8
                : 5;
        hpThreat += w;
        reasons.push(`Counter hero andalan kamu (${hpHero.name})`);
      }
    }
    banScore += Math.min(26, hpThreat);

    // 5. Dangerous synergy with already-picked enemies
    for (const enemy of enemyHeroes) {
      if (hasSynergy(hero, enemy)) {
        banScore += 12;
        reasons.unshift(`Kombo berbahaya dengan ${enemy.name} lawan`);
        break;
      }
    }

    // 6. Meta strength by rank tier
    if (isMythicPlus && hero.roles.includes('Assassin') && hero.difficulty >= 7) {
      banScore += 6;
    }
    if (!isMythicPlus && hero.difficulty <= 4 && hero.offense >= 7) {
      banScore += 6;
    }

    // 7. High crowd control & flex threat
    if (hero.controlEffect >= 8) {
      banScore += 4;
    }
    if (hero.roles.length >= 2 && hero.lanes.length >= 2) {
      banScore += 3;
    }

    // 8. Avoid banning your own Hero Power unless it hard-counters an already picked ally
    if (heroPowerMap.has(hero.id.toLowerCase()) && teamCounterThreat === 0) {
      banScore -= 24;
    }

    const finalScore = Math.round(Math.max(0, Math.min(100, banScore)));

    let category: BanRecommendation['category'] = 'SITUATIONAL BAN';
    if (finalScore >= 64 || meta.metaTier === 'S+') category = 'MUST BAN';
    else if (finalScore >= 46 || meta.metaTier === 'S') category = 'PRIORITY BAN';

    const uniqueReasons = Array.from(new Set(reasons));
    if (uniqueReasons.length === 0) {
      uniqueReasons.push(meta.metaReason);
    }

    return {
      hero,
      banScore: finalScore,
      reasons: uniqueReasons,
      category,
      metaTier: meta.metaTier,
      banRate: meta.banRate,
      winRate: meta.winRate,
      sourceLabel: meta.sourceLabel,
    };
  });

  const catWeight: Record<BanRecommendation['category'], number> = {
    'MUST BAN': 3,
    'PRIORITY BAN': 2,
    'SITUATIONAL BAN': 1,
  };

  return scored
    .sort(
      (a, b) =>
        catWeight[b.category] - catWeight[a.category] ||
        b.banScore - a.banScore ||
        b.banRate - a.banRate
    )
    .slice(0, limit);
}

// ============================================================
// PICK RECOMMENDATION ENGINE
// ============================================================
export interface PickRecommendation {
  hero: Hero;
  pickScore: number;
  reasons: string[];
  category: 'BEST PICK' | 'COUNTER PICK' | 'SAFE PICK';
  missingRole?: string;
  isHeroPower?: boolean;
  masteryLevel?: MasteryLevel;
  metaTier: MetaTier;
  winRate: number;
  banRate: number;
}

export interface PickRecommendationOptions {
  tier?: RankTier;
  mode?: DraftMode;
  mySide?: 'blue' | 'red';
  laneFilter?: Lane | null;
  limit?: number;
}

export function generatePickRecommendations(
  myPicks: string[],
  enemyPicks: string[],
  allBans: string[],
  userHeroPower: HeroPowerItem[],
  options: PickRecommendationOptions = {}
): PickRecommendation[] {
  const { tier = 'Mythic', mode = 'Ranked Draft', mySide = 'blue', laneFilter = null, limit = 10 } = options;
  const unavailable = new Set([...myPicks, ...enemyPicks, ...allBans].map((s) => s.toLowerCase()));
  const candidates = MLBB_HEROES.filter(
    (h) => !unavailable.has(h.id.toLowerCase()) && (!laneFilter || h.lanes.includes(laneFilter))
  );

  const myHeroes = myPicks.map((id) => getHeroById(id)).filter((h): h is Hero => !!h);
  const enemyHeroes = enemyPicks.map((id) => getHeroById(id)).filter((h): h is Hero => !!h);

  const heroPowerMap = new Map<string, HeroPowerItem>();
  for (const item of userHeroPower) {
    heroPowerMap.set(item.heroId.toLowerCase(), item);
  }

  const missingLanes = getMissingLanes(myHeroes);
  const missingSet = new Set<Lane>(missingLanes);
  const needFrontline = !myHeroes.some((h) => h.roles.includes('Tank') || h.durability >= 8);
  const needMagicDmg = !myHeroes.some((h) => h.damageType === 'Magic' || h.damageType === 'Mixed');
  const needPhysicalDmg = !myHeroes.some((h) => h.damageType === 'Physical' || h.damageType === 'Mixed');
  const avgCC = myHeroes.length > 0 ? myHeroes.reduce((a, h) => a + h.controlEffect, 0) / myHeroes.length : 0;
  const needCC = myHeroes.length > 0 && avgCC < 5.5;
  const isMythicPlus = ['Mythic', 'Mythical Honor', 'Mythical Glory', 'Mythical Immortal'].includes(tier);

  const scored: PickRecommendation[] = candidates.map((hero) => {
    let pickScore = 0;
    const reasons: string[] = [];
    let missingRole: string | undefined;

    // 1. Hero Power mastery (up to 28 pts)
    const hpItem = heroPowerMap.get(hero.id.toLowerCase());
    const isHP = !!hpItem;
    if (hpItem) {
      pickScore += MASTERY_SCORES[hpItem.masteryLevel] / 4; // 13.75 - 25
      if (myHeroes.length === 0 || missingSet.has(hpItem.primaryLane)) {
        pickScore += 3;
      }
      reasons.push(`Hero andalan kamu (${hpItem.masteryLevel})`);
    }

    // 2. Lane / Role fit (prevents double Jungler / double Gold Laner)
    let isDuplicateRole = false;
    if (myHeroes.length > 0 && myHeroes.length < 5 && missingLanes.length > 0) {
      const primaryOpen = hero.lanes[0] && missingSet.has(hero.lanes[0]);
      const anyOpen = hero.lanes.find((l) => missingSet.has(l));
      if (primaryOpen) {
        pickScore += 22;
        missingRole = LANE_LABELS[hero.lanes[0]];
        reasons.push(`Mengisi posisi ${missingRole} yang kosong`);
      } else if (anyOpen) {
        pickScore += 17;
        missingRole = LANE_LABELS[anyOpen];
        reasons.push(`Bisa mengisi ${missingRole} yang kosong`);
      } else {
        isDuplicateRole = true;
        pickScore -= 22;
        reasons.push(`Posisi ${hero.lanes.map((l) => LANE_LABELS[l]).join('/')} sudah terisi di tim`);
      }
    } else if (hero.lanes[0]) {
      missingRole = LANE_LABELS[hero.lanes[0]];
    }

    // 3. First-pick priority & safety when no allies picked yet
    if (myHeroes.length === 0) {
      const metaBase = ((hero.offense * 0.45 + hero.controlEffect * 0.35 + hero.durability * 0.2) / 10) * 18;
      pickScore += metaBase;
      if (hero.earlyStrength === 'Strong') pickScore += 3;
      if (hero.lateStrength === 'Strong') pickScore += 2;
      if (hero.lanes.length >= 2 || hero.roles.length >= 2) {
        pickScore += mySide === 'blue' ? 12 : 8;
        reasons.push(mySide === 'blue' ? 'Fleksibel multi-role, aman untuk first pick' : 'Hero fleksibel untuk menyesuaikan komposisi');
      }
      if (hero.counteredBy.length <= 2) {
        pickScore += mySide === 'blue' ? 8 : 5;
        reasons.push('Sulit di-counter di awal draft');
      }
      if (hero.offense >= 7 && hero.controlEffect >= 5) {
        reasons.push('Impact damage & utilitas tinggi di meta');
      }
    }

    // 4. Team composition damage/frontline/CC balance
    if (myHeroes.length > 0) {
      let balancePts = 0;
      if (needFrontline && (hero.roles.includes('Tank') || hero.durability >= 8)) {
        balancePts += 8;
        reasons.push('Menjadi frontline penahan damage tim');
      }
      if (needMagicDmg && (hero.damageType === 'Magic' || hero.damageType === 'Mixed')) {
        balancePts += 6;
        reasons.push('Melengkapi magic damage tim');
      }
      if (needPhysicalDmg && (hero.damageType === 'Physical' || hero.damageType === 'Mixed')) {
        balancePts += 5;
      }
      if (needCC && hero.controlEffect >= 7) {
        balancePts += 5;
        reasons.push('Menambah crowd control teamfight');
      }
      pickScore += Math.min(14, balancePts);
    }

    // 5. Counter matchups vs enemy picks (symmetric lookup)
    let counterPts = 0;
    for (const enemy of enemyHeroes) {
      if (isCounterMatch(hero, enemy)) {
        counterPts += 14;
        reasons.push(`Counter ${enemy.name}`);
      }
      if (isCounterMatch(enemy, hero)) {
        counterPts -= 12;
        reasons.push(`Waspada: tertekan oleh ${enemy.name}`);
      }
    }
    pickScore += Math.max(-18, Math.min(28, counterPts));

    // 6. Synergy with allies (symmetric lookup)
    let synPts = 0;
    for (const ally of myHeroes) {
      if (hasSynergy(hero, ally)) {
        synPts += 9;
        reasons.push(`Sinergi kuat dengan ${ally.name}`);
      }
    }
    pickScore += Math.min(16, synPts);

    // 7. Base hero impact, meta tier & tier-relevant phase fit
    const meta = getHeroMetaStats(hero.id, tier, mode);
    const metaBonus = meta.metaTier === 'S+' ? 8 : meta.metaTier === 'S' ? 5 : meta.metaTier === 'A' ? 2 : 0;
    pickScore += metaBonus;
    if (meta.metaTier === 'S+' || meta.metaTier === 'S') {
      reasons.push(`Meta ${meta.metaTier} (WR ${meta.winRate}%) di ${mode === 'Tournament Draft' ? 'Turnamen' : tier}`);
    }
    const statQuality = ((hero.offense + hero.controlEffect + hero.durability) / 30) * 6;
    pickScore += statQuality;
    if (isMythicPlus && hero.earlyStrength === 'Strong') pickScore += 2;
    if (!isMythicPlus && hero.lateStrength === 'Strong') pickScore += 2;
    if (hero.midStrength === 'Strong') pickScore += 2;

    const finalScore = Math.round(Math.max(0, Math.min(100, pickScore)));

    let category: PickRecommendation['category'] = 'SAFE PICK';
    if (!isDuplicateRole) {
      if (counterPts >= 14 && (!isHP || counterPts >= 28)) {
        category = 'COUNTER PICK';
      } else if (finalScore >= 48 || (isHP && finalScore >= 40)) {
        category = 'BEST PICK';
      } else if (counterPts >= 14) {
        category = 'COUNTER PICK';
      }
    }

    const uniqueReasons = Array.from(new Set(reasons));
    if (uniqueReasons.length === 0) {
      uniqueReasons.push('Pilihan solid sesuai kebutuhan tim');
    }

    return {
      hero,
      pickScore: finalScore,
      reasons: uniqueReasons,
      category,
      missingRole,
      isHeroPower: isHP,
      masteryLevel: hpItem?.masteryLevel,
      metaTier: meta.metaTier,
      winRate: meta.winRate,
      banRate: meta.banRate,
    };
  });

  const scoredWithRoleRank = scored.map((rec) => {
    const isDup = rec.reasons.some((r) => r.includes('sudah terisi di tim'));
    const catRank = rec.category === 'BEST PICK' ? 3 : rec.category === 'COUNTER PICK' ? 2 : 1;
    return { rec, isDup, catRank };
  });

  return scoredWithRoleRank
    .sort(
      (a, b) =>
        Number(a.isDup) - Number(b.isDup) ||
        b.catRank - a.catRank ||
        b.rec.pickScore - a.rec.pickScore ||
        b.rec.winRate - a.rec.winRate
    )
    .map((x) => x.rec)
    .slice(0, limit);
}

// ============================================================
// ENEMY THREAT & NEXT-PICK PREDICTION
// ============================================================
export interface EnemyThreatPrediction {
  counterThreats: Array<{ hero: Hero; threatens: string[] }>;
  synergyThreats: Array<{ hero: Hero; comboWith: string[] }>;
  enemyMissingLanes: Lane[];
}

export function predictEnemyThreats(
  myPicks: string[],
  enemyPicks: string[],
  allBans: string[]
): EnemyThreatPrediction {
  const unavailable = new Set([...myPicks, ...enemyPicks, ...allBans].map((s) => s.toLowerCase()));
  const available = MLBB_HEROES.filter((h) => !unavailable.has(h.id.toLowerCase()));

  const myHeroes = myPicks.map((id) => getHeroById(id)).filter((h): h is Hero => !!h);
  const enemyHeroes = enemyPicks.map((id) => getHeroById(id)).filter((h): h is Hero => !!h);
  const enemyMissingLanes = getMissingLanes(enemyHeroes);
  const enemyOpenSet = new Set<Lane>(enemyMissingLanes);

  // Only consider heroes that fit enemy's still-open lanes when enemy still has slots left
  const realisticEnemyPool =
    enemyMissingLanes.length > 0 && enemyHeroes.length < 5
      ? available.filter((h) => h.lanes.some((l) => enemyOpenSet.has(l)))
      : available;

  const counterThreats = realisticEnemyPool
    .map((candidate) => {
      const threatens = myHeroes.filter((ally) => isCounterMatch(candidate, ally)).map((ally) => ally.name);
      return { hero: candidate, threatens };
    })
    .filter((t) => t.threatens.length > 0)
    .sort((a, b) => b.threatens.length - a.threatens.length || b.hero.offense - a.hero.offense)
    .slice(0, 3);

  const synergyThreats = realisticEnemyPool
    .map((candidate) => {
      const comboWith = enemyHeroes.filter((e) => hasSynergy(candidate, e)).map((e) => e.name);
      return { hero: candidate, comboWith };
    })
    .filter((t) => t.comboWith.length > 0)
    .sort((a, b) => b.comboWith.length - a.comboWith.length || b.hero.controlEffect - a.hero.controlEffect)
    .slice(0, 3);

  return { counterThreats, synergyThreats, enemyMissingLanes };
}

// ============================================================
// LIVE STEP-BY-STEP BRIEFING
// ============================================================
export interface DraftLogEntry {
  stepIndex: number;
  action: 'ban' | 'pick';
  actor: 'me' | 'enemy';
  heroId: string;
}

export interface StepBriefing {
  headline: string;
  impacts: string[];
  opportunity: string;
  tone: 'info' | 'warning' | 'opportunity';
}

export function buildStepBriefing(
  lastEntry: DraftLogEntry | undefined,
  userHeroPower: HeroPowerItem[],
  allBans: string[],
  tier: RankTier,
  mode: DraftMode
): StepBriefing | null {
  if (!lastEntry) return null;
  const hero = getHeroById(lastEntry.heroId);
  if (!hero) return null;

  const meta = getHeroMetaStats(hero.id, tier, mode);
  const impacts: string[] = [];
  let tone: StepBriefing['tone'] = 'info';

  const isMyHeroPower = userHeroPower.some((hp) => hp.heroId.toLowerCase() === hero.id.toLowerCase());
  const unavailable = new Set(allBans.map((id) => id.toLowerCase()));

  if (lastEntry.actor === 'enemy' && lastEntry.action === 'ban') {
    if (isMyHeroPower) {
      impacts.push(`Hero Power kamu (${hero.name}) terkena ban lawan — siapkan backup di lane ${hero.lanes.map((l) => LANE_LABELS[l]).join('/')}.`);
      tone = 'warning';
    } else {
      impacts.push(`${hero.name} (Meta ${meta.metaTier} · Ban Rate ${meta.banRate}%) dikeluarkan dari draft.`);
    }

    // Heroes that this banned hero used to counter are now safer!
    const freedTargets = hero.keyCounters
      .filter((id) => !unavailable.has(id.toLowerCase()))
      .map((id) => getHeroById(id)?.name)
      .filter((n): n is string => !!n)
      .slice(0, 3);

    const opportunity =
      freedTargets.length > 0
        ? `Peluang terbuka: tanpa ${hero.name}, hero seperti ${freedTargets.join(', ')} lebih leluasa dimainkan. Cek opsi kombo di bawah!`
        : `Lawan mengurangi opsi ${hero.roles.join('/')} di draft — manfaatkan celah ini untuk mengatur kombo tim.`;

    if (freedTargets.length > 0 && tone !== 'warning') tone = 'opportunity';

    return {
      headline: `Lawan baru saja mem-ban ${hero.name}`,
      impacts,
      opportunity,
      tone,
    };
  }

  if (lastEntry.actor === 'enemy' && lastEntry.action === 'pick') {
    const counters = MLBB_HEROES.filter(
      (c) => !unavailable.has(c.id.toLowerCase()) && isCounterMatch(c, hero)
    )
      .slice(0, 3)
      .map((c) => c.name);

    impacts.push(`Lawan mengamankan ${hero.name} (${hero.roles.join('/')} · ${hero.lanes[0] ?? 'Flex'}).`);
    if (hero.controlEffect >= 7) {
      impacts.push('Waspada crowd control tinggi lawan saat teamfight.');
    }

    const opportunity =
      counters.length > 0
        ? `Rekomendasi counter langsung: ${counters.join(', ')}. Kamu juga bisa memilih kombo di bawah untuk melawan gaya main ${hero.name}.`
        : `Sesuaikan pick dan kombo tim untuk menekan fase kuat ${hero.name}.`;

    return {
      headline: `Lawan baru saja pick ${hero.name}`,
      impacts,
      opportunity,
      tone: 'warning',
    };
  }

  return {
    headline: `Kamu ${lastEntry.action === 'ban' ? 'mem-ban' : 'memilih'} ${hero.name}`,
    impacts: [`Meta ${meta.metaTier} · WR ${meta.winRate}% · ${hero.roles.join('/')}.`],
    opportunity:
      lastEntry.action === 'ban'
        ? 'Lanjutkan memantau ban lawan atau bersiap masuk fase pick.'
        : 'Komposisi tim dan rekomendasi kombo telah diperbarui otomatis.',
    tone: 'info',
  };
}

// ============================================================
// EXISTING FUNCTIONS (PRESERVED)
// ============================================================

// 1. CALCULATE TEAM PHASE EVALUATION & WIN CONDITION
export function evaluateTeamComposition(heroIds: string[]): TeamPhaseEvaluation {
  const heroes = heroIds.map((id) => getHeroById(id)).filter((h): h is Hero => !!h);

  if (heroes.length === 0) {
    return {
      early: 'Average',
      mid: 'Average',
      late: 'Average',
      earlyScore: 50,
      midScore: 50,
      lateScore: 50,
      teamFightAdvantage: false,
      objectiveAdvantage: false,
      splitPushAdvantage: false,
      frontlineAdequate: false,
      magicPhysicalBalance: 'Balanced',
      ccRating: 'Medium',
      strengths: ['Draft belum dimulai.'],
      weaknesses: ['Belum ada hero yang dipilih.'],
      winCondition: 'Pilih hero untuk melihat evaluasi fase dan win condition.',
    };
  }

  const phaseScore = (phase: 'earlyStrength' | 'midStrength' | 'lateStrength') => {
    let total = 0;
    for (const h of heroes) {
      if (h[phase] === 'Strong') total += 100;
      else if (h[phase] === 'Average') total += 70;
      else total += 40;
    }
    return Math.round(total / heroes.length);
  };

  const earlyScore = phaseScore('earlyStrength');
  const midScore = phaseScore('midStrength');
  const lateScore = phaseScore('lateStrength');

  const toPhase = (score: number): PhaseStrength => {
    if (score >= 80) return 'Strong';
    if (score >= 60) return 'Average';
    return 'Weak';
  };

  const early = toPhase(earlyScore);
  const mid = toPhase(midScore);
  const late = toPhase(lateScore);

  const physicalCount = heroes.filter((h) => h.damageType === 'Physical').length;
  const magicCount = heroes.filter((h) => h.damageType === 'Magic').length;
  let magicPhysicalBalance: 'Balanced' | 'Heavy Physical' | 'Heavy Magic' = 'Balanced';
  if (physicalCount >= 4) magicPhysicalBalance = 'Heavy Physical';
  else if (magicCount >= 3) magicPhysicalBalance = 'Heavy Magic';

  const frontlineCount = heroes.filter((h) => h.roles.includes('Tank') || (h.roles.includes('Fighter') && h.durability >= 8)).length;
  const frontlineAdequate = frontlineCount >= 1;

  const avgCC = heroes.reduce((acc, h) => acc + h.controlEffect, 0) / heroes.length;
  const ccRating = avgCC >= 7.5 ? 'High' : avgCC >= 5.5 ? 'Medium' : 'Low';

  const hasHighObjJungler = heroes.some((h) => ['martis', 'baxia', 'fredrinn', 'barats'].includes(h.id));
  const objectiveAdvantage = hasHighObjJungler || earlyScore >= 75;

  const hasSplitPusher = heroes.some((h) => ['masha', 'hayabusa', 'ling', 'chou', 'sun', 'zilong'].includes(h.id));
  const splitPushAdvantage = hasSplitPusher && lateScore >= 65;

  const teamFightAdvantage = frontlineAdequate && ccRating === 'High';

  const strengths: string[] = [];
  const weaknesses: string[] = [];

  if (early === 'Strong') strengths.push('Dominasi laning phase dan kontrol Turtle awal yang sangat agresif.');
  if (mid === 'Strong') strengths.push('Power spike team fight sangat kuat di menit 6-12.');
  if (late === 'Strong') strengths.push('Kekuatan scaling Lord dan teamfight late game luar biasa.');
  if (frontlineAdequate) strengths.push(`Frontline solid (${frontlineCount} hero baris depan penahan damage).`);
  else weaknesses.push('Kurang hero frontline (tank/fighter tebal), backline rentan di-dive.');
  if (magicPhysicalBalance !== 'Balanced') weaknesses.push(`Komposisi ${magicPhysicalBalance}: musuh mudah melakukan counter item defense.`);
  if (ccRating === 'Low') weaknesses.push('Crowd control minim; sulit menghentikan assassin lincah atau inisiasi musuh.');

  let winCondition = '';
  if (early === 'Strong' && late !== 'Strong') {
    winCondition = 'WIN CONDITION: EARLY SNOWBALL. Amankan First Blood dan Turtle pertama, invasi jungle musuh, hancurkan outer turret sebelum menit 8.';
  } else if (late === 'Strong' && early !== 'Strong') {
    winCondition = 'WIN CONDITION: LATE GAME SCALING. Bermain disiplin, hindari kontes early. Lindungi carry hingga item core selesai.';
  } else if (teamFightAdvantage) {
    winCondition = 'WIN CONDITION: 5v5 TEAMFIGHT. Paksa pertempuran 5v5 di koridor sempit atau pit Turtle/Lord.';
  } else if (splitPushAdvantage) {
    winCondition = 'WIN CONDITION: SPLIT PUSH. Terapkan strategi 4-1 atau 1-3-1 untuk merobek turret.';
  } else {
    winCondition = 'WIN CONDITION: TEMPO & PICK OFF. Cari eliminasi tunggal sebelum memulai pertarungan objektif.';
  }

  return {
    early,
    mid,
    late,
    earlyScore,
    midScore,
    lateScore,
    teamFightAdvantage,
    objectiveAdvantage,
    splitPushAdvantage,
    frontlineAdequate,
    magicPhysicalBalance,
    ccRating,
    strengths,
    weaknesses,
    winCondition,
  };
}

// 2. SMART HERO POWER RECOMMENDATIONS & COUNTER PICKS
export function generateDraftRecommendations(
  alliedHeroIds: string[],
  enemyHeroIds: string[],
  bannedHeroIds: string[],
  userHeroPower: HeroPowerItem[],
  weights: ScoringWeights = DEFAULT_WEIGHTS
): {
  bestHeroPower: HeroRecommendation[];
  bestCounters: HeroRecommendation[];
  allRecommendations: HeroRecommendation[];
} {
  const unavailable = new Set([...alliedHeroIds, ...enemyHeroIds, ...bannedHeroIds].map((s) => s.toLowerCase()));
  const candidateHeroes = MLBB_HEROES.filter((h) => !unavailable.has(h.id.toLowerCase()));

  const alliedHeroes = alliedHeroIds.map((id) => getHeroById(id)).filter((h): h is Hero => !!h);
  const enemyHeroes = enemyHeroIds.map((id) => getHeroById(id)).filter((h): h is Hero => !!h);

  const heroPowerMap = new Map<string, HeroPowerItem>();
  for (const item of userHeroPower) {
    heroPowerMap.set(item.heroId.toLowerCase(), item);
  }

  const needsFrontline = !alliedHeroes.some((h) => h.roles.includes('Tank') || h.durability >= 8);
  const needsMagic = !alliedHeroes.some((h) => h.damageType === 'Magic');
  const needsPhysical = !alliedHeroes.some((h) => h.damageType === 'Physical');

  const evaluated: HeroRecommendation[] = candidateHeroes.map((hero) => {
    const isHeroPower = heroPowerMap.has(hero.id.toLowerCase());
    const hpItem = heroPowerMap.get(hero.id.toLowerCase());

    let counterAdvantage = 50;
    const reasons: string[] = [];
    const pros: string[] = [];
    const cons: string[] = [];
    const risks: string[] = [];

    for (const enemy of enemyHeroes) {
      if (isCounterMatch(hero, enemy)) {
        counterAdvantage += 20;
        reasons.push(`Meng-counter langsung ${enemy.name}`);
        pros.push(`Efektif menekan ${enemy.name}.`);
      }
      if (isCounterMatch(enemy, hero)) {
        counterAdvantage -= 20;
        cons.push(`Rentan terhadap ${enemy.name}.`);
        risks.push(`Waspadai ganking dari ${enemy.name}.`);
      }
    }
    const counterScore = Math.max(10, Math.min(100, counterAdvantage));

    let heroPowerScore = 30;
    if (isHeroPower && hpItem) {
      heroPowerScore = MASTERY_SCORES[hpItem.masteryLevel] || 70;
      reasons.push(`Hero Power andalan (${hpItem.masteryLevel})`);
    }

    let synergyTotal = 50;
    for (const ally of alliedHeroes) {
      if (hasSynergy(hero, ally)) {
        synergyTotal += 18;
        reasons.push(`Sinergi kuat dengan ${ally.name}`);
      }
    }
    const synergyScore = Math.max(20, Math.min(100, synergyTotal));

    let roleFitScore = 60;
    if (needsFrontline && (hero.roles.includes('Tank') || hero.durability >= 8)) {
      roleFitScore += 30;
      reasons.push('Mengisi kebutuhan frontline tim');
    }
    if (needsMagic && hero.damageType === 'Magic') {
      roleFitScore += 20;
      reasons.push('Melengkapi damage magic tim');
    }
    if (needsPhysical && hero.damageType === 'Physical') roleFitScore += 20;
    roleFitScore = Math.min(100, roleFitScore);

    let phaseScore = 65;
    if (hero.midStrength === 'Strong') phaseScore += 15;
    if (hero.lateStrength === 'Strong') phaseScore += 10;
    phaseScore = Math.min(100, phaseScore);

    let objectiveScore = 55;
    if (hero.lanes.includes('Jungle') || hero.specialties.includes('Burst') || hero.specialties.includes('Control')) {
      objectiveScore += 25;
    }
    objectiveScore = Math.min(100, objectiveScore);

    const totalScore = Math.round(
      counterScore * weights.counter +
        heroPowerScore * weights.heroPower +
        synergyScore * weights.synergy +
        roleFitScore * weights.roleFit +
        phaseScore * weights.gamePhase +
        objectiveScore * weights.objective
    );

    let category: 'BEST HERO POWER' | 'BEST COUNTER PICK' | 'ALTERNATIVE PICK' = 'ALTERNATIVE PICK';
    if (isHeroPower && (hpItem?.masteryLevel === 'Main Hero' || hpItem?.masteryLevel === 'Highly Mastered' || totalScore >= 70)) {
      category = 'BEST HERO POWER';
    } else if (counterScore >= 65) {
      category = 'BEST COUNTER PICK';
    }

    if (cons.length === 0) cons.push('Membutuhkan positioning yang tepat.');
    if (risks.length === 0) risks.push('Pastikan tidak terisolasi dari rekan.');

    return {
      hero,
      category,
      totalScore,
      counterScore,
      heroPowerScore,
      synergyScore,
      roleFitScore,
      phaseScore,
      objectiveScore,
      reasons: reasons.length > 0 ? reasons : ['Pilihan fleksibel sesuai komposisi.'],
      isHeroPower,
      masteryLevel: hpItem?.masteryLevel,
      pros,
      cons,
      risks,
    };
  });

  evaluated.sort((a, b) => b.totalScore - a.totalScore);

  return {
    bestHeroPower: evaluated.filter((r) => r.isHeroPower).slice(0, 5),
    bestCounters: evaluated.filter((r) => r.counterScore >= 60).sort((a, b) => b.counterScore - a.counterScore).slice(0, 5),
    allRecommendations: evaluated.slice(0, 10),
  };
}

// 3. CONTEXTUAL COUNTER ANALYZER
export function analyzeEnemyCounters(enemyHeroIds: string[], userHeroPower: HeroPowerItem[]): CounterBreakdown[] {
  const enemyHeroes = enemyHeroIds.map((id) => getHeroById(id)).filter((h): h is Hero => !!h);
  if (enemyHeroes.length === 0) return [];

  const heroPowerIds = new Set(userHeroPower.map((h) => h.heroId.toLowerCase()));
  const heroPowerMap = new Map<string, MasteryLevel>();
  for (const hp of userHeroPower) heroPowerMap.set(hp.heroId.toLowerCase(), hp.masteryLevel);

  const unavailable = new Set(enemyHeroIds.map((s) => s.toLowerCase()));
  const candidates = MLBB_HEROES.filter((h) => !unavailable.has(h.id.toLowerCase()));

  const counterList: CounterBreakdown[] = candidates.map((hero) => {
    let score = 50;
    const counterReasons: string[] = [];
    const pros: string[] = [];
    const cons: string[] = [];
    let risk = 'Pahami jangkauan skill lawan sebelum inisiasi.';

    for (const enemy of enemyHeroes) {
      if (isCounterMatch(hero, enemy)) {
        score += 20;
        counterReasons.push(`Menetralkan ${enemy.name}`);
        pros.push(`Mampu membatalkan pergerakan ${enemy.name}.`);
      }
      if (isCounterMatch(enemy, hero)) {
        score -= 15;
        cons.push(`Bisa ditekan oleh ${enemy.name}.`);
        risk = `Hindari duel saat ${enemy.name} punya ultimate aktif.`;
      }
    }

    const isHp = heroPowerIds.has(hero.id.toLowerCase());
    if (isHp) score += 10;

    let category: 'Best Counter' | 'Alternative Counter' | 'Situational Counter' = 'Situational Counter';
    if (score >= 80) category = 'Best Counter';
    else if (score >= 65) category = 'Alternative Counter';

    return {
      hero,
      category,
      counterEffectiveness: Math.min(98, Math.max(40, score)),
      counterReason: counterReasons.length > 0 ? counterReasons.join(', ') : 'Memberikan resistensi terhadap komposisi lawan.',
      pros: pros.length > 0 ? pros : ['Memiliki kemampuan bertahan dan kontribusi teamfight.'],
      cons: cons.length > 0 ? cons : ['Membutuhkan timing eksekusi yang tepat.'],
      risk,
      isHeroPower: isHp,
      masteryLevel: heroPowerMap.get(hero.id.toLowerCase()),
    };
  });

  return counterList
    .sort((a, b) => {
      if (a.isHeroPower && !b.isHeroPower) return -1;
      if (!a.isHeroPower && b.isHeroPower) return 1;
      return b.counterEffectiveness - a.counterEffectiveness;
    })
    .slice(0, 10);
}
