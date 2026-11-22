import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeDraft } from '../src/draft-engine.mjs';

const record = (overrides = {}) => ({
  heroId: 'kalea', enemyHeroId: 'sora', allyHeroId: 'marcel', score: 2,
  patchVersion: '2.2.16', verificationStatus: 'VERIFIED', reason: 'fixture evidence', ...overrides
});

test('stale evidence is excluded and strategic output is clearly labelled as AI generated', () => {
  const result = analyzeDraft({
    heroes: { records: [{ id: 'kalea', verificationStatus: 'VERIFIED' }] },
    hero_matchups: { records: [record({ verificationStatus: 'STALE', potentiallyStale: true })] },
    hero_synergies: { records: [] }
  }, { candidates: ['kalea'], enemy: ['sora'] });
  assert.equal(result.label, 'AI GENERATED STRATEGIC ANALYSIS');
  assert.equal(result.status, 'INSUFFICIENT_VERIFIED_DATA');
  assert.deepEqual(result.recommendations, []);
  assert.ok(result.warnings.some((warning) => warning.includes('record strategi ditandai STALE')));
  assert.ok(result.warnings.some((warning) => warning.includes('bukan rekomendasi resmi Moonton')));
});

test('verified and non-stale evidence may score a draft, but never as official advice', () => {
  const result = analyzeDraft({
    heroes: { records: [{ id: 'kalea', verificationStatus: 'VERIFIED', officialRole: ['Support', 'Fighter'] }] },
    hero_matchups: { records: [record()] },
    hero_synergies: { records: [] }
  }, { candidates: ['kalea'], enemy: ['sora'] });
  assert.equal(result.label, 'AI GENERATED STRATEGIC ANALYSIS');
  assert.equal(result.status, 'RECOMMENDATIONS_AVAILABLE');
  assert.equal(result.recommendations[0].heroId, 'kalea');
  assert.ok(result.counterPicks.sora.length > 0);
  assert.equal(result.counterPicks.sora[0].heroId, 'kalea');
  assert.ok(result.teamComposition);
});

test('draft engine provides team composition evaluation, synergies, and ban recommendations', () => {
  const db = {
    heroes: { records: [
      { id: 'kalea', verificationStatus: 'VERIFIED', officialRole: ['Support', 'Fighter'], heroSpecialty: ['Control', 'Regen'] },
      { id: 'sora', verificationStatus: 'VERIFIED', officialRole: ['Fighter', 'Assassin'], heroSpecialty: ['Charge', 'Burst'] },
      { id: 'obsidia', verificationStatus: 'VERIFIED', officialRole: ['Marksman'], heroSpecialty: ['Damage'] },
      { id: 'hirara', verificationStatus: 'VERIFIED', officialRole: ['Assassin'], heroSpecialty: ['Chase', 'Finisher'] }
    ]},
    hero_matchups: { records: [
      { id: 'm1', heroId: 'kalea', enemyHeroId: 'sora', score: 2, patchVersion: '2.2.16', verificationStatus: 'VERIFIED' },
      { id: 'm2', heroId: 'hirara', enemyHeroId: 'obsidia', score: 3, patchVersion: '2.2.16', verificationStatus: 'VERIFIED' }
    ]},
    hero_synergies: { records: [
      { id: 's1', heroId: 'kalea', allyHeroId: 'obsidia', score: 2, patchVersion: '2.2.16', verificationStatus: 'VERIFIED' }
    ]},
    hero_adjustments: { records: [] }
  };

  const result = analyzeDraft(db, { ally: ['obsidia'], enemy: ['sora'], candidates: ['kalea'] });
  assert.equal(result.label, 'AI GENERATED STRATEGIC ANALYSIS');
  assert.equal(result.teamComposition.ally.frontline, 0);
  assert.ok(result.teamComposition.ally.gaps.some(g => g.includes('Frontline')));
  assert.ok(result.heroSynergies.obsidia.length > 0);
  assert.equal(result.heroSynergies.obsidia[0].heroId, 'kalea');
  assert.ok(result.banRecommendations.some(b => b.heroId === 'hirara'));
});
