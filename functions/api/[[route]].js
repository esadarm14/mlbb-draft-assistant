import { getStaticDatabase } from '../../src/static-db.mjs';
import { makeDashboard, comparePatches } from '../../src/data-store.mjs';
import { analyzeDraft } from '../../src/draft-engine.mjs';

function jsonResponse(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      ...headers
    }
  });
}

export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);
  const pathname = url.pathname;
  const method = request.method;

  try {
    const db = getStaticDatabase();

    if (method === 'GET' && (pathname === '/api/dashboard' || pathname === '/api')) {
      return jsonResponse({
        dashboard: await makeDashboard(db),
        database: db
      });
    }

    if (method === 'GET' && pathname === '/api/compare') {
      const patchA = url.searchParams.get('patchA') || null;
      const patchB = url.searchParams.get('patchB') || null;
      return jsonResponse(comparePatches(db, patchA, patchB));
    }

    if (method === 'GET' && pathname === '/api/logs') {
      return jsonResponse(db.sync_logs || { schemaVersion: 1, records: [] });
    }

    if (method === 'GET' && pathname === '/api/export') {
      const exportedNames = [
        'heroes', 'hero_skills', 'patch_history', 'hero_adjustments', 'hero_roles',
        'hero_matchups', 'hero_synergies', 'draft_rules', 'source_registry'
      ];
      const exported = Object.fromEntries(exportedNames.map((name) => [name, db[name]]));
      return new Response(JSON.stringify({ schemaVersion: 1, exportedAt: new Date().toISOString(), database: exported }, null, 2), {
        status: 200,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Content-Disposition': 'attachment; filename="mlbb-draft-assistant-database.json"'
        }
      });
    }

    if (method === 'POST' && pathname === '/api/analyze') {
      const body = await request.json().catch(() => ({}));
      return jsonResponse(analyzeDraft(db, body));
    }

    if (method === 'POST' && pathname === '/api/sync') {
      return jsonResponse({
        success: true,
        message: 'Pada Cloudflare Pages, sinkronisasi otomatis dijalankan setiap hari oleh GitHub Actions dan dideploy secara otomatis via git.',
        dashboard: await makeDashboard(db)
      });
    }

    return jsonResponse({ error: 'API endpoint tidak ditemukan.' }, 404);
  } catch (error) {
    return jsonResponse({ error: error.message || String(error) }, 400);
  }
}
