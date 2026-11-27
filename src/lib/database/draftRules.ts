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
  /** Number of heroes selected in this turn (e.g. 2 for Red Pick 1&2, 5 for simultaneous ban) */
  slots: number;
  /** True for Ranked Legend/Mythic+ blind simultaneous ban phase */
  simultaneous?: boolean;
  label: string;
}

/**
 * Builds the official MLBB draft order:
 * - Ranked Mythic+ (10 bans): Simultaneous blind bans (5 per team), then snake picks:
 *   B1 -> R1,R2 -> B2,B3 -> R3,R4 -> B4,B5 -> R5
 * - Ranked Legend (8 bans): Simultaneous blind bans (4 per team), then same snake picks
 * - Ranked Epic (6 bans): Alternating bans (B1,R1,B2,R2,B3,R3), then same snake picks
 * - Tournament Draft (MPL 10 bans):
 *   Ban 1: B1 -> R1 -> B2 -> R2
 *   Pick 1: B1 -> R1,R2 -> B2,B3 -> R3
 *   Ban 2: R3 -> B3 -> R4 -> B4 -> R5 -> B5
 *   Pick 2: R4 -> B4,B5 -> R5
 */
export function buildDraftSequence(
  tier: RankTier,
  mode: DraftMode,
  mySide: 'blue' | 'red'
): DraftStep[] {
  const bansPerTeam = getInitialDraftConfig(tier, mode).bansPerTeam;
  const rawSteps: Array<{
    phase: DraftStep['phase'];
    phaseLabel: string;
    action: 'ban' | 'pick';
    side: 'blue' | 'red';
    slots: number;
    simultaneous?: boolean;
    customSuffix?: string;
  }> = [];

  if (mode === 'Tournament Draft') {
    // Phase 1 Ban: 2 each alternating (4 total)
    rawSteps.push({ phase: 'ban1', phaseLabel: 'Ban Fase 1', action: 'ban', side: 'blue', slots: 1 });
    rawSteps.push({ phase: 'ban1', phaseLabel: 'Ban Fase 1', action: 'ban', side: 'red', slots: 1 });
    rawSteps.push({ phase: 'ban1', phaseLabel: 'Ban Fase 1', action: 'ban', side: 'blue', slots: 1 });
    rawSteps.push({ phase: 'ban1', phaseLabel: 'Ban Fase 1', action: 'ban', side: 'red', slots: 1 });

    // Phase 1 Pick: B1 -> R1,R2 -> B2,B3 -> R3
    rawSteps.push({ phase: 'pick1', phaseLabel: 'Pick Fase 1', action: 'pick', side: 'blue', slots: 1 });
    rawSteps.push({ phase: 'pick1', phaseLabel: 'Pick Fase 1', action: 'pick', side: 'red', slots: 2 });
    rawSteps.push({ phase: 'pick1', phaseLabel: 'Pick Fase 1', action: 'pick', side: 'blue', slots: 2 });
    rawSteps.push({ phase: 'pick1', phaseLabel: 'Pick Fase 1', action: 'pick', side: 'red', slots: 1 });

    // Phase 2 Ban: 3 each alternating, Red first (6 total)
    rawSteps.push({ phase: 'ban2', phaseLabel: 'Ban Fase 2', action: 'ban', side: 'red', slots: 1 });
    rawSteps.push({ phase: 'ban2', phaseLabel: 'Ban Fase 2', action: 'ban', side: 'blue', slots: 1 });
    rawSteps.push({ phase: 'ban2', phaseLabel: 'Ban Fase 2', action: 'ban', side: 'red', slots: 1 });
    rawSteps.push({ phase: 'ban2', phaseLabel: 'Ban Fase 2', action: 'ban', side: 'blue', slots: 1 });
    rawSteps.push({ phase: 'ban2', phaseLabel: 'Ban Fase 2', action: 'ban', side: 'red', slots: 1 });
    rawSteps.push({ phase: 'ban2', phaseLabel: 'Ban Fase 2', action: 'ban', side: 'blue', slots: 1 });

    // Phase 2 Pick: R4 -> B4,B5 -> R5
    rawSteps.push({ phase: 'pick2', phaseLabel: 'Pick Fase 2', action: 'pick', side: 'red', slots: 1 });
    rawSteps.push({ phase: 'pick2', phaseLabel: 'Pick Fase 2', action: 'pick', side: 'blue', slots: 2 });
    rawSteps.push({ phase: 'pick2', phaseLabel: 'Pick Fase 2', action: 'pick', side: 'red', slots: 1 });
  } else {
    // Ranked Draft / Custom Draft
    if (tier === 'Epic') {
      // Epic: 3 alternating bans per team
      for (let i = 0; i < bansPerTeam; i++) {
        rawSteps.push({ phase: 'ban1', phaseLabel: 'Ban Fase (Bergantian)', action: 'ban', side: 'blue', slots: 1 });
        rawSteps.push({ phase: 'ban1', phaseLabel: 'Ban Fase (Bergantian)', action: 'ban', side: 'red', slots: 1 });
      }
    } else {
      // Legend (4) & Mythic+ (5): Simultaneous blind ban phase
      rawSteps.push({
        phase: 'ban1',
        phaseLabel: 'Ban Serentak (Simultan)',
        action: 'ban',
        side: mySide,
        slots: bansPerTeam,
        simultaneous: true,
      });
      rawSteps.push({
        phase: 'ban1',
        phaseLabel: 'Ban Serentak (Reveal Lawan)',
        action: 'ban',
        side: mySide === 'blue' ? 'red' : 'blue',
        slots: bansPerTeam,
        simultaneous: true,
      });
    }

    // Ranked Snake Pick Pattern: B1 -> R1,R2 -> B2,B3 -> R3,R4 -> B4,B5 -> R5
    rawSteps.push({ phase: 'pick1', phaseLabel: 'Pick Fase', action: 'pick', side: 'blue', slots: 1 });
    rawSteps.push({ phase: 'pick1', phaseLabel: 'Pick Fase', action: 'pick', side: 'red', slots: 2 });
    rawSteps.push({ phase: 'pick1', phaseLabel: 'Pick Fase', action: 'pick', side: 'blue', slots: 2 });
    rawSteps.push({ phase: 'pick2', phaseLabel: 'Pick Fase', action: 'pick', side: 'red', slots: 2 });
    rawSteps.push({ phase: 'pick2', phaseLabel: 'Pick Fase', action: 'pick', side: 'blue', slots: 2 });
    rawSteps.push({ phase: 'pick2', phaseLabel: 'Pick Fase (Last Pick)', action: 'pick', side: 'red', slots: 1 });
  }

  const counters = {
    myBan: 0,
    enemyBan: 0,
    myPick: 0,
    enemyPick: 0,
  };

  return rawSteps.map((step, index) => {
    const actor: 'me' | 'enemy' = step.side === mySide ? 'me' : 'enemy';
    let label = '';

    if (step.simultaneous) {
      label = actor === 'me' ? `Ban Serentak Tim Kamu (${step.slots} hero)` : `Ban Serentak Lawan (maks ${step.slots} hero)`;
    } else if (step.action === 'ban' && actor === 'me') {
      counters.myBan += 1;
      label = `Ban #${counters.myBan} Tim Kamu`;
    } else if (step.action === 'ban' && actor === 'enemy') {
      counters.enemyBan += 1;
      label = `Ban #${counters.enemyBan} Lawan`;
    } else if (step.action === 'pick' && actor === 'me') {
      const start = counters.myPick + 1;
      counters.myPick += step.slots;
      label = step.slots > 1 ? `Pick #${start} & #${counters.myPick} Tim Kamu` : `Pick #${start} Tim Kamu`;
    } else {
      const start = counters.enemyPick + 1;
      counters.enemyPick += step.slots;
      label = step.slots > 1 ? `Pick #${start} & #${counters.enemyPick} Lawan` : `Pick #${start} Lawan`;
    }

    return {
      index,
      phase: step.phase,
      phaseLabel: step.phaseLabel,
      action: step.action,
      side: step.side,
      actor,
      slots: step.slots,
      simultaneous: step.simultaneous,
      label,
    };
  });
}
