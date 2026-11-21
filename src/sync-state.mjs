export function mergeSyncState(currentState, result) {
  const next = {
    ...currentState,
    lastCheckedAt: result.checkedAt,
    sourceStatuses: result.sources ?? {}
  };

  if (result.success) {
    next.lastSuccessfulSync = result.checkedAt;
    next.dataStatus = 'PARTIALLY VERIFIED';
    next.lastError = result.warnings?.length ? result.warnings.join(' | ') : null;
  } else {
    next.dataStatus = 'STALE';
    next.lastError = result.error || result.warnings?.join(' | ') || 'Sync gagal; data valid sebelumnya dipertahankan.';
  }

  return next;
}

export function proposalChangesForSync(result) {
  return result?.success === true ? (result.pendingChanges ?? []) : [];
}
