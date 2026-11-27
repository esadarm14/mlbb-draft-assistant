import { NextResponse } from 'next/server';
import { MLBB_HEROES } from '@/lib/database/heroesData';
import { META_PATCH_INFO, type LiveMetaOverride } from '@/lib/database/metaData';

const heroByName = new Map(MLBB_HEROES.map((h) => [h.name.toLowerCase(), h.id]));

const RANK_PARAM: Record<string, string> = {
  Epic: 'epic',
  Legend: 'legend',
  Mythic: 'mythic',
  'Mythical Honor': 'honor',
  'Mythical Glory': 'glory',
  'Mythical Immortal': 'glory',
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tier = searchParams.get('tier') || 'Mythic';
  const rankParam = RANK_PARAM[tier] || 'mythic';
  const syncedAt = new Date().toISOString();

  // Attempt fast live fetch from community Moonton rank stats mirror
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3500);
    const res = await fetch(`https://mlbb-stats.ridwaanhall.com/api/hero-rank/?days=1&rank=${rankParam}&size=135&index=1&sort_field=ban_rate&sort_order=desc`, {
      signal: controller.signal,
      next: { revalidate: 3600 },
    });
    clearTimeout(timer);

    if (res.ok) {
      const json = (await res.json()) as {
        data?: {
          records?: Array<{
            data?: {
              main_hero?: { data?: { name?: string } };
              main_hero_ban_rate?: number;
              main_hero_appearance_rate?: number;
              main_hero_win_rate?: number;
            };
          }>;
        };
      };

      const records = json?.data?.records;
      if (Array.isArray(records) && records.length > 0) {
        const overrides: Record<string, LiveMetaOverride> = {};
        for (const rec of records) {
          const name = rec?.data?.main_hero?.data?.name?.toLowerCase();
          const heroId = name ? heroByName.get(name) : undefined;
          if (!heroId) continue;
          const banRate = rec.data?.main_hero_ban_rate;
          const pickRate = rec.data?.main_hero_appearance_rate;
          const winRate = rec.data?.main_hero_win_rate;
          overrides[heroId] = {
            banRate: typeof banRate === 'number' ? Number((banRate * 100).toFixed(1)) : undefined,
            pickRate: typeof pickRate === 'number' ? Number((pickRate * 100).toFixed(1)) : undefined,
            winRate: typeof winRate === 'number' ? Number((winRate * 100).toFixed(1)) : undefined,
          };
        }

        if (Object.keys(overrides).length > 10) {
          return NextResponse.json({
            ok: true,
            live: true,
            tier,
            patch: META_PATCH_INFO.patch,
            source: 'Live Moonton Rank Stats API',
            syncedAt,
            count: Object.keys(overrides).length,
            overrides,
          });
        }
      }
    }
  } catch {
    // Fallback cleanly to curated snapshot
  }

  return NextResponse.json({
    ok: true,
    live: false,
    tier,
    patch: META_PATCH_INFO.patch,
    source: `${META_PATCH_INFO.source} (${META_PATCH_INFO.updatedAt})`,
    syncedAt,
    count: 0,
    overrides: {},
  });
}
