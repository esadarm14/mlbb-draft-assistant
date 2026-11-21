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
    heroes: { records: [{ id: 'kalea', verificationStatus: 'VERIFIED' }] },
    hero_matchups: { records: [record()] },
    hero_synergies: { records: [] }
  }, { candidates: ['kalea'], enemy: ['sora'] });
  assert.equal(result.label, 'AI GENERATED STRATEGIC ANALYSIS');
  assert.equal(result.status, 'RECOMMENDATIONS_AVAILABLE');
  assert.equal(result.recommendations[0].heroId, 'kalea');
});
