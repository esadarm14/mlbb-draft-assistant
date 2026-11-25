import type { ComboCardData, ComboType, Role, Hero } from '../types';
import { getHeroById } from './heroesData';

export interface ComboArchetype {
  id: string;
  name: string;
  type: ComboType;
  requiredRoles: Role[];
  coreHeroIds: string[];
  synergyExplanation: string;
  howItWorks: string;
  weaknesses: string;
  executionGuide: string;
  effectiveGameTime: string;
  baseScore: number;
  effectiveAgainst: string[]; // types or descriptions of enemy comps
}

export const COMBO_ARCHETYPES: ComboArchetype[] = [
  {
    id: 'cc-chain-wombo',
    name: 'Wombo Combo & CC Chain',
    type: 'Crowd Control Chain',
    requiredRoles: ['Tank', 'Mage', 'Marksman'],
    coreHeroIds: ['tigreal', 'vexana', 'melissa', 'terizla'],
    synergyExplanation: 'Mengunci lawan secara beruntun dengan Implosion Tigreal atau Penalty Zone Terizla, diikuti ledakan Undead Knight Vexana dan rentetan jarum Cuddles Melissa.',
    howItWorks: 'Inisiator tank mengumpulkan musuh di satu titik sempit. Mage dan marksman meluncurkan seluruh skill area (AoE) simultan sebelum efek stun musuh usai.',
    weaknesses: 'Rentan terhadap Diggie (Time Journey) dan hero dengan spell Purify atau immune CC bawaan (Martis, Wanwan).',
    executionGuide: 'Tunggu musuh berkumpul di pit Turtle/Lord, sembunyi di bushlurk, inisiasi dengan Flicker + Implosion, lalu tim mengeksekusi burst seketika.',
    effectiveGameTime: 'Mid Game s/d Late Game (Menit 8 - 18)',
    baseScore: 92,
    effectiveAgainst: ['hero-tanpa-dash', 'team-fight-comp', 'low-mobility-backline']
  },
  {
    id: 'pick-off-suppression',
    name: 'Single Target Pick Off',
    type: 'Pick Off Composition',
    requiredRoles: ['Tank', 'Fighter', 'Mage', 'Assassin'],
    coreHeroIds: ['franco', 'chou', 'kadita', 'hayabusa'],
    synergyExplanation: 'Suppression Bloody Waltz Franco atau The Way of Dragon Chou mengunci core lawan tanpa bisa di-purify, langsung dieksekusi burst Kadita atau Hayabusa.',
    howItWorks: 'Memanfaatkan keunggulan visi di area jungle lawan untuk menculik satu hero sebelum pertempuran objektif besar dimulai.',
    weaknesses: 'Kurang kuat jika dipaksa team fight terbuka 5v5 di lane terbuka jika gagal mendapatkan culikan pertama.',
    executionGuide: 'Kuasai jungle lawan, pancing musuh mengecek semak, tarik dengan Iron Hook, kunci suppression, lalu tim fokus menghabisi target sebelum bala bantuan tiba.',
    effectiveGameTime: 'Early Game s/d Mid Game (Menit 3 - 12)',
    baseScore: 88,
    effectiveAgainst: ['dive-comp', 'single-hypercarry', 'squishy-backline']
  },
  {
    id: 'dive-backline-assault',
    name: 'Dive & Backline Decapitation',
    type: 'Dive Composition',
    requiredRoles: ['Fighter', 'Support', 'Assassin'],
    coreHeroIds: ['yu-zhong', 'angela', 'fanny', 'ling'],
    synergyExplanation: 'Yu Zhong dalam wujud Naga Hitam atau Ling yang dipasangi Heartguard Angela langsung menyelam melintasi frontline musuh dan menghancurkan mage serta marksman.',
    howItWorks: 'Mengabaikan tank lawan di garis depan dan langsung memaksa marksman serta mage musuh mundur menjauh dari pertarungan.',
    weaknesses: 'Sangat rentan terhadap hero anti-dive dan barrier seperti Melissa (Cuddles), Khufra (Bouncing Ball), dan suppression Franco.',
    executionGuide: 'Biarkan frontline musuh membuang skill crowd control pertama, lalu aktifkan Black Dragon Form / kabel Fanny dengan shield Angela untuk menghabisi damage dealer lawan.',
    effectiveGameTime: 'Mid Game (Menit 6 - 14)',
    baseScore: 90,
    effectiveAgainst: ['poke-composition', 'artillery-mages', 'protect-the-carry']
  },
  {
    id: 'protect-the-hypercarry',
    name: 'Protect the Carry Fortress',
    type: 'Protect the Carry',
    requiredRoles: ['Support', 'Tank', 'Marksman'],
    coreHeroIds: ['diggie', 'minotaur', 'claude', 'beatrix'],
    synergyExplanation: 'Diggie dan Minotaur memberikan lapisan anti-CC, shield, serta regenerasi maksimal agar Claude atau Beatrix dapat leluasa melepaskan DPS tanpa takut diciduk.',
    howItWorks: 'Seluruh tim memposisikan diri membentuk benteng proteksi berlapis di sekitar marksman dalam perebutan Lord late-game.',
    weaknesses: 'Membutuhkan disiplin posisi tinggi; jika marksman tumbang terlebih dahulu, tim kehilangan sumber damage utama.',
    executionGuide: 'Simpan Time Journey Diggie khusus saat inisiator lawan masuk, aktifkan heal Minotaur, dan biarkan marksman menembak dari balik perisai.',
    effectiveGameTime: 'Late Game (Menit 12+)',
    baseScore: 89,
    effectiveAgainst: ['burst-assassins', 'cc-chain', 'wombo-combo']
  },
  {
    id: 'early-snowball-pressure',
    name: 'Early Game Snowball & Invade',
    type: 'Early Pressure',
    requiredRoles: ['Fighter', 'Tank', 'Assassin'],
    coreHeroIds: ['martis', 'baxia', 'mathilda', 'sora'],
    synergyExplanation: 'Martis dan Baxia memiliki rotasi tercepat dan damage dasar tertinggi di menit awal untuk mengamankan first blood dan seluruh Turtle.',
    howItWorks: 'Menekan lane dan jungle lawan tanpa jeda sejak detik ke-30, menutup ruang farming carry lawan sebelum mereka mencapai power spike.',
    weaknesses: 'Jika gagal mengakhiri pertandingan di bawah menit ke-14, potensi scaling late game lawan dapat membalikkan keadaan.',
    executionGuide: 'Invasi buff musuh di level 1 bersama roamer, rebut Turtle pertama, dan hancurkan outer turret sebelum menit ke-5.',
    effectiveGameTime: 'Early Game (Menit 1 - 9)',
    baseScore: 91,
    effectiveAgainst: ['late-game-scaling', 'weak-early-jungler', 'passive-draft']
  },
  {
    id: 'split-push-tempo',
    name: 'Split Push & Macro Pressure',
    type: 'Split Push',
    requiredRoles: ['Fighter', 'Assassin', 'Tank'],
    coreHeroIds: ['masha', 'hayabusa', 'chou', 'khufra'],
    synergyExplanation: 'Masha dan Hayabusa mendorong lane berlawanan dengan kecepatan tinggi, memaksa formasi musuh terpecah sementara sisa tim mengulur waktu secara aman.',
    howItWorks: 'Memanfaatkan keunggulan duel 1v1 untuk merontokkan turret musuh saat 4 hero lainnya melakukan baiting objektif di sisi lain peta.',
    weaknesses: 'Rentan jika 4 rekan tim tertangkap inisiasi musuh (5v4) sebelum split pusher berhasil menembus turret base.',
    executionGuide: 'Kirim Masha ke lane terjauh saat Lord muncul, pancing musuh mengirim 2 orang untuk bertahan, lalu ambil Lord secara cuma-cuma.',
    effectiveGameTime: 'Mid Game s/d Late Game (Menit 10 - 20)',
    baseScore: 87,
    effectiveAgainst: ['slow-rotations', 'heavy-teamfight-nukers']
  },
  {
    id: 'artillery-poke-control',
    name: 'Long-Range Artillery Poke',
    type: 'Poke Composition',
    requiredRoles: ['Mage', 'Marksman', 'Tank'],
    coreHeroIds: ['pharsa', 'yve', 'beatrix', 'khufra'],
    synergyExplanation: 'Mage jarak jauh (Pharsa/Yve) bersama sniper Beatrix menghujani musuh dari luar jangkauan penglihatan mereka sebelum perang dimulai.',
    howItWorks: 'Mengikis darah seluruh hero musuh hingga di bawah 50% sebelum mereka sempat mendekati pit Lord atau turret.',
    weaknesses: 'Rentan terhadap flanking dari assassin lincah (Fanny, Ling, Hayabusa).',
    executionGuide: 'Letakkan trap dan penjagaan di semak samping, lakukan pemboman udara saat musuh berkumpul, dan paksa mereka recall.',
    effectiveGameTime: 'Mid Game s/d Late Game (Menit 7 - 16)',
    baseScore: 86,
    effectiveAgainst: ['short-range-brawlers', 'immobile-tanks']
  }
];

export function buildComboRecommendations(
  alliedHeroIds: string[],
  enemyHeroIds: string[]
): ComboCardData[] {
  const alliedHeroes = alliedHeroIds.map(id => getHeroById(id)).filter((h): h is Hero => !!h);
  const enemyHeroes = enemyHeroIds.map(id => getHeroById(id)).filter((h): h is Hero => !!h);

  return COMBO_ARCHETYPES.map(archetype => {
    // Calculate synergy bonus based on how many core heroes or role matches are present
    const matchedCore = archetype.coreHeroIds.filter(id => alliedHeroIds.includes(id));
    const matchedCoreHeroes = archetype.coreHeroIds.map(id => getHeroById(id)).filter((h): h is Hero => !!h);

    let score = archetype.baseScore;
    if (matchedCore.length > 0) score += matchedCore.length * 5;

    // Counter adjustments against enemy draft
    const enemyHasImmobile = enemyHeroes.some(h => ['layla', 'miya', 'hanabi', 'pharsa', 'yve'].includes(h.id));
    const enemyHasAssassins = enemyHeroes.some(h => h.roles.includes('Assassin'));

    if (archetype.type === 'Crowd Control Chain' && enemyHasImmobile) score += 8;
    if (archetype.type === 'Protect the Carry' && enemyHasAssassins) score += 9;
    if (archetype.type === 'Pick Off Composition' && enemyHasImmobile) score += 7;

    return {
      id: archetype.id,
      name: archetype.name,
      type: archetype.type,
      requiredRoles: archetype.requiredRoles,
      coreHeroes: matchedCoreHeroes.length > 0 ? matchedCoreHeroes : archetype.coreHeroIds.slice(0, 3).map(id => getHeroById(id)).filter((h): h is Hero => !!h),
      synergyExplanation: archetype.synergyExplanation,
      howItWorks: archetype.howItWorks,
      weaknesses: archetype.weaknesses,
      executionGuide: archetype.executionGuide,
      effectiveGameTime: archetype.effectiveGameTime,
      effectivenessScore: Math.min(99, score)
    };
  })
  .sort((a, b) => b.effectivenessScore - a.effectivenessScore)
  .slice(0, 3);
}
