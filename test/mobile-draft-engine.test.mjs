import test from 'node:test';
import assert from 'node:assert/strict';

import { 
  searchHeroes, getHeroById, MLBB_HEROES 
} from '../src/database/heroesData.ts';
import { 
  getInitialDraftConfig, DEFAULT_TIER_BAN_COUNTS 
} from '../src/database/draftRules.ts';
import { 
  evaluateTeamComposition, generateDraftRecommendations, analyzeEnemyCounters 
} from '../src/engine/recommendationEngine.ts';
import { 
  buildComboRecommendations 
} from '../src/database/combosData.ts';

test('1. Autocomplete search: typing "ma" returns Marcel, Masha, Martis, Melissa, Moskov', () => {
  const results = searchHeroes('ma');
  const names = results.map(h => h.name);

  assert.ok(names.includes('Marcel'), 'Marcel must be in results');
  assert.ok(names.includes('Masha'), 'Masha must be in results');
  assert.ok(names.includes('Martis'), 'Martis must be in results');
  assert.ok(names.includes('Melissa'), 'Melissa must be in results');
  assert.ok(names.includes('Moskov'), 'Moskov must be in results');
});

test('2. Autocomplete search: case-insensitive and partial match works', () => {
  const resUpper = searchHeroes('TIG');
  const resLower = searchHeroes('tig');
  assert.equal(resUpper.length, resLower.length);
  assert.equal(resUpper[0].name, 'Tigreal');

  const resRole = searchHeroes('', 'Tank');
  assert.ok(resRole.every(h => h.roles.includes('Tank')));
});

test('3. Tier-based Draft System: assigns correct bans per rank tier', () => {
  const epic = getInitialDraftConfig('Epic');
  assert.equal(epic.bansPerTeam, 3, 'Epic tier must have 3 bans per team');

  const legend = getInitialDraftConfig('Legend');
  assert.equal(legend.bansPerTeam, 4, 'Legend tier must have 4 bans per team');

  const mythic = getInitialDraftConfig('Mythic');
  assert.equal(mythic.bansPerTeam, 5, 'Mythic tier must have 5 bans per team');

  const honor = getInitialDraftConfig('Mythical Honor');
  assert.equal(honor.bansPerTeam, 5, 'Mythical Honor must have 5 bans per team');

  const immortal = getInitialDraftConfig('Mythical Immortal');
  assert.equal(immortal.bansPerTeam, 5, 'Mythical Immortal must have 5 bans per team');
});

test('4. Smart Hero Power Recommendation prioritizes user mastered heroes', () => {
  const userHp = [
    { heroId: 'tigreal', primaryLane: 'Roam', masteryLevel: 'Main Hero', priority: 1, updatedAt: '' },
    { heroId: 'martis', primaryLane: 'Jungle', masteryLevel: 'Highly Mastered', priority: 2, updatedAt: '' },
  ];

  const recs = generateDraftRecommendations(
    [], // no allies yet
    ['fanny'], // enemy has fanny
    [], // no bans
    userHp
  );

  assert.ok(recs.bestHeroPower.length > 0, 'Must provide best Hero Power recommendations');
  const tigrealRec = recs.bestHeroPower.find(r => r.hero.id === 'tigreal');
  assert.ok(tigrealRec, 'Tigreal must be recommended from user Hero Power');
  assert.equal(tigrealRec.category, 'BEST HERO POWER');
  assert.ok(tigrealRec.reasons.some(r => r.includes('Hero Power andalan')));
});

test('5. Smart Counter Pick: identifies strong counters against enemy draft', () => {
  const userHp = [];
  const enemyDraft = ['fanny']; // Fanny is countered by Khufra, Franco, Chou

  const counters = analyzeEnemyCounters(enemyDraft, userHp);
  assert.ok(counters.length > 0);

  const khufraCounter = counters.find(c => c.hero.id === 'khufra');
  assert.ok(khufraCounter, 'Khufra must be among top counters to Fanny');
  assert.ok(khufraCounter.counterEffectiveness >= 70);
  assert.ok(khufraCounter.pros.length > 0);
  assert.ok(khufraCounter.cons.length > 0);
  assert.ok(typeof khufraCounter.risk === 'string');
});

test('6. Early, Mid, and Late Game Analyzer computes phase strength ratings', () => {
  // Early snowball team: Martis, Baxia, Mathilda, Sora
  const earlyComp = evaluateTeamComposition(['martis', 'baxia', 'mathilda', 'sora']);
  assert.equal(earlyComp.early, 'Strong', 'Team should be evaluated as Strong in early game');
  assert.ok(earlyComp.winCondition.includes('EARLY SNOWBALL'), 'Win condition must identify early snowball strategy');

  // Late scaling team: Claude, Moskov, Obsidia
  const lateComp = evaluateTeamComposition(['claude', 'moskov', 'obsidia']);
  assert.equal(lateComp.late, 'Strong', 'Team should be Strong in late game');
  assert.ok(lateComp.winCondition.length > 0);
});

test('7. Smart Combo Suggestion returns top 3 context-aware archetypes', () => {
  const alliedPicks = ['tigreal', 'vexana'];
  const enemyPicks = ['layla'];

  const combos = buildComboRecommendations(alliedPicks, enemyPicks);
  assert.equal(combos.length, 3, 'Must return top 3 combos');
  assert.ok(combos[0].name.length > 0);
  assert.ok(combos[0].howItWorks.length > 0);
  assert.ok(combos[0].executionGuide.length > 0);
  assert.ok(combos[0].effectiveGameTime.length > 0);
});

test('8. Team Composition evaluates frontline and damage balance', () => {
  // Team with only squishy marksmen/mages: no frontline
  const squishyTeam = evaluateTeamComposition(['layla', 'miya', 'pharsa']);
  assert.equal(squishyTeam.frontlineAdequate, false, 'Should flag lack of frontline');
  assert.ok(squishyTeam.weaknesses.some(w => w.includes('frontline')));

  // Team with Tigreal
  const tankTeam = evaluateTeamComposition(['tigreal', 'pharsa']);
  assert.equal(tankTeam.frontlineAdequate, true, 'Should detect solid frontline');
});
