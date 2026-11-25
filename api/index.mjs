import {
  ALL_NAMES, DATASET_NAMES, appendSyncLog, approveChanges, comparePatches, loadDatabase,
  makeDashboard, queueChanges, readJson, validateDataset, writeJsonAtomic
} from '../src/data-store.mjs';
import { analyzeDraft } from '../src/draft-engine.mjs';

const sendJson = (res, status, value) => {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.end(JSON.stringify(value));
};

export default async function handler(req, res) {
  const url = new URL(req.url, `https://${req.headers.host || 'localhost'}`);
  const pathParam = url.searchParams.get('path');
  const forwarded = req.headers['x-forwarded-uri'] || req.headers['x-invoke-path'] || req.headers['x-matched-path'] || '';
  
  let pathname = url.pathname;
  if (pathParam) {
    pathname = `/api/${pathParam.replace(/^\/+/, '')}`;
  } else if (forwarded && forwarded.startsWith('/api')) {
    pathname = new URL(forwarded, 'https://localhost').pathname;
  }
  pathname = pathname.replace(/\/index\.mjs$/, '').replace(/\/+$/, '') || '/api';

  try {
    if (req.method === 'GET' && (pathname === '/api/dashboard' || pathname === '/api')) {
      const db = await loadDatabase();
      return sendJson(res, 200, { dashboard: await makeDashboard(db), database: db });
    }

    if (req.method === 'GET' && pathname === '/api/compare') {
      const patchA = url.searchParams.get('patchA') || null;
      const patchB = url.searchParams.get('patchB') || null;
      const db = await loadDatabase();
      return sendJson(res, 200, comparePatches(db, patchA, patchB));
    }

    if (req.method === 'GET' && pathname === '/api/logs') {
      return sendJson(res, 200, await readJson('sync_logs'));
    }

    if (req.method === 'GET' && pathname === '/api/export') {
      const db = await loadDatabase();
      const exported = Object.fromEntries(DATASET_NAMES.map((name) => [name, db[name]]));
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="mlbb-draft-assistant-database.json"');
      return res.end(JSON.stringify({ schemaVersion: 1, exportedAt: new Date().toISOString(), database: exported }, null, 2));
    }

    if (req.method === 'POST' && pathname === '/api/analyze') {
      let body = req.body;
      if (typeof body === 'string') {
        try { body = JSON.parse(body); } catch { body = {}; }
      }
      body = body || {};
      const db = await loadDatabase();
      return sendJson(res, 200, analyzeDraft(db, body));
    }

    if (req.method === 'POST' && pathname === '/api/sync') {
      return sendJson(res, 200, {
        success: true,
        message: 'Pada deployment cloud, sinkronisasi otomatis berjalan terjadwal via GitHub Actions (official-patch-monitor.yml) tanpa ketergantungan headless browser di serverless.',
        dashboard: await makeDashboard(await loadDatabase())
      });
    }

    if (req.method === 'POST' && pathname === '/api/approve') {
      let body = req.body;
      if (typeof body === 'string') {
        try { body = JSON.parse(body); } catch { body = {}; }
      }
      body = body || {};
      return sendJson(res, 200, await approveChanges(body.ids || []));
    }

    if (req.method === 'POST' && pathname === '/api/import') {
      let body = req.body;
      if (typeof body === 'string') {
        try { body = JSON.parse(body); } catch { body = {}; }
      }
      body = body || {};
      if (!DATASET_NAMES.includes(body.name)) throw new Error('Pilih file database yang terdaftar.');
      const valid = validateDataset(body.name, body.document);
      valid.updatedAt = new Date().toISOString();
      await writeJsonAtomic(body.name, valid);
      return sendJson(res, 200, { imported: body.name, count: valid.records.length });
    }

    return sendJson(res, 404, { error: 'API tidak ditemukan.' });
  } catch (error) {
    return sendJson(res, 400, { error: error.message || String(error) });
  }
}
