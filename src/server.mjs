import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  ALL_NAMES, DATASET_NAMES, appendSyncLog, approveChanges, comparePatches, loadDatabase,
  makeDashboard, queueChanges, readJson, validateDataset, writeJsonAtomic
} from './data-store.mjs';
import { monitorOfficialSources } from './official-sync.mjs';
import { analyzeDraft } from './draft-engine.mjs';
import { mergeSyncState } from './sync-state.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PUBLIC_DIR = path.join(ROOT, 'public');
const HOST = process.env.HOST || '127.0.0.1';
const PORT = Number(process.env.PORT || 8787);
const MAX_BODY = 1_000_000;
let syncInFlight = false;

const sendJson = (res, status, value) => {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
  res.end(JSON.stringify(value));
};
const sendError = (res, error, status = 400) => sendJson(res, status, { error: error.message || String(error) });

function assertLocalRequest(req) {
  const remote = req.socket.remoteAddress || '';
  if (!['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(remote)) throw new Error('Endpoint admin hanya menerima koneksi lokal.');
  const origin = req.headers.origin;
  if (origin) {
    const host = new URL(origin).hostname;
    if (!['127.0.0.1', 'localhost', '::1'].includes(host)) throw new Error('Origin tidak diizinkan.');
  }
}

async function readBody(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY) throw new Error('Ukuran request melebihi batas 1 MB.');
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
}

async function runSync() {
  if (syncInFlight) throw new Error('Sinkronisasi sedang berjalan.');
  syncInFlight = true;
  const started = Date.now();
  const before = await loadDatabase();
  try {
    const result = await monitorOfficialSources({ database: before });
    const currentState = mergeSyncState(await readJson('sync_state'), result);
    await writeJsonAtomic('sync_state', currentState);
    const pending = await queueChanges(result.pendingChanges);
    const log = {
      at: result.checkedAt,
      level: result.success ? (result.partial ? 'warning' : 'info') : 'error',
      action: 'SYNC',
      durationMs: Date.now() - started,
      success: result.success,
      partial: result.partial,
      detectedChangeCount: result.pendingChanges.length,
      warnings: result.warnings,
      sourceStatuses: result.sources
    };
    await appendSyncLog(log);
    return { ...result, pendingChangeCount: pending.records.length, dashboard: await makeDashboard(await loadDatabase()) };
  } finally {
    syncInFlight = false;
  }
}

async function serveStatic(req, res, url) {
  let pathname = decodeURIComponent(url.pathname);
  if (pathname === '/') pathname = '/index.html';
  const target = path.resolve(PUBLIC_DIR, `.${pathname}`);
  if (!target.startsWith(`${PUBLIC_DIR}${path.sep}`)) return sendJson(res, 403, { error: 'Path tidak diizinkan.' });
  try {
    const fileStat = await stat(target);
    if (!fileStat.isFile()) return sendJson(res, 404, { error: 'Tidak ditemukan.' });
    const ext = path.extname(target);
    const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml' };
    res.writeHead(200, { 'Content-Type': types[ext] || 'application/octet-stream', 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'no-cache' });
    res.end(await readFile(target));
  } catch { sendJson(res, 404, { error: 'Tidak ditemukan.' }); }
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || '127.0.0.1'}`);
  try {
    if (url.pathname.startsWith('/api/')) {
      if (req.method === 'GET' && url.pathname === '/api/dashboard') {
        const db = await loadDatabase();
        return sendJson(res, 200, { dashboard: await makeDashboard(db), database: db });
      }
      if (req.method === 'GET' && url.pathname === '/api/logs') return sendJson(res, 200, await readJson('sync_logs'));
      if (req.method === 'GET' && url.pathname === '/api/compare') {
        const patchA = url.searchParams.get('patchA') || null;
        const patchB = url.searchParams.get('patchB') || null;
        const db = await loadDatabase();
        return sendJson(res, 200, comparePatches(db, patchA, patchB));
      }
      if (req.method === 'GET' && url.pathname === '/api/export') {
        const db = await loadDatabase();
        const exported = Object.fromEntries(DATASET_NAMES.map((name) => [name, db[name]]));
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Content-Disposition': 'attachment; filename="mlbb-draft-assistant-database.json"', 'X-Content-Type-Options': 'nosniff' });
        return res.end(JSON.stringify({ schemaVersion: 1, exportedAt: new Date().toISOString(), database: exported }, null, 2));
      }
      if (req.method === 'POST') assertLocalRequest(req);
      if (req.method === 'POST' && url.pathname === '/api/sync') return sendJson(res, 200, await runSync());
      if (req.method === 'POST' && url.pathname === '/api/approve') {
        const body = await readBody(req);
        return sendJson(res, 200, await approveChanges(body.ids));
      }
      if (req.method === 'POST' && url.pathname === '/api/import') {
        const body = await readBody(req);
        if (!DATASET_NAMES.includes(body.name)) throw new Error('Pilih file database yang terdaftar.');
        const valid = validateDataset(body.name, body.document);
        valid.updatedAt = new Date().toISOString();
        await writeJsonAtomic(body.name, valid);
        await appendSyncLog({ at: new Date().toISOString(), level: 'info', action: 'IMPORT', summary: `Import manual ${body.name}.json`, records: valid.records.length });
        return sendJson(res, 200, { imported: body.name, count: valid.records.length });
      }
      if (req.method === 'POST' && url.pathname === '/api/analyze') {
        const body = await readBody(req);
        return sendJson(res, 200, analyzeDraft(await loadDatabase(), body));
      }
      return sendJson(res, 404, { error: 'API tidak ditemukan.' });
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') return sendJson(res, 405, { error: 'Method tidak didukung.' });
    return await serveStatic(req, res, url);
  } catch (error) {
    return sendError(res, error, /Origin|koneksi lokal/i.test(error.message) ? 403 : 400);
  }
});

server.listen(PORT, HOST, () => {
  console.log(`MLBB Draft Assistant berjalan di http://${HOST}:${PORT}`);
  console.log('Admin API hanya diikat ke localhost; jangan expose ke internet tanpa autentikasi dan deployment hardening.');
});
