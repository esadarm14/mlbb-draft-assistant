import type { DraftRulesConfig, RankTier, DraftMode } from '../types';

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

export interface DraftStep {
  index: number;
  phase: 'ban1' | 'pick1' | 'ban2' | 'pick2';
  phaseLabel: string;
  action: 'ban' | 'pick';
  side: 'blue' | 'red';
  actor: 'me' | 'enemy';
  slotNumber: number;
  label: string;
}

/**
 * Builds the sequential MLBB draft order (Ban Phase 1 -> Pick Phase 1 -> Ban Phase 2 -> Pick Phase 2)
 * based on tier ban count, draft mode, and user's side.
 */
export function buildDraftSequence(
  tier: RankTier,
  mode: DraftMode,
  mySide: 'blue' | 'red'
): DraftStep[] {
  const bansPerTeam = getInitialDraftConfig(tier, mode).bansPerTeam;
  const rawSteps: Array<{ phase: DraftStep['phase']; phaseLabel: string; action: 'ban' | 'pick'; side: 'blue' | 'red' }> = [];

  // Ban Phase 1 (Epic: all 3 per team; Legend: 3 per team; Mythic+/Tournament: 3 per team)
  const ban1PerTeam = bansPerTeam <= 3 ? bansPerTeam : 3;
  for (let i = 0; i < ban1PerTeam; i++) {
    rawSteps.push({ phase: 'ban1', phaseLabel: 'Ban Fase 1', action: 'ban', side: 'blue' });
    rawSteps.push({ phase: 'ban1', phaseLabel: 'Ban Fase 1', action: 'ban', side: 'red' });
  }

  // Pick Phase 1 (3 picks per team: B1 -> R1,R2 -> B2,B3 -> R3)
  const pick1Order: Array<'blue' | 'red'> = ['blue', 'red', 'red', 'blue', 'blue', 'red'];
  for (const side of pick1Order) {
    rawSteps.push({ phase: 'pick1', phaseLabel: 'Pick Fase 1', action: 'pick', side });
  }

  // Ban Phase 2 (for 4 or 5 bans per team)
  const ban2PerTeam = bansPerTeam - ban1PerTeam;
  for (let i = 0; i < ban2PerTeam; i++) {
    rawSteps.push({ phase: 'ban2', phaseLabel: 'Ban Fase 2', action: 'ban', side: 'red' });
    rawSteps.push({ phase: 'ban2', phaseLabel: 'Ban Fase 2', action: 'ban', side: 'blue' });
  }

  // Pick Phase 2 (remaining 2 picks per team: R4 -> B4,B5 -> R5)
  const pick2Order: Array<'blue' | 'red'> = ['red', 'blue', 'blue', 'red'];
  for (const side of pick2Order) {
    rawSteps.push({ phase: 'pick2', phaseLabel: 'Pick Fase 2', action: 'pick', side });
  }

  const counters = {
    myBan: 0,
    enemyBan: 0,
    myPick: 0,
    enemyPick: 0,
  };

  return rawSteps.map((step, index) => {
    const actor: 'me' | 'enemy' = step.side === mySide ? 'me' : 'enemy';
    let slotNumber = 1;
    let label = '';

    if (step.action === 'ban' && actor === 'me') {
      counters.myBan += 1;
      slotNumber = counters.myBan;
      label = `Ban #${slotNumber} Tim Kamu`;
    } else if (step.action === 'ban' && actor === 'enemy') {
      counters.enemyBan += 1;
      slotNumber = counters.enemyBan;
      label = `Ban #${slotNumber} Lawan`;
    } else if (step.action === 'pick' && actor === 'me') {
      counters.myPick += 1;
      slotNumber = counters.myPick;
      label = `Pick #${slotNumber} Tim Kamu`;
    } else {
      counters.enemyPick += 1;
      slotNumber = counters.enemyPick;
      label = `Pick #${slotNumber} Lawan`;
    }

    return {
      index,
      phase: step.phase,
      phaseLabel: step.phaseLabel,
      action: step.action,
      side: step.side,
      actor,
      slotNumber,
      label,
    };
  });
}
