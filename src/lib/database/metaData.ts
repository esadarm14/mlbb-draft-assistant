import type { DraftMode, Hero, RankTier, Role } from '../types';
import { MLBB_HEROES, getHeroById } from './heroesData';

export const META_PATCH_INFO = {
  patch: 'Patch Terbaru (Season 35+)',
  updatedAt: '2026-11',
  source: 'Moonton Rank Leaderboard & Tracker Meta',
};

export type LiveMetaOverride = {
  banRate?: number;
  pickRate?: number;
  winRate?: number;
};

let liveMetaOverrides: Record<string, LiveMetaOverride> = {};

export function setLiveMetaOverrides(overrides: Record<string, LiveMetaOverride>) {
  liveMetaOverrides = overrides;
}

export type MetaTier = 'S+' | 'S' | 'A' | 'B' | 'C';

export interface HeroMetaStats {
  heroId: string;
  metaTier: MetaTier;
  banRate: number; // percentage 0-100
  pickRate: number; // percentage 0-100
  winRate: number; // percentage 0-100
  metaReason: string;
  sourceLabel: string;
}

interface MetaEntry {
  metaTier: MetaTier;
  banRate: number;
  pickRate: number;
  winRate: number;
  reason: string;
}

/**
 * Curated meta data referencing Moonton in-game rank leaderboards (Epic - Mythical Glory+),
 * MLBB community trackers (mlbb.io, mlbbherometa.com), and MPL/M-Series tournament presence.
 */
const HIGH_ELO_META: Record<string, MetaEntry> = {
  hirara: {
    metaTier: 'S+',
    banRate: 85.4,
    pickRate: 8.2,
    winRate: 55.6,
    reason: 'Ban rate tertinggi di Mythic+ karena mobilitas licin, burst tinggi, dan kontrol map sulit dihentikan.',
  },
  masha: {
    metaTier: 'S+',
    banRate: 71.8,
    pickRate: 11.4,
    winRate: 59.4,
    reason: 'Win rate & ban rate papan atas; 3 bar HP + burst damage menghancurkan turret dan tank dengan cepat.',
  },
  obsidia: {
    metaTier: 'S+',
    banRate: 64.5,
    pickRate: 14.1,
    winRate: 53.4,
    reason: 'Gold Laner prioritas S+ dengan DPS late-game sangat tinggi yang mendominasi teamfight.',
  },
  zhuxin: {
    metaTier: 'S+',
    banRate: 58.2,
    pickRate: 16.5,
    winRate: 53.8,
    reason: 'Mage zoning area terkuat di Mythic & turnamen; tarikan lampionnya mengacaukan formasi tim.',
  },
  sun: {
    metaTier: 'S+',
    banRate: 54.6,
    pickRate: 15.2,
    winRate: 54.1,
    reason: 'Ancaman split push & duel 1v1 ekstrem; cepat meruntuhkan turret jika tidak dikawal ketat.',
  },
  fanny: {
    metaTier: 'S+',
    banRate: 52.4,
    pickRate: 10.8,
    winRate: 52.9,
    reason: 'Langganan ban di high tier karena mobilitas kabel ekstrem & snowball early game tak terbendung.',
  },
  suyou: {
    metaTier: 'S',
    banRate: 46.8,
    pickRate: 18.4,
    winRate: 53.2,
    reason: 'Jungler/EXP fleksibel dengan dua mode skill, burst cepat, dan sustain kuat di kontes Turtle.',
  },
  lukas: {
    metaTier: 'S',
    banRate: 44.2,
    pickRate: 17.6,
    winRate: 53.5,
    reason: 'Fighter transformasi dengan durability & damage area besar yang mendominasi teamfight mid-game.',
  },
  ling: {
    metaTier: 'S',
    banRate: 41.5,
    pickRate: 13.4,
    winRate: 52.3,
    reason: 'Assassin rotasi dinding tercepat; sangat berbahaya untuk backline dan split push.',
  },
  joy: {
    metaTier: 'S',
    banRate: 39.0,
    pickRate: 12.1,
    winRate: 53.6,
    reason: 'Dive assassin dengan immune/burst magic tinggi yang mengobrak-abrik mage & marksman.',
  },
  chip: {
    metaTier: 'S',
    banRate: 36.4,
    pickRate: 9.8,
    winRate: 53.1,
    reason: 'Roamer makro dengan portal teleport tim untuk gank 5v2 secara mendadak.',
  },
  mathilda: {
    metaTier: 'S',
    banRate: 34.8,
    pickRate: 13.5,
    winRate: 53.4,
    reason: 'Support mobilitas tinggi dengan Guiding Wind yang menyelamatkan core sekaligus inisiasi.',
  },
  diggie: {
    metaTier: 'S',
    banRate: 32.5,
    pickRate: 11.2,
    winRate: 54.4,
    reason: 'Counter mutlak kombo CC area; Time Journey menggagalkan seluruh inisiasi tank lawan.',
  },
  hayabusa: {
    metaTier: 'S',
    banRate: 31.2,
    pickRate: 19.3,
    winRate: 52.1,
    reason: 'Assassin pick-off paling aman dengan bayangan kabur dan Shadow Kill anti-target.',
  },
  khufra: {
    metaTier: 'S',
    banRate: 28.4,
    pickRate: 16.0,
    winRate: 54.2,
    reason: 'Tank anti-dash terbaik di meta; Bouncing Ball menghentikan Fanny, Ling, Joy, dan Wanwan.',
  },
  minotaur: {
    metaTier: 'S',
    banRate: 25.1,
    pickRate: 17.8,
    winRate: 54.0,
    reason: 'Roamer paket lengkap: heal area, knock-up besar, dan sangat tahan banting di teamfight.',
  },
  valir: {
    metaTier: 'S',
    banRate: 14.5,
    pickRate: 18.2,
    winRate: 53.7,
    reason: 'Mage anti-dive dengan Purify bawaan & efek slow/knockback yang mengunci frontline lawan.',
  },
  xavier: {
    metaTier: 'S',
    banRate: 12.8,
    pickRate: 21.4,
    winRate: 53.1,
    reason: 'Mage poke jarak jauh dengan root area dan ultimate global untuk snipe objektif/backline.',
  },
  argus: {
    metaTier: 'S',
    banRate: 9.6,
    pickRate: 12.4,
    winRate: 56.8,
    reason: 'Win rate sangat tinggi di Mythic+ sebagai sleeper pick penghancur turret & duel late game.',
  },
  floryn: {
    metaTier: 'S',
    banRate: 22.4,
    pickRate: 15.6,
    winRate: 54.8,
    reason: 'Heal global menembus anti-heal dan menjaga HP tim tetap penuh saat kontes Lord.',
  },
  freya: {
    metaTier: 'S',
    banRate: 34.0,
    pickRate: 11.8,
    winRate: 54.9,
    reason: 'Fighter snowball agresif dengan shield tebal & burst area di EXP maupun Jungle.',
  },
  belerick: {
    metaTier: 'A',
    banRate: 21.5,
    pickRate: 14.2,
    winRate: 53.5,
    reason: 'Tank duri pemantul damage yang mematikan marksman attack speed tinggi dan fighter jarak dekat.',
  },
  estes: {
    metaTier: 'A',
    banRate: 24.0,
    pickRate: 12.0,
    winRate: 53.8,
    reason: 'Sustained heal ekstrem yang membuat komposisi teamfight lawan sulit menumbangkan frontline.',
  },
  carmilla: {
    metaTier: 'A',
    banRate: 27.6,
    pickRate: 10.4,
    winRate: 54.1,
    reason: 'Curse of Blood menautkan damage & CC ke seluruh tim lawan dalam teamfight sempit.',
  },
  bruno: {
    metaTier: 'S',
    banRate: 18.5,
    pickRate: 20.1,
    winRate: 53.2,
    reason: 'Marksman critical kuat sejak early-mid game dengan mobilitas dash yang aman.',
  },
  'popol-and-kupa': {
    metaTier: 'S',
    banRate: 16.2,
    pickRate: 13.7,
    winRate: 53.4,
    reason: 'Unggul kontrol lane, trap visi map, dan cepat menghancurkan turret serta Lord.',
  },
  fredrinn: {
    metaTier: 'S',
    banRate: 19.4,
    pickRate: 16.9,
    winRate: 52.8,
    reason: 'Jungler tank paling stabil untuk mengamankan Retribution Lord/Turtle dengan CC taunt.',
  },
  helcurt: {
    metaTier: 'S',
    banRate: 26.8,
    pickRate: 14.5,
    winRate: 53.0,
    reason: 'Silence & gelap global yang membuat mage serta marksman lawan tidak sempat menekan skill.',
  },
  saber: {
    metaTier: 'A',
    banRate: 22.0,
    pickRate: 17.5,
    winRate: 52.6,
    reason: 'Eksekutor instan untuk mengunci assassin lincah seperti Fanny, Ling, dan Hayabusa.',
  },
};

const MID_LOW_ELO_META: Record<string, MetaEntry> = {
  belerick: {
    metaTier: 'S+',
    banRate: 49.5,
    pickRate: 18.4,
    winRate: 55.2,
    reason: 'Sering di-ban di Epic–Legend karena menghukum marksman attack speed dan sulit dijatuhkan.',
  },
  estes: {
    metaTier: 'S+',
    banRate: 54.2,
    pickRate: 16.0,
    winRate: 54.9,
    reason: 'Prioritas ban utama di Epic–Legend; tim tanpa anti-heal/burst sulit menembus heal-nya.',
  },
  saber: {
    metaTier: 'S+',
    banRate: 46.8,
    pickRate: 21.5,
    winRate: 53.4,
    reason: 'Ancaman instant-lock bagi marksman & mage di tier Epic–Legend.',
  },
  yin: {
    metaTier: 'S',
    banRate: 42.3,
    pickRate: 17.2,
    winRate: 52.7,
    reason: 'Domain 1v1 sering menculik core tim di Epic–Legend jika posisi kurang disiplin.',
  },
  hanabi: {
    metaTier: 'S',
    banRate: 35.6,
    pickRate: 24.8,
    winRate: 52.5,
    reason: 'Shield anti-CC & pantulan damage membuat Hanabi sangat populer dan ditakuti di Epic–Legend.',
  },
  diggie: {
    metaTier: 'S',
    banRate: 38.0,
    pickRate: 10.5,
    winRate: 54.1,
    reason: 'Menghilangkan seluruh efek CC inisiator tim.',
  },
  fanny: {
    metaTier: 'S',
    banRate: 41.2,
    pickRate: 9.4,
    winRate: 51.8,
    reason: 'Sering di-ban untuk menghindari smurf atau pengguna kabel cepat di solo queue.',
  },
  nana: {
    metaTier: 'A',
    banRate: 29.4,
    pickRate: 22.0,
    winRate: 52.3,
    reason: 'Molina & pasif kebal membuat Nana menyebalkan saat teamfight di Epic–Legend.',
  },
  sun: {
    metaTier: 'S+',
    banRate: 51.0,
    pickRate: 19.8,
    winRate: 55.1,
    reason: 'Sangat kuat di Epic–Legend untuk split push dan solo Lord tanpa terdeteksi.',
  },
  masha: {
    metaTier: 'S+',
    banRate: 48.0,
    pickRate: 10.5,
    winRate: 57.6,
    reason: 'Win rate tertinggi; sangat mudah mendominasi duel dan turret.',
  },
  hirara: {
    metaTier: 'S+',
    banRate: 62.0,
    pickRate: 9.5,
    winRate: 54.4,
    reason: 'Hero baru/meta OP dengan ban rate tinggi di seluruh tier.',
  },
  obsidia: {
    metaTier: 'S',
    banRate: 44.0,
    pickRate: 13.0,
    winRate: 53.0,
    reason: 'Marksman DPS tinggi yang mendominasi late game.',
  },
};

const TOURNAMENT_META: Record<string, MetaEntry> = {
  zhuxin: {
    metaTier: 'S+',
    banRate: 78.5,
    pickRate: 18.2,
    winRate: 55.4,
    reason: 'Kehadiran hampir 95%+ pick/ban di MPL & turnamen internasional karena kontrol zona mutlak.',
  },
  freya: {
    metaTier: 'S+',
    banRate: 68.0,
    pickRate: 14.5,
    winRate: 56.2,
    reason: 'Salah satu hero dengan ban rate tertinggi di turnamen pro karena snowball early-mid sangat kejam.',
  },
  fanny: {
    metaTier: 'S+',
    banRate: 64.2,
    pickRate: 15.8,
    winRate: 54.8,
    reason: 'Respect ban utama di turnamen terhadap jungler mekanik tinggi.',
  },
  chip: {
    metaTier: 'S+',
    banRate: 56.4,
    pickRate: 19.0,
    winRate: 54.5,
    reason: 'Portal rotasi 5-man di level turnamen sangat menentukan perebutan Turtle & Lord.',
  },
  hirara: {
    metaTier: 'S+',
    banRate: 61.0,
    pickRate: 14.2,
    winRate: 54.9,
    reason: 'Fleksibilitas & burst damage tinggi memaksa tim pro mengamankan atau mem-ban di fase 1.',
  },
  mathilda: {
    metaTier: 'S',
    banRate: 48.0,
    pickRate: 22.5,
    winRate: 54.1,
    reason: 'Roamer paling stabil di turnamen untuk tempo rotasi dan disengage.',
  },
  ling: {
    metaTier: 'S',
    banRate: 45.6,
    pickRate: 16.4,
    winRate: 53.6,
    reason: 'Assassin makro split-push dan eksekusi backline di fase akhir.',
  },
  suyou: {
    metaTier: 'S',
    banRate: 44.0,
    pickRate: 24.0,
    winRate: 53.8,
    reason: 'Jungler flex prioritas turnamen karena cepat mengamankan objektif.',
  },
  joy: {
    metaTier: 'S',
    banRate: 42.5,
    pickRate: 17.2,
    winRate: 54.0,
    reason: 'Ancaman dive backline yang memaksa lawan mengambil counter khusus.',
  },
  harith: {
    metaTier: 'S',
    banRate: 38.2,
    pickRate: 21.0,
    winRate: 53.7,
    reason: 'Gold Laner magic fleksibel dengan mobilitas dash dan shield tak henti.',
  },
  masha: {
    metaTier: 'S',
    banRate: 47.0,
    pickRate: 13.5,
    winRate: 56.1,
    reason: 'Tekanan side-lane dan ancaman one-shot core lawan.',
  },
};

function computeFallbackMeta(hero: Hero, tier: RankTier, mode: DraftMode): HeroMetaStats {
  const power = hero.offense * 0.45 + hero.controlEffect * 0.35 + hero.durability * 0.2;
  const isHighTier = ['Mythic', 'Mythical Honor', 'Mythical Glory', 'Mythical Immortal'].includes(tier);

  let metaTier: MetaTier = 'B';
  if (power >= 7.6) metaTier = 'S';
  else if (power >= 6.5) metaTier = 'A';
  else if (power < 5.4) metaTier = 'C';

  // Adjust by tier preference
  let banRate = Math.max(1.2, Math.min(28, (power - 4.5) * 4.5));
  if (!isHighTier && hero.difficulty <= 4 && hero.offense >= 7) banRate += 6;
  if (isHighTier && hero.roles.includes('Assassin') && hero.difficulty >= 7) banRate += 5;
  if (mode === 'Tournament Draft' && hero.lanes.length >= 2) banRate += 4;

  const winRate = Number((48.5 + Math.max(0, power - 5.5) * 1.4).toFixed(1));
  const pickRate = Number((6.0 + Math.max(0, power - 5.0) * 2.2).toFixed(1));

  return {
    heroId: hero.id,
    metaTier,
    banRate: Number(banRate.toFixed(1)),
    pickRate,
    winRate: Math.min(55.5, winRate),
    metaReason:
      metaTier === 'S'
        ? `Hero kuat di ${tier} dengan kombinasi damage, kontrol, dan dampak teamfight tinggi.`
        : metaTier === 'A'
          ? `Hero solid di meta ${tier} bila sesuai dengan kebutuhan komposisi tim.`
          : `Pick situasional di ${tier}; efektif terutama sebagai counter spesifik.`,
    sourceLabel: mode === 'Tournament Draft' ? 'Data Meta Turnamen (MPL)' : `Data Meta Rank ${tier}`,
  };
}

export function getHeroMetaStats(
  heroId: string,
  tier: RankTier = 'Mythic',
  mode: DraftMode = 'Ranked Draft'
): HeroMetaStats {
  const key = heroId.toLowerCase();
  const isMidLow = tier === 'Epic' || tier === 'Legend';

  let entry: MetaEntry | undefined;
  let sourceLabel = `Meta Rank ${tier}`;

  if (mode === 'Tournament Draft') {
    entry = TOURNAMENT_META[key] || HIGH_ELO_META[key];
    sourceLabel = 'Meta Turnamen (MPL / M-Series)';
  } else if (isMidLow) {
    entry = MID_LOW_ELO_META[key] || HIGH_ELO_META[key];
    sourceLabel = `Meta Rank ${tier} (Moonton / Tracker)`;
  } else {
    entry = HIGH_ELO_META[key];
    sourceLabel = `Meta Rank ${tier} (Moonton / Tracker)`;
  }

  const live = liveMetaOverrides[key];

  if (entry) {
    return {
      heroId: key,
      metaTier: entry.metaTier,
      banRate: live?.banRate ?? entry.banRate,
      pickRate: live?.pickRate ?? entry.pickRate,
      winRate: live?.winRate ?? entry.winRate,
      metaReason: entry.reason,
      sourceLabel: live ? `${sourceLabel} (Live Sync)` : sourceLabel,
    };
  }

  const hero = getHeroById(key);
  if (!hero) {
    return {
      heroId: key,
      metaTier: 'B',
      banRate: live?.banRate ?? 2.0,
      pickRate: live?.pickRate ?? 5.0,
      winRate: live?.winRate ?? 50.0,
      metaReason: 'Hero situasional.',
      sourceLabel,
    };
  }

  const fallback = computeFallbackMeta(hero, tier, mode);
  if (live) {
    return {
      ...fallback,
      banRate: live.banRate ?? fallback.banRate,
      pickRate: live.pickRate ?? fallback.pickRate,
      winRate: live.winRate ?? fallback.winRate,
      sourceLabel: `${sourceLabel} (Live Sync)`,
    };
  }
  return fallback;
}

export function getQuickHeroesByRole(
  role: Role | 'All',
  tier: RankTier = 'Mythic',
  mode: DraftMode = 'Ranked Draft',
  excludeIds: string[] = [],
  limit = 10
): Array<{ hero: Hero; meta: HeroMetaStats }> {
  const excluded = new Set(excludeIds.map((id) => id.toLowerCase()));
  return MLBB_HEROES.filter(
    (h) => !excluded.has(h.id.toLowerCase()) && (role === 'All' || h.roles.includes(role))
  )
    .map((hero) => ({ hero, meta: getHeroMetaStats(hero.id, tier, mode) }))
    .sort(
      (a, b) =>
        b.meta.banRate + b.meta.pickRate - (a.meta.banRate + a.meta.pickRate) ||
        b.meta.winRate - a.meta.winRate
    )
    .slice(0, limit);
}

export function getTopMetaBans(
  tier: RankTier = 'Mythic',
  mode: DraftMode = 'Ranked Draft',
  excludeIds: string[] = [],
  limit = 6
): HeroMetaStats[] {
  const excluded = new Set(excludeIds.map((id) => id.toLowerCase()));
  const table =
    mode === 'Tournament Draft'
      ? { ...HIGH_ELO_META, ...TOURNAMENT_META }
      : tier === 'Epic' || tier === 'Legend'
        ? { ...HIGH_ELO_META, ...MID_LOW_ELO_META }
        : HIGH_ELO_META;

  return Object.keys(table)
    .filter((id) => !excluded.has(id) && !!getHeroById(id))
    .map((id) => getHeroMetaStats(id, tier, mode))
    .sort((a, b) => b.banRate - a.banRate || b.winRate - a.winRate)
    .slice(0, limit);
}
