import type { DraftRulesConfig, RankTier, DraftMode } from '../types/index.ts';

export const DEFAULT_TIER_BAN_COUNTS: Record<RankTier, number> = {
  'Epic': 3,
  'Legend': 4,
  'Mythic': 5,
  'Mythical Honor': 5,
  'Mythical Glory': 5,
  'Mythical Immortal': 5,
};

export const RANK_TIERS: RankTier[] = [
  'Epic',
  'Legend',
  'Mythic',
  'Mythical Honor',
  'Mythical Glory',
  'Mythical Immortal',
];

export const DRAFT_MODES: DraftMode[] = [
  'Ranked Draft',
  'Tournament Draft',
  'Custom Draft',
];

export function getInitialDraftConfig(tier: RankTier = 'Mythic', mode: DraftMode = 'Ranked Draft'): DraftRulesConfig {
  const bansPerTeam = mode === 'Tournament Draft' ? 5 : (DEFAULT_TIER_BAN_COUNTS[tier] || 5);
  return {
    tier,
    mode,
    bansPerTeam,
    allowSimultaneousBan: tier !== 'Epic',
    maxPicksPerTeam: 5,
    highestRankInMatch: tier,
    allowDuplicateAcrossTeams: false,
  };
}

export const TIER_META_NOTES: Record<RankTier, string> = {
  'Epic': 'Meta Epic didominasi oleh marksman late-game dan assassin burst. Prioritaskan hero dengan kemandirian tinggi (high solo-carry potential).',
  'Legend': 'Meta Legend mulai mengutamakan inisiasi teamfight dan penguasaan objektif Turtle. Sinergi roamer dan jungler mulai krusial.',
  'Mythic': 'Meta Mythic mengutamakan kontrol tempo early-to-mid game, rotasi cepat, dan fleksibilitas draft.',
  'Mythical Honor': 'Meta Mythical Honor menuntut draft disiplin dengan minimal 1 frontline solid, kontrol CC area, dan counter pick lane yang ketat.',
  'Mythical Glory': 'Meta Glory mengutamakan tempo agresif, dive tower terkoordinasi, dan hero dengan mobility serta sustain tinggi.',
  'Mythical Immortal': 'Meta Immortal tingkat tertinggi dengan ban ketat pada hero S-Tier terkuat, chain CC terpadu, dan eksekusi objektif disiplin.',
};
