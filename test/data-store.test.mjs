import test from 'node:test';
import assert from 'node:assert/strict';
import { applyApprovedChanges, makeDashboard, validateDataset } from '../src/data-store.mjs';

const officialRecord = (overrides = {}) => ({
  id: 'record-1',
  sourceUrl: 'https://www.mobilelegends.com/news/patch-notes',
  sourceType: 'OFFICIAL_PATCH_NOTE',
  patchVersion: '2.2.16',
  retrievalDate: '2026-11-21',
  verificationStatus: 'PARTIALLY VERIFIED',
  confidenceLevel: 0.8,
  ...overrides
});

const makeDb = () => ({
  heroes: { records: [] },
  hero_roles: { records: [] },
  patch_history: { records: [{
    id: 'patch-old', version: '2.2.10', releaseDate: '2026-08-01', serverScope: 'ORIGINAL_SERVER',
    verificationStatus: 'VERIFIED', sourceUrl: 'https://www.mobilelegends.com/news/patch-notes',
    sourceType: 'OFFICIAL_PATCH_NOTE', patchVersion: '2.2.10', retrievalDate: '2026-08-01', confidenceLevel: 0.95
  }] },
  hero_adjustments: { records: [] },
  hero_matchups: { updatedAt: null, records: [{ id: 'old-matchup', patchVersion: '2.2.10', verificationStatus: 'VERIFIED' }] },
  hero_synergies: { updatedAt: null, records: [{ id: 'old-synergy', patchVersion: null, verificationStatus: 'VERIFIED' }] },
  pending_changes: { records: [] },
  sync_state: { currentLivePatch: '2.2.10', previousPatch: null, lastSuccessfulSync: '2026-08-01T00:00:00.000Z' }
});

const patchChange = (serverScope, verificationStatus) => ({
  id: `pending-${serverScope}`,
  type: 'PATCH_ARTICLE',
  proposed: {
    id: `patch-2-2-16-${serverScope}`,
    version: '2.2.16',
    title: '2.2.16 PATCH NOTES',
    releaseDate: '2026-09-16',
    serverScope,
    changeSummary: { heroes: [{ heroName: 'Ling', marker: '↑', changeType: 'BUFF', excerpt: 'Cooldown adjusted.' }] },
    sourceUrl: 'https://new.mobilelegends.com/news/articleldetail?newsid=1',
    sourceType: 'OFFICIAL_PATCH_NOTE',
    patchVersion: '2.2.16',
    retrievalDate: '2026-11-21',
    verificationStatus,
    confidenceLevel: 0.82
  }
});

test('dataset validation requires source provenance and accepted verification values', () => {
  const valid = { schemaVersion: 1, records: [officialRecord()] };
  assert.equal(validateDataset('heroes', valid), valid);
  assert.throws(() => validateDataset('heroes', { schemaVersion: 1, records: [officialRecord({ sourceUrl: 'https://tierlist.example/hero' })] }), /domain resmi Moonton/);
  assert.throws(() => validateDataset('heroes', { schemaVersion: 1, records: [officialRecord({ verificationStatus: 'APPROVED' })] }), /verificationStatus/);
  assert.throws(() => validateDataset('heroes', { schemaVersion: 1, records: [officialRecord({ confidenceLevel: 'high' })] }), /confidenceLevel/);
});

test('approved verified Original Server patch updates live and previous patch pointers', () => {
  const db = makeDb();
  const change = patchChange('ORIGINAL_SERVER', 'VERIFIED');
  db.pending_changes.records.push(change);
  applyApprovedChanges(db, [change]);
  assert.equal(db.sync_state.currentLivePatch, '2.2.16');
  assert.equal(db.sync_state.previousPatch, '2.2.10');
  assert.equal(db.patch_history.records.length, 2);
  assert.equal(db.hero_adjustments.records[0].category, 'BUFF');
  assert.equal(db.hero_matchups.records[0].verificationStatus, 'STALE');
  assert.equal(db.hero_matchups.records[0].potentiallyStale, true);
  assert.equal(db.hero_synergies.records[0].verificationStatus, 'STALE');
  assert.equal(db.pending_changes.records.length, 0);
});

test('Advance Server or unclassified patch never changes Original Server live patch', () => {
  const db = makeDb();
  const change = patchChange('ADVANCE_SERVER', 'VERIFIED');
  db.pending_changes.records.push(change);
  applyApprovedChanges(db, [change]);
  assert.equal(db.sync_state.currentLivePatch, '2.2.10');
  assert.equal(db.sync_state.previousPatch, null);
  assert.equal(db.hero_matchups.records[0].verificationStatus, 'VERIFIED');
});

test('dashboard previous patch is selected only from verified Original Server history', async () => {
  const db = makeDb();
  const advance = patchChange('ADVANCE_SERVER', 'VERIFIED').proposed;
  const original = patchChange('ORIGINAL_SERVER', 'VERIFIED').proposed;
  db.patch_history.records.push(advance, original);
  db.sync_state.currentLivePatch = '2.2.16';
  const dashboard = await makeDashboard(db);
  assert.equal(dashboard.currentLivePatch.version, '2.2.16');
  assert.equal(dashboard.previousPatch.version, '2.2.10');
});
