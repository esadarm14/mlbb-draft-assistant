import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { slugify } from './official-sync.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const DATA_DIR = path.join(ROOT, 'data');
export const DATASET_NAMES = Object.freeze([
  'heroes', 'hero_skills', 'patch_history', 'hero_adjustments', 'hero_roles',
  'hero_matchups', 'hero_synergies', 'draft_rules', 'source_registry'
]);
export const META_NAMES = Object.freeze(['sync_state', 'sync_logs', 'pending_changes']);
export const ALL_NAMES = Object.freeze([...DATASET_NAMES, ...META_NAMES]);
export const VERIFICATION_STATUSES = new Set(['VERIFIED', 'PARTIALLY VERIFIED', 'UNVERIFIED', 'STALE']);
const OFFICIAL_HOSTS = new Set(['mobilelegends.com', 'www.mobilelegends.com', 'new.mobilelegends.com']);

const defaultEnvelope = () => ({ schemaVersion: 1, updatedAt: new Date().toISOString(), records: [] });

export async function readJson(name) {
  if (!ALL_NAMES.includes(name)) throw new Error(`File data tidak dikenal: ${name}`);
  try { return JSON.parse(await readFile(path.join(DATA_DIR, `${name}.json`), 'utf8')); }
  catch (error) {
    if (error.code === 'ENOENT') return name === 'sync_state'
      ? { schemaVersion: 1, lastCheckedAt: null, lastSuccessfulSync: null, dataStatus: 'STALE', lastError: 'Belum pernah sinkron.' }
      : defaultEnvelope();
    throw error;
  }
}

export async function writeJsonAtomic(name, value) {
  if (!ALL_NAMES.includes(name)) throw new Error(`File data tidak dikenal: ${name}`);
  await mkdir(DATA_DIR, { recursive: true });
  const target = path.join(DATA_DIR, `${name}.json`);
  const temp = `${target}.${process.pid}.tmp`;
  await writeFile(temp, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  await rename(temp, target);
}

export async function loadDatabase() {
  const entries = await Promise.all(ALL_NAMES.map(async (name) => [name, await readJson(name)]));
  return Object.fromEntries(entries);
}

export function validateDataset(name, value) {
  if (!DATASET_NAMES.includes(name)) throw new Error('Import hanya berlaku untuk file database resmi/strategis yang terdaftar.');
  if (!value || value.schemaVersion !== 1 || !Array.isArray(value.records)) throw new Error('Format harus memiliki schemaVersion: 1 dan records berupa array.');
  for (const [index, record] of value.records.entries()) {
    if (!record || typeof record !== 'object') throw new Error(`records[${index}] harus berupa objek.`);
    const status = record.verificationStatus;
    if (!VERIFICATION_STATUSES.has(status)) throw new Error(`records[${index}] memiliki verificationStatus yang tidak valid.`);
    if (typeof record.sourceType !== 'string' || !record.sourceType.trim()) throw new Error(`records[${index}] tidak memiliki sourceType.`);
    if (!(record.sourceUrl === null || typeof record.sourceUrl === 'string')) throw new Error(`records[${index}].sourceUrl harus URL atau null.`);
    if (record.sourceUrl) {
      const url = new URL(record.sourceUrl);
      if (url.protocol !== 'https:') throw new Error(`records[${index}] sourceUrl wajib HTTPS.`);
      const official = OFFICIAL_HOSTS.has(url.hostname);
      const aiDataset = ['hero_matchups', 'hero_synergies', 'draft_rules'].includes(name);
      if (!official && !aiDataset) throw new Error(`Sumber data faktual wajib berasal dari domain resmi Moonton: ${record.sourceUrl}`);
    }
    if (!Object.hasOwn(record, 'patchVersion')) throw new Error(`records[${index}] wajib memiliki patchVersion (gunakan null jika belum diketahui).`);
    if (!Object.hasOwn(record, 'retrievalDate')) throw new Error(`records[${index}] wajib memiliki retrievalDate (gunakan null jika belum tersedia).`);
    if (typeof record.confidenceLevel !== 'number' || record.confidenceLevel < 0 || record.confidenceLevel > 1) throw new Error(`records[${index}] confidenceLevel harus 0–1.`);
  }
  return value;
}

export async function appendSyncLog(entry) {
  const logs = await readJson('sync_logs');
  logs.records = [entry, ...(logs.records ?? [])].slice(0, 100);
  logs.updatedAt = new Date().toISOString();
  await writeJsonAtomic('sync_logs', logs);
}

export async function queueChanges(changes) {
  if (!changes.length) return await readJson('pending_changes');
  const pending = await readJson('pending_changes');
  const known = new Set((pending.records ?? []).map((record) => record.id));
  pending.records = [...(pending.records ?? []), ...changes.filter((change) => !known.has(change.id))];
  pending.updatedAt = new Date().toISOString();
  await writeJsonAtomic('pending_changes', pending);
  return pending;
}

function updateEnvelope(db, name, record, key = 'id') {
  const envelope = db[name];
  const index = envelope.records.findIndex((row) => row[key] === record[key]);
  if (index >= 0) envelope.records[index] = record;
  else envelope.records.push(record);
  envelope.updatedAt = new Date().toISOString();
}

export function applyApprovedChanges(db, chosen) {
  for (const change of chosen) {
    const p = change.proposed;
    if (change.type === 'PATCH_ARTICLE') {
      const patch = { ...p };
      updateEnvelope(db, 'patch_history', patch);
      const adjustments = p.changeSummary ?? {};
      const entries = [
        ...(adjustments.heroes ?? []).map((item) => ({ ...item, category: item.changeType, heroName: item.heroName })),
        ...(adjustments.revamps ?? []).map((item) => ({ ...item, category: 'REVAMP' })),
        ...(adjustments.newHeroes ?? []).map((item) => ({ ...item, category: 'NEW_HERO' })),
        ...(adjustments.equipmentBattlefield ?? []).map((item) => ({ ...item, category: /equipment/i.test(item.section) ? 'EQUIPMENT' : 'BATTLEFIELD' }))
      ];
      for (const item of entries) {
        const record = {
          id: `${patch.id}-${slugify(item.heroName ?? item.name ?? item.section ?? item.category)}`,
          patchVersion: p.version,
          serverScope: p.serverScope,
          category: item.category,
          heroName: item.heroName ?? item.name ?? null,
          skillChanges: item.skillChanges ?? [],
          excerpt: item.excerpt ?? null,
          sourceUrl: p.sourceUrl,
          sourceType: 'OFFICIAL_PATCH_NOTE',
          retrievalDate: p.retrievalDate,
          verificationStatus: p.verificationStatus,
          confidenceLevel: p.confidenceLevel
        };
        updateEnvelope(db, 'hero_adjustments', record);

        if (item.heroName) {
          const heroSlug = slugify(item.heroName);
          const matchedHero = db.heroes.records.find((h) => h.id === heroSlug);
          if (matchedHero) {
            matchedHero.patchVersion = p.version;
            matchedHero.heroSkillChanges = item.skillChanges ?? [];
            matchedHero.lastUpdated = p.retrievalDate;
          }
        }
      }
      if (p.serverScope === 'ORIGINAL_SERVER' && p.verificationStatus === 'VERIFIED') {
        db.sync_state.previousPatch = db.sync_state.currentLivePatch ?? db.sync_state.previousPatch ?? null;
        db.sync_state.currentLivePatch = p.version;
        const staleReason = `Potentially stale after approved Original Server patch ${p.version}; revalidate strategy evidence before use.`;
        for (const datasetName of ['hero_matchups', 'hero_synergies']) {
          const dataset = db[datasetName];
          let changed = false;
          for (const strategyRecord of dataset?.records ?? []) {
            if (strategyRecord.verificationStatus === 'VERIFIED' && strategyRecord.patchVersion !== p.version) {
              strategyRecord.verificationStatus = 'STALE';
              strategyRecord.potentiallyStale = true;
              strategyRecord.staleReason = staleReason;
              changed = true;
            }
          }
          if (changed) dataset.updatedAt = new Date().toISOString();
        }
      }
    } else if (change.type === 'HERO_PROFILE') {
      updateEnvelope(db, 'heroes', p);
      const role = {
        heroId: p.id, heroName: p.name, roles: p.officialRole, specialties: p.heroSpecialty,
        sourceUrl: p.sourceUrl, sourceType: p.sourceType, patchVersion: p.patchVersion,
        retrievalDate: p.retrievalDate, verificationStatus: p.verificationStatus,
        confidenceLevel: p.confidenceLevel
      };
      updateEnvelope(db, 'hero_roles', role, 'heroId');
    } else {
      throw new Error(`Jenis perubahan tidak didukung: ${change.type}`);
    }
  }

  const approvedIds = new Set(chosen.map((change) => change.id));
  db.pending_changes.records = db.pending_changes.records.filter((change) => !approvedIds.has(change.id));
  db.pending_changes.updatedAt = new Date().toISOString();
  db.sync_state.dataStatus = 'PARTIALLY VERIFIED';
  db.sync_state.lastError = null;
  return db;
}

export async function approveChanges(ids) {
  if (!Array.isArray(ids) || !ids.length) throw new Error('Pilih setidaknya satu perubahan untuk disetujui.');
  const db = await loadDatabase();
  const chosen = (db.pending_changes.records ?? []).filter((change) => ids.includes(change.id));
  if (chosen.length !== ids.length) throw new Error('Sebagian perubahan tidak ditemukan atau sudah diproses.');
  applyApprovedChanges(db, chosen);
  for (const name of DATASET_NAMES) await writeJsonAtomic(name, db[name]);
  await writeJsonAtomic('pending_changes', db.pending_changes);
  await writeJsonAtomic('sync_state', db.sync_state);
  await appendSyncLog({ at: new Date().toISOString(), level: 'info', action: 'APPROVE', summary: `${chosen.length} perubahan disetujui admin.`, changes: ids });
  return { approved: chosen.length, database: await loadDatabase() };
}

export async function makeDashboard(db) {
  if (!db) db = await loadDatabase();
  const patchRows = [...(db.patch_history.records ?? [])].sort((a, b) => String(b.releaseDate ?? '').localeCompare(String(a.releaseDate ?? '')));
  const live = db.sync_state.currentLivePatch
    ? patchRows.find((row) => row.version === db.sync_state.currentLivePatch && row.serverScope === 'ORIGINAL_SERVER' && row.verificationStatus === 'VERIFIED')
    : null;
  const originalPatches = patchRows.filter((row) => row.serverScope === 'ORIGINAL_SERVER' && row.verificationStatus === 'VERIFIED');
  const liveIndex = originalPatches.findIndex((row) => row.version === db.sync_state.currentLivePatch);
  const previousOriginalPatch = liveIndex >= 0 ? originalPatches[liveIndex + 1] ?? null : null;
  const successfulAt = db.sync_state.lastSuccessfulSync;
  const age = successfulAt ? Date.now() - new Date(successfulAt).getTime() : Infinity;
  const computedStatus = !successfulAt || age > 7 * 24 * 60 * 60 * 1000 ? 'STALE' : (db.sync_state.dataStatus ?? 'PARTIALLY VERIFIED');
  const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  return {
    currentLivePatch: live ? { version: live.version, releaseDate: live.releaseDate, sourceUrl: live.sourceUrl } : null,
    latestOfficialPatchNote: patchRows[0] ?? null,
    previousPatch: previousOriginalPatch,
    previousHistoricalPatch: patchRows[1] ?? null,
    advanceServerPatches: patchRows.filter((row) => row.serverScope === 'ADVANCE_SERVER'),
    unclassifiedPatches: patchRows.filter((row) => row.serverScope === 'UNCLASSIFIED' || row.serverScope === 'MULTI_SERVER'),
    lastSuccessfulSync: successfulAt,
    lastCheckedAt: db.sync_state.lastCheckedAt ?? null,
    dataStatus: computedStatus,
    lastError: db.sync_state.lastError ?? null,
    verifiedHeroCount: (db.heroes.records ?? []).filter((hero) => hero.verificationStatus === 'VERIFIED').length,
    partialHeroCount: (db.heroes.records ?? []).filter((hero) => hero.verificationStatus === 'PARTIALLY VERIFIED').length,
    recentChangeCount: (db.hero_adjustments.records ?? []).filter((item) => String(item.retrievalDate ?? '') >= monthAgo).length,
    pendingChangeCount: (db.pending_changes.records ?? []).length,
    sourceStatuses: db.sync_state.sourceStatuses ?? {}
  };
}

export function comparePatches(db, patchVersionA, patchVersionB) {
  const patches = [...(db.patch_history?.records ?? [])].sort((a, b) => String(b.releaseDate ?? '').localeCompare(String(a.releaseDate ?? '')));
  const patchA = patchVersionA ? patches.find((p) => p.version === patchVersionA) : patches[0] ?? null;
  const patchB = patchVersionB ? patches.find((p) => p.version === patchVersionB) : patches[1] ?? null;

  if (!patchA) return { error: 'Patch A tidak ditemukan dalam riwayat database.' };

  const getChanges = (p) => {
    if (!p) return { buffs: [], nerfs: [], adjustments: [], revamps: [], newHeroes: [], battlefield: [] };
    const adj = (db.hero_adjustments?.records ?? []).filter((r) => r.patchVersion === p.version);
    const summary = p.changeSummary ?? {};

    const heroes = adj.length
      ? adj.filter((r) => r.heroName && ['BUFF', 'NERF', 'ADJUSTMENT'].includes(r.category))
      : (summary.heroes ?? []);
    const revamps = adj.length
      ? adj.filter((r) => r.category === 'REVAMP')
      : (summary.revamps ?? []);
    const newHeroes = adj.length
      ? adj.filter((r) => r.category === 'NEW_HERO')
      : (summary.newHeroes ?? []);
    const battlefield = adj.length
      ? adj.filter((r) => ['EQUIPMENT', 'BATTLEFIELD'].includes(r.category))
      : (summary.equipmentBattlefield ?? []);

    return {
      buffs: heroes.filter((h) => (h.category || h.changeType) === 'BUFF').map((h) => ({ heroName: h.heroName, excerpt: h.excerpt })),
      nerfs: heroes.filter((h) => (h.category || h.changeType) === 'NERF').map((h) => ({ heroName: h.heroName, excerpt: h.excerpt })),
      adjustments: heroes.filter((h) => (h.category || h.changeType) === 'ADJUSTMENT').map((h) => ({ heroName: h.heroName, excerpt: h.excerpt })),
      revamps: revamps.map((r) => ({ heroName: r.heroName || r.name, excerpt: r.excerpt })),
      newHeroes: newHeroes.map((n) => ({ name: n.heroName || n.name, excerpt: n.excerpt })),
      battlefield: battlefield.map((b) => ({ section: b.section || b.heroName || 'Battlefield', excerpt: b.excerpt }))
    };
  };

  const changesA = getChanges(patchA);
  const changesB = getChanges(patchB);

  const heroNamesA = new Set([
    ...changesA.buffs.map((h) => h.heroName),
    ...changesA.nerfs.map((h) => h.heroName),
    ...changesA.adjustments.map((h) => h.heroName),
    ...changesA.revamps.map((h) => h.heroName)
  ]);
  const heroNamesB = new Set([
    ...changesB.buffs.map((h) => h.heroName),
    ...changesB.nerfs.map((h) => h.heroName),
    ...changesB.adjustments.map((h) => h.heroName),
    ...changesB.revamps.map((h) => h.heroName)
  ]);
  const commonHeroes = [...heroNamesA].filter((name) => heroNamesB.has(name));

  return {
    patchA: {
      version: patchA.version,
      title: patchA.title,
      releaseDate: patchA.releaseDate,
      serverScope: patchA.serverScope,
      verificationStatus: patchA.verificationStatus,
      sourceUrl: patchA.sourceUrl
    },
    patchB: patchB ? {
      version: patchB.version,
      title: patchB.title,
      releaseDate: patchB.releaseDate,
      serverScope: patchB.serverScope,
      verificationStatus: patchB.verificationStatus,
      sourceUrl: patchB.sourceUrl
    } : null,
    comparison: {
      a: changesA,
      b: changesB,
      commonHeroes,
      summary: {
        aTotal: changesA.buffs.length + changesA.nerfs.length + changesA.adjustments.length + changesA.revamps.length + changesA.newHeroes.length + changesA.battlefield.length,
        bTotal: changesB.buffs.length + changesB.nerfs.length + changesB.adjustments.length + changesB.revamps.length + changesB.newHeroes.length + changesB.battlefield.length
      }
    }
  };
}
