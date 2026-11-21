import test from 'node:test';
import assert from 'node:assert/strict';
import { mergeSyncState, proposalChangesForSync } from '../src/sync-state.mjs';

test('failed or partial sync preserves last known successful metadata and marks data stale', () => {
  const prior = {
    lastCheckedAt: '2026-11-20T03:00:00.000Z',
    lastSuccessfulSync: '2026-11-19T03:00:00.000Z',
    currentLivePatch: '2.2.10',
    previousPatch: '2.2.05',
    dataStatus: 'PARTIALLY VERIFIED',
    sourceStatuses: { patchNotes: { ok: true } },
    lastError: null
  };
  const result = {
    checkedAt: '2026-11-21T03:00:00.000Z',
    success: false,
    error: 'Halaman Moonton gagal dirender.',
    warnings: ['Halaman Moonton gagal dirender.'],
    sources: { patchNotes: { ok: false } }
  };
  const next = mergeSyncState(prior, result);
  assert.equal(next.lastCheckedAt, result.checkedAt);
  assert.equal(next.lastSuccessfulSync, prior.lastSuccessfulSync);
  assert.equal(next.currentLivePatch, prior.currentLivePatch);
  assert.equal(next.previousPatch, prior.previousPatch);
  assert.equal(next.dataStatus, 'STALE');
  assert.equal(next.lastError, result.error);
  assert.deepEqual(next.sourceStatuses, result.sources);
});

test('successful sync advances lastSuccessfulSync but keeps live patch unchanged until review', () => {
  const prior = { currentLivePatch: null, dataStatus: 'STALE', lastSuccessfulSync: null };
  const next = mergeSyncState(prior, {
    checkedAt: '2026-11-21T03:00:00.000Z', success: true, warnings: [], sources: {}
  });
  assert.equal(next.lastSuccessfulSync, '2026-11-21T03:00:00.000Z');
  assert.equal(next.currentLivePatch, null);
  assert.equal(next.dataStatus, 'PARTIALLY VERIFIED');
});

test('partial sync changes are withheld from automated pull-request proposals', () => {
  const candidate = { id: 'pending-patch' };
  assert.deepEqual(proposalChangesForSync({ success: false, pendingChanges: [candidate] }), []);
  assert.deepEqual(proposalChangesForSync({ success: true, pendingChanges: [candidate] }), [candidate]);
});
