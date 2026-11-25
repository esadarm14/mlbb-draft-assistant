import type { 
  Hero, HeroPowerItem, HeroRecommendation, CounterBreakdown, 
  TeamPhaseEvaluation, PhaseStrength, Role, Lane, MasteryLevel 
} from '../types/index.ts';
import { MLBB_HEROES, getHeroById } from '../database/heroesData.ts';

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

// 1. CALCULATE TEAM PHASE EVALUATION & WIN CONDITION
export function evaluateTeamComposition(heroIds: string[]): TeamPhaseEvaluation {
  const heroes = heroIds.map(id => getHeroById(id)).filter((h): h is Hero => !!h);

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
      winCondition: 'Pilih hero untuk melihat evaluasi fase dan win condition.'
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

  const physicalCount = heroes.filter(h => h.damageType === 'Physical').length;
  const magicCount = heroes.filter(h => h.damageType === 'Magic').length;
  let magicPhysicalBalance: 'Balanced' | 'Heavy Physical' | 'Heavy Magic' = 'Balanced';
  if (physicalCount >= 4) magicPhysicalBalance = 'Heavy Physical';
  else if (magicCount >= 3) magicPhysicalBalance = 'Heavy Magic';

  const frontlineCount = heroes.filter(h => h.roles.includes('Tank') || (h.roles.includes('Fighter') && h.durability >= 8)).length;
  const frontlineAdequate = frontlineCount >= 1;

  const avgCC = heroes.reduce((acc, h) => acc + h.controlEffect, 0) / heroes.length;
  const ccRating = avgCC >= 7.5 ? 'High' : avgCC >= 5.5 ? 'Medium' : 'Low';

  const hasHighObjJungler = heroes.some(h => ['martis', 'baxia', 'fredrinn', 'barats'].includes(h.id));
  const objectiveAdvantage = hasHighObjJungler || earlyScore >= 75;

  const hasSplitPusher = heroes.some(h => ['masha', 'hayabusa', 'ling', 'chou', 'sun', 'zilong'].includes(h.id));
  const splitPushAdvantage = hasSplitPusher && lateScore >= 65;

  const teamFightAdvantage = frontlineAdequate && ccRating === 'High';

  // Build Strengths and Weaknesses
  const strengths: string[] = [];
  const weaknesses: string[] = [];

  if (early === 'Strong') strengths.push('Dominasi laning phase dan kontrol Turtle awal yang sangat agresif.');
  if (mid === 'Strong') strengths.push('Power spike team fight sangat kuat di menit 6-12.');
  if (late === 'Strong') strengths.push('Kekuatan scaling Lord dan teamfight late game luar biasa.');
  if (frontlineAdequate) strengths.push(`Frontline solid (${frontlineCount} hero baris depan penahan damage).`);
  else weaknesses.push('Kurang hero frontline (tank/fighter tebal), backline rentan di-dive.');

  if (magicPhysicalBalance !== 'Balanced') {
    weaknesses.push(`Komposisi ${magicPhysicalBalance}: musuh mudah melakukan counter item defense.`);
  }
  if (ccRating === 'Low') {
    weaknesses.push('Crowd control minim; sulit menghentikan assassin lincah atau inisiasi musuh.');
  }

  // Generate strategic Win Condition
  let winCondition = '';
  if (early === 'Strong' && late !== 'Strong') {
    winCondition = 'WIN CONDITION: EARLY SNOWBALL. Amankan First Blood dan Turtle pertama, invasi jungle musuh secara konstan, hancurkan semua outer turret sebelum menit 8, dan akhiri laga di bawah menit 14 sebelum musuh mencapai power spike.';
  } else if (late === 'Strong' && early !== 'Strong') {
    winCondition = 'WIN CONDITION: LATE GAME SCALING. Bermain disiplin dan hindari kontes yang tidak perlu di early game. Lindungi marksman/hyper hingga item core selesai, lalu menangkan teamfight di sekitar Lord menit 12+.';
  } else if (teamFightAdvantage) {
    winCondition = 'WIN CONDITION: 5v5 TEAMFIGHT WOMBO. Paksa pertempuran 5v5 di koridor sempit atau pit Turtle/Lord. Inisiasi dengan chain CC dan ledakkan damage area simultan.';
  } else if (splitPushAdvantage) {
    winCondition = 'WIN CONDITION: MACRO & SPLIT PUSH. Terapkan strategi 4-1 atau 1-3-1. Biarkan split-pusher merobek turret samping saat musuh terpancing mempertahankan jalur tengah.';
  } else {
    winCondition = 'WIN CONDITION: TEMPO & PICK OFF. Cari eliminasi tunggal melalui jebakan semak jungle lawan sebelum memulai pertarungan objektif Lord.';
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
    winCondition
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
  const unavailable = new Set([...alliedHeroIds, ...enemyHeroIds, ...bannedHeroIds].map(s => s.toLowerCase()));
  const candidateHeroes = MLBB_HEROES.filter(h => !unavailable.has(h.id.toLowerCase()));

  const alliedHeroes = alliedHeroIds.map(id => getHeroById(id)).filter((h): h is Hero => !!h);
  const enemyHeroes = enemyHeroIds.map(id => getHeroById(id)).filter((h): h is Hero => !!h);

  const heroPowerMap = new Map<string, HeroPowerItem>();
  for (const item of userHeroPower) {
    heroPowerMap.set(item.heroId.toLowerCase(), item);
  }

  // Find missing roles in allied team
  const filledRoles = new Set(alliedHeroes.flatMap(h => h.roles));
  const needsFrontline = !alliedHeroes.some(h => h.roles.includes('Tank') || h.durability >= 8);
  const needsMagic = !alliedHeroes.some(h => h.damageType === 'Magic');
  const needsPhysical = !alliedHeroes.some(h => h.damageType === 'Physical');

  const evaluated: HeroRecommendation[] = candidateHeroes.map(hero => {
    const isHeroPower = heroPowerMap.has(hero.id.toLowerCase());
    const hpItem = heroPowerMap.get(hero.id.toLowerCase());

    // 1. Counter Score (0 - 100)
    let counterAdvantage = 50;
    const reasons: string[] = [];
    const pros: string[] = [];
    const cons: string[] = [];
    const risks: string[] = [];

    let counteredCount = 0;
    let weaknessCount = 0;

    for (const enemy of enemyHeroes) {
      if (hero.keyCounters.includes(enemy.id)) {
        counterAdvantage += 20;
        counteredCount++;
        reasons.push(`Meng-counter langsung ${enemy.name}`);
        pros.push(`Efektif menekan ${enemy.name} berkat kit kemampuannya.`);
      }
      if (hero.counteredBy.includes(enemy.id)) {
        counterAdvantage -= 20;
        weaknessCount++;
        cons.push(`Rentan terhadap ${enemy.name}.`);
        risks.push(`Waspadai ganking atau inisiasi dari ${enemy.name}.`);
      }
    }
    const counterScore = Math.max(10, Math.min(100, counterAdvantage));

    // 2. Hero Power Score (0 - 100)
    let heroPowerScore = 30; // base score for non-hero power
    if (isHeroPower && hpItem) {
      heroPowerScore = MASTERY_SCORES[hpItem.masteryLevel] || 70;
      reasons.push(`Hero Power andalan (${hpItem.masteryLevel})`);
      pros.push(`Tingkat penguasaan tinggi oleh pemain (${hpItem.masteryLevel}).`);
    }

    // 3. Synergy Score (0 - 100)
    let synergyTotal = 50;
    for (const ally of alliedHeroes) {
      if (hero.synergyWith.includes(ally.id) || ally.synergyWith.includes(hero.id)) {
        synergyTotal += 18;
        reasons.push(`Sinergi kuat dengan ${ally.name}`);
        pros.push(`Kombo mematikan bersama ${ally.name}.`);
      }
    }
    const synergyScore = Math.max(20, Math.min(100, synergyTotal));

    // 4. Role Requirement Score (0 - 100)
    let roleFitScore = 60;
    if (needsFrontline && (hero.roles.includes('Tank') || hero.durability >= 8)) {
      roleFitScore += 30;
      reasons.push('Mengisi kebutuhan frontline tim');
      pros.push('Memberikan pertahanan kokoh yang sangat dibutuhkan rekan.');
    }
    if (needsMagic && hero.damageType === 'Magic') {
      roleFitScore += 20;
      reasons.push('Melengkapi damage magic tim');
    }
    if (needsPhysical && hero.damageType === 'Physical') {
      roleFitScore += 20;
      reasons.push('Menjaga keseimbangan physical damage');
    }
    roleFitScore = Math.min(100, roleFitScore);

    // 5. Game Phase Score (0 - 100)
    let phaseScore = 65;
    if (hero.midStrength === 'Strong') phaseScore += 15;
    if (hero.lateStrength === 'Strong') phaseScore += 10;
    phaseScore = Math.min(100, phaseScore);

    // 6. Objective Score (0 - 100)
    let objectiveScore = 55;
    if (hero.lanes.includes('Jungle') || hero.specialties.includes('Burst') || hero.specialties.includes('Control')) {
      objectiveScore += 25;
    }
    objectiveScore = Math.min(100, objectiveScore);

    // Calculate weighted total score
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

    if (cons.length === 0) cons.push('Membutuhkan komunikasi dan positioning yang tepat.');
    if (risks.length === 0) risks.push('Pastikan tidak terisolasi dari rekan satu tim.');

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
      reasons: reasons.length > 0 ? reasons : ['Pilihan fleksibel sesuai komposisi draft.'],
      isHeroPower,
      masteryLevel: hpItem?.masteryLevel,
      pros,
      cons,
      risks
    };
  });

  evaluated.sort((a, b) => b.totalScore - a.totalScore);

  const bestHeroPower = evaluated
    .filter(r => r.isHeroPower)
    .sort((a, b) => b.totalScore - a.totalScore)
    .slice(0, 5);

  const bestCounters = evaluated
    .filter(r => r.counterScore >= 60)
    .sort((a, b) => b.counterScore - a.counterScore)
    .slice(0, 5);

  return {
    bestHeroPower,
    bestCounters,
    allRecommendations: evaluated.slice(0, 10)
  };
}

// 3. CONTEXTUAL COUNTER ANALYZER
export function analyzeEnemyCounters(
  enemyHeroIds: string[],
  userHeroPower: HeroPowerItem[]
): CounterBreakdown[] {
  const enemyHeroes = enemyHeroIds.map(id => getHeroById(id)).filter((h): h is Hero => !!h);
  if (enemyHeroes.length === 0) return [];

  const heroPowerIds = new Set(userHeroPower.map(h => h.heroId.toLowerCase()));
  const heroPowerMap = new Map<string, MasteryLevel>();
  for (const hp of userHeroPower) heroPowerMap.set(hp.heroId.toLowerCase(), hp.masteryLevel);

  const unavailable = new Set(enemyHeroIds.map(s => s.toLowerCase()));
  const candidates = MLBB_HEROES.filter(h => !unavailable.has(h.id.toLowerCase()));

  const counterList: CounterBreakdown[] = candidates.map(hero => {
    let score = 50;
    const counterReasons: string[] = [];
    const pros: string[] = [];
    const cons: string[] = [];
    let risk = 'Pahami jangkauan skill lawan sebelum melakukan inisiasi.';

    for (const enemy of enemyHeroes) {
      if (hero.keyCounters.includes(enemy.id)) {
        score += 20;
        counterReasons.push(`Menetralkan ${enemy.name}`);
        pros.push(`Mampu membatalkan pergerakan atau burst ${enemy.name}.`);
      }
      if (hero.counteredBy.includes(enemy.id)) {
        score -= 15;
        cons.push(`Bisa ditekan balik oleh ${enemy.name}.`);
        risk = `Hindari duel langsung saat ${enemy.name} memiliki spell atau ultimate aktif.`;
      }
    }

    const isHp = heroPowerIds.has(hero.id.toLowerCase());
    if (isHp) score += 10; // Hero Power priority boost

    let category: 'Best Counter' | 'Alternative Counter' | 'Situational Counter' = 'Situational Counter';
    if (score >= 80) category = 'Best Counter';
    else if (score >= 65) category = 'Alternative Counter';

    return {
      hero,
      category,
      counterEffectiveness: Math.min(98, Math.max(40, score)),
      counterReason: counterReasons.length > 0 ? counterReasons.join(', ') : `Memberikan resistensi terhadap komposisi lawan.`,
      pros: pros.length > 0 ? pros : ['Memiliki kemampuan bertahan dan kontribusi teamfight.'],
      cons: cons.length > 0 ? cons : ['Membutuhkan timing eksekusi yang tepat.'],
      risk,
      isHeroPower: isHp,
      masteryLevel: heroPowerMap.get(hero.id.toLowerCase())
    };
  });

  // Sort: Best Counter first, with Hero Power prioritized within category
  return counterList
    .sort((a, b) => {
      if (a.isHeroPower && !b.isHeroPower) return -1;
      if (!a.isHeroPower && b.isHeroPower) return 1;
      return b.counterEffectiveness - a.counterEffectiveness;
    })
    .slice(0, 10);
}
