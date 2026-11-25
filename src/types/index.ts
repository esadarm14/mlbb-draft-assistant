export type Role = 'Tank' | 'Fighter' | 'Assassin' | 'Mage' | 'Marksman' | 'Support';

export type Lane = 'EXP Lane' | 'Jungle' | 'Mid Lane' | 'Gold Lane' | 'Roam';

export type PhaseStrength = 'Strong' | 'Average' | 'Weak';

export type DamageType = 'Physical' | 'Magic' | 'True Damage' | 'Mixed';

export type MasteryLevel = 'Main Hero' | 'Highly Mastered' | 'Comfortable' | 'Backup Hero';

export type RankTier = 
  | 'Epic'
  | 'Legend'
  | 'Mythic'
  | 'Mythical Honor'
  | 'Mythical Glory'
  | 'Mythical Immortal';

export type DraftMode = 'Ranked Draft' | 'Tournament Draft' | 'Custom Draft';

export type ComboType = 
  | 'Team Fight Composition'
  | 'Wombo Combo'
  | 'Pick Off Composition'
  | 'Protect the Carry'
  | 'Dive Composition'
  | 'Poke Composition'
  | 'Early Pressure'
  | 'Late Game Scaling'
  | 'Counter Initiation'
  | 'Crowd Control Chain'
  | 'Split Push';

export interface Hero {
  id: string;
  heroId?: number;
  name: string;
  roles: Role[];
  lanes: Lane[];
  specialties: string[];
  damageType: DamageType;
  durability: number; // 1-10
  offense: number; // 1-10
  controlEffect: number; // 1-10
  difficulty: number; // 1-10
  earlyStrength: PhaseStrength;
  midStrength: PhaseStrength;
  lateStrength: PhaseStrength;
  earlyNotes: string;
  midNotes: string;
  lateNotes: string;
  portraitUrl: string;
  releaseStatus: 'OFFICIAL' | 'ADVANCE_SERVER' | 'UNVERIFIED OFFICIAL DATA';
  verificationStatus: 'VERIFIED' | 'PARTIALLY VERIFIED' | 'UNVERIFIED' | 'STALE';
  sourceUrl: string;
  keyCounters: string[]; // hero IDs that this hero counters
  counteredBy: string[]; // hero IDs that counter this hero
  synergyWith: string[]; // hero IDs that have strong synergy
  skills?: {
    name: string;
    type: 'Passive' | 'Skill 1' | 'Skill 2' | 'Ultimate';
    description: string;
  }[];
}

export interface HeroPowerItem {
  heroId: string;
  primaryLane: Lane;
  masteryLevel: MasteryLevel;
  priority: number; // 1 (highest) to N
  notes?: string;
  updatedAt: string;
}

export interface DraftRulesConfig {
  tier: RankTier;
  mode: DraftMode;
  bansPerTeam: number;
  allowSimultaneousBan: boolean;
  maxPicksPerTeam: number;
  highestRankInMatch?: RankTier;
  allowDuplicateAcrossTeams: boolean;
}

export interface DraftState {
  config: DraftRulesConfig;
  blueBans: string[];
  redBans: string[];
  bluePicks: string[];
  redPicks: string[];
  activeTeam: 'blue' | 'red';
  currentPhase: 'ban' | 'pick' | 'finished';
  history: Array<{
    action: 'ban' | 'pick';
    team: 'blue' | 'red';
    heroId: string;
  }>;
}

export interface HeroRecommendation {
  hero: Hero;
  category: 'BEST HERO POWER' | 'BEST COUNTER PICK' | 'ALTERNATIVE PICK';
  totalScore: number;
  counterScore: number;
  heroPowerScore: number;
  synergyScore: number;
  roleFitScore: number;
  phaseScore: number;
  objectiveScore: number;
  reasons: string[];
  isHeroPower: boolean;
  masteryLevel?: MasteryLevel;
  pros: string[];
  cons: string[];
  risks: string[];
}

export interface CounterBreakdown {
  hero: Hero;
  category: 'Best Counter' | 'Alternative Counter' | 'Situational Counter';
  counterEffectiveness: number; // 0 - 100 percentage
  counterReason: string;
  pros: string[];
  cons: string[];
  risk: string;
  isHeroPower: boolean;
  masteryLevel?: MasteryLevel;
}

export interface ComboCardData {
  id: string;
  name: string;
  type: ComboType;
  requiredRoles: Role[];
  coreHeroes: Hero[];
  synergyExplanation: string;
  howItWorks: string;
  weaknesses: string;
  executionGuide: string;
  effectiveGameTime: string;
  effectivenessScore: number;
}

export interface TeamPhaseEvaluation {
  early: PhaseStrength;
  mid: PhaseStrength;
  late: PhaseStrength;
  earlyScore: number;
  midScore: number;
  lateScore: number;
  teamFightAdvantage: boolean;
  objectiveAdvantage: boolean;
  splitPushAdvantage: boolean;
  frontlineAdequate: boolean;
  magicPhysicalBalance: 'Balanced' | 'Heavy Physical' | 'Heavy Magic';
  ccRating: 'High' | 'Medium' | 'Low';
  strengths: string[];
  weaknesses: string[];
  winCondition: string;
}

export interface DraftReportData {
  createdAt: string;
  config: DraftRulesConfig;
  blueTeam: {
    picks: Hero[];
    bans: Hero[];
    evaluation: TeamPhaseEvaluation;
  };
  redTeam: {
    picks: Hero[];
    bans: Hero[];
    evaluation: TeamPhaseEvaluation;
  };
  comparison: {
    earlyAdvantage: 'Blue Team' | 'Red Team' | 'Even';
    midAdvantage: 'Blue Team' | 'Red Team' | 'Even';
    lateAdvantage: 'Blue Team' | 'Red Team' | 'Even';
    summary: string;
  };
  bestCombos: ComboCardData[];
}
