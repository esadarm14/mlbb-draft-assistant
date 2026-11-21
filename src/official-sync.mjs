import { createHash } from 'node:crypto';
import { chromium } from 'playwright';

export const OFFICIAL_SOURCES = Object.freeze({
  main: 'https://www.mobilelegends.com/',
  homeId: 'https://www.mobilelegends.com/id/home',
  patchNotes: 'https://www.mobilelegends.com/news/patch-notes',
  news: 'https://www.mobilelegends.com/news/'
});

const OFFICIAL_HOSTS = new Set(['www.mobilelegends.com', 'mobilelegends.com', 'new.mobilelegends.com']);
const ROLE_NAMES = new Set(['Tank', 'Fighter', 'Assassin', 'Mage', 'Marksman', 'Support']);
const SPECIALTIES = new Set(['Chase', 'Charge', 'Crowd Control', 'Damage', 'Finisher', 'Initiator', 'Magic', 'Poke', 'Regen', 'Support', 'Control', 'Burst', 'Guard']);
const CHALLENGE_RE = /verify (?:that )?you(?:'re| are) human|access denied|security check required|captcha required|unusual traffic/i;

export const isoDate = () => new Date().toISOString().slice(0, 10);
export const sha256 = (value) => createHash('sha256').update(String(value).replace(/\s+/g, ' ').trim()).digest('hex');
export const slugify = (value) => String(value).normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export function assertOfficialUrl(input) {
  const url = new URL(input);
  if (url.protocol !== 'https:' || !OFFICIAL_HOSTS.has(url.hostname)) {
    throw new Error(`URL di luar daftar host resmi Moonton ditolak: ${url.origin}`);
  }
  return url.href;
}

export function extractPatchEntries(text) {
  const lines = String(text).split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const entries = [];
  for (let i = 0; i < lines.length; i += 1) {
    const match = lines[i].match(/^(\d+(?:\.\d+){1,3})\s+PATCH NOTES$/i);
    if (!match) continue;
    let releaseDate = null;
    for (const next of lines.slice(i + 1, i + 7)) {
      const date = next.match(/\b(20\d{2}-\d{2}-\d{2})\b/);
      if (date) { releaseDate = date[1]; break; }
    }
    entries.push({ version: match[1], title: lines[i], releaseDate });
  }
  const seen = new Set();
  return entries.filter((entry) => !seen.has(entry.version) && seen.add(entry.version));
}

export function detectServerScope(text) {
  const lines = String(text).split(/\r?\n/).map((line) => line.trim().replace(/^#+\s*/, '').replace(/^\[|\]$/g, ''));
  const foundOriginal = lines.some((line) => /^(?:patch notes? for\s+)?original server$/i.test(line));
  const foundAdvance = lines.some((line) => /^(?:patch notes? for\s+)?advance(?:d)? server$/i.test(line));
  if (foundOriginal && foundAdvance) return 'MULTI_SERVER';
  if (foundOriginal) return 'ORIGINAL_SERVER';
  if (foundAdvance) return 'ADVANCE_SERVER';
  return 'UNCLASSIFIED';
}

function arrowLegend(text) {
  const normalized = String(text).replace(/\s+/g, ' ');
  if (/\(\s*↑\s*\)\s*\(\s*↓\s*\)\s*\(\s*~\s*\).{0,120}\bbuff\b.{0,80}\bnerf\b.{0,80}\badjustment\b/i.test(normalized)) {
    return { '↑': 'BUFF', '↓': 'NERF', '~': 'ADJUSTMENT' };
  }
  if (/\(↑\).*?(?:means|indicates|denotes|for)\s+buff.*?\(↓\).*?(?:means|indicates|denotes|for)\s+nerf.*?\(~\).*?(?:means|indicates|denotes|for)\s+adjustment/i.test(normalized)) {
    return { '↑': 'BUFF', '↓': 'NERF', '~': 'ADJUSTMENT' };
  }
  if (/uses?\s+\(↑\).*?buff.*?\(↓\).*?nerf.*?\(~\).*?adjustment/i.test(normalized)) {
    return { '↑': 'BUFF', '↓': 'NERF', '~': 'ADJUSTMENT' };
  }
  return null;
}

export function extractPatchChanges(text) {
  const lines = String(text).split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const legend = arrowLegend(text);
  const heroes = [];
  const equipmentBattlefield = [];
  const newHeroes = [];
  const revamps = [];
  const heroHeader = /^\[([^\]]+)\]\s*\(([↑↓~])\)\s*$/;
  const revampLine = /revamped hero\s*:\s*(.+)$/i;
  const newHeroLine = /^(?:new hero|hero release)\s*[:\-–]\s*(.+)$/i;

  for (let i = 0; i < lines.length; i += 1) {
    const match = lines[i].match(heroHeader);
    if (match) {
      let end = i + 1;
      while (end < lines.length && !heroHeader.test(lines[end]) && !/^#{1,3}\s+\d*\.?\s*[a-z]/i.test(lines[end])) end += 1;
      heroes.push({
        heroName: match[1].trim(),
        marker: match[2],
        changeType: legend?.[match[2]] ?? 'UNCLASSIFIED',
        excerpt: lines.slice(i, Math.min(end, i + 36)).join('\n').slice(0, 5000),
        sourceStatus: 'PARTIALLY VERIFIED'
      });
    }

    const revamp = lines[i].match(revampLine);
    if (revamp) {
      const rawName = revamp[1].split(/\s+-\s+/).at(-1).replace(/[.:;]+$/, '').trim();
      if (rawName && rawName.length < 60) revamps.push({ heroName: rawName, changeType: 'REVAMP', excerpt: lines.slice(i, i + 8).join('\n').slice(0, 1600) });
    }
    const newHero = lines[i].match(newHeroLine);
    if (newHero) newHeroes.push({ name: newHero[1].trim(), excerpt: lines.slice(i, i + 8).join('\n').slice(0, 1600) });

    const heading = lines[i].replace(/^#+\s*/, '').replace(/^\d+[.)]\s*/, '');
    if (/^(equipment|battlefield|map|turret|minion|lord|turtle)(?:\s+(?:adjustments?|changes?))?$/i.test(heading)) {
      let end = i + 1;
      while (end < lines.length && !/^#{1,3}\s+/.test(lines[end]) && !/^\d+[.)]\s+[A-Z]/.test(lines[end])) end += 1;
      equipmentBattlefield.push({ section: heading, excerpt: lines.slice(i, Math.min(end, i + 24)).join('\n').slice(0, 3000) });
    }
  }

  return {
    heroes,
    revamps,
    newHeroes,
    equipmentBattlefield,
    arrowLegendVerified: Boolean(legend),
    detectedCategories: [...new Set([
      ...heroes.map((item) => item.changeType),
      ...revamps.map(() => 'REVAMP'),
      ...newHeroes.map(() => 'NEW_HERO'),
      ...equipmentBattlefield.map((item) => /equipment/i.test(item.section) ? 'EQUIPMENT' : 'BATTLEFIELD')
    ])]
  };
}

export function parseHeroCard(card) {
  const lines = String(card.text).split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (/^hero$/i.test(lines[0] ?? '')) lines.shift();
  if (lines.length < 4) return null;
  const name = lines[0];
  if (!/^[\p{L}][\p{L} .:'’-]{1,45}$/u.test(name) || /^(hero|more|news|patch)$/i.test(name)) return null;
  const roles = [];
  const specialties = [];
  let idx = 1;
  while (idx < lines.length && roles.length < 3 && ROLE_NAMES.has(lines[idx])) roles.push(lines[idx++]);
  while (idx < lines.length && specialties.length < 4 && SPECIALTIES.has(lines[idx])) specialties.push(lines[idx++]);
  if (!roles.length) return null;
  const skillsText = lines.slice(idx).filter((line) => !['Durability', 'Offense', 'Ability Effects', 'Difficulty', 'More Info'].includes(line)).join('\n').trim();
  return {
    id: slugify(name), heroId: null, name,
    officialPortrait: card.portrait || null,
    officialRole: roles,
    heroSpecialty: specialties,
    skillsText: skillsText || null,
    releaseStatus: 'UNVERIFIED OFFICIAL DATA',
    patchVersion: null,
    lastUpdated: isoDate(),
    sourceUrl: OFFICIAL_SOURCES.homeId,
    sourceType: 'OFFICIAL_HERO_PAGE',
    retrievalDate: isoDate(),
    verificationStatus: specialties.length ? 'PARTIALLY VERIFIED' : 'UNVERIFIED',
    confidenceLevel: specialties.length ? 0.75 : 0.45,
    notes: 'Diambil dari kartu yang tampil di beranda resmi. Halaman ini bukan roster lengkap; ID dan status rilis tidak ditebak.'
  };
}

async function renderedText(page, url, { minChars = 60 } = {}) {
  const safeUrl = assertOfficialUrl(url);
  const response = await page.goto(safeUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
  if (response && (response.status() < 200 || response.status() >= 400)) throw new Error(`HTTP ${response.status()} pada ${safeUrl}`);
  try {
    await page.waitForFunction((min) => (document.body?.innerText?.trim().length || 0) >= min, minChars, { timeout: 25000 });
  } catch {
    throw new Error(`Konten publik tidak dapat dirender/diambil dari ${safeUrl}; data terakhir dipertahankan.`);
  }
  // Respect the site's choice to reject non-essential cookies; do not accept all by default.
  // A full-screen policy notice may cover this control, in which case do not force a click.
  const policyNotice = page.locator('#mt-cb-policy');
  const policyNoticeVisible = await policyNotice.isVisible().catch(() => false);
  if (!policyNoticeVisible) {
    const rejectCookies = page.getByText('Reject All', { exact: true }).first();
    if (await rejectCookies.isVisible().catch(() => false)) {
      await rejectCookies.click({ timeout: 5000 }).catch(() => {});
      await page.waitForTimeout(250);
    }
  }
  const finalUrl = assertOfficialUrl(page.url());
  const text = await page.locator('body').innerText();
  if (CHALLENGE_RE.test(text)) throw new Error(`Halaman meminta pemeriksaan akses atau CAPTCHA pada ${finalUrl}; sinkronisasi dihentikan tanpa bypass.`);
  return { text, finalUrl, status: response?.status() ?? 200 };
}

async function readHeroCards(page) {
  await page.waitForFunction(() => [...document.querySelectorAll('.swiper-slide')].some((el) => (el.innerText || '').trim().length > 40), null, { timeout: 15000 }).catch(() => {});
  const cards = await page.locator('.swiper-slide').evaluateAll((nodes) => nodes.map((el) => ({
    text: el.innerText || '',
    portrait: [...el.querySelectorAll('img')].find((img) => img.alt === 'painting')?.src || null
  })));
  const byName = new Map();
  for (const card of cards) {
    const parsed = parseHeroCard(card);
    if (parsed && !byName.has(parsed.id)) byName.set(parsed.id, parsed);
  }
  return [...byName.values()];
}

async function openLatestPatchArticle(page, entry) {
  if (await page.locator('#mt-cb-policy').isVisible().catch(() => false)) {
    throw new Error('Dialog Privacy Policy Update menutupi kontrol halaman resmi; sinkronisasi artikel dihentikan tanpa menutup atau menyetujui dialog.');
  }
  const previousUrl = page.url();
  const titleLocator = page.getByText(entry.title, { exact: true }).first();
  try {
    await titleLocator.click({ timeout: 15000 });
    await page.waitForTimeout(1200);
  } catch (error) {
    throw new Error(`Kartu patch resmi tidak dapat dibuka melalui interaksi normal: ${error.message.slice(0, 160)}`);
  }
  const finalUrl = assertOfficialUrl(page.url());
  if (finalUrl === previousUrl || !/\/news\/articleldetail\b/i.test(new URL(finalUrl).pathname)) {
    throw new Error('Kartu patch tidak membuka artikel detail resmi; tidak mencoba endpoint lain.');
  }
  const articleText = await page.locator('body').innerText();
  if (CHALLENGE_RE.test(articleText)) throw new Error('Artikel meminta pemeriksaan akses/CAPTCHA; proses dihentikan tanpa bypass.');
  if (!articleText.toUpperCase().includes('PATCH NOTES')) throw new Error('Halaman artikel tidak cocok dengan patch notes yang dipilih.');
  return { articleText, articleUrl: finalUrl };
}

export async function monitorOfficialSources({ database, onProgress = () => {} } = {}) {
  const checkedAt = new Date().toISOString();
  const result = { checkedAt, sources: {}, pendingChanges: [], warnings: [], latestPatch: null, heroCards: [] };
  let browser;
  try {
    browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
    const context = await browser.newContext({ locale: 'en-US', timezoneId: 'Asia/Jakarta' });
    const page = await context.newPage();
    page.setDefaultNavigationTimeout(60000);
    page.setDefaultTimeout(15000);

    for (const [key, url] of [['main', OFFICIAL_SOURCES.main], ['news', OFFICIAL_SOURCES.news]]) {
      try {
        const read = await renderedText(page, url, { minChars: 40 });
        result.sources[key] = { url: read.finalUrl, httpStatus: read.status, ok: true, checkedAt };
      } catch (error) {
        result.sources[key] = { url, ok: false, checkedAt, error: error.message };
        result.warnings.push(error.message);
      }
    }

    let patchPageRead = null;
    try {
      patchPageRead = await renderedText(page, OFFICIAL_SOURCES.patchNotes, { minChars: 100 });
      result.sources.patchNotes = { url: patchPageRead.finalUrl, httpStatus: patchPageRead.status, ok: true, checkedAt };
      const entries = extractPatchEntries(patchPageRead.text);
      result.latestPatch = entries[0] ?? null;
      result.patchEntries = entries;
      if (!entries.length) throw new Error('Tidak ada judul patch notes yang dapat dikenali pada halaman resmi.');
      onProgress({ phase: 'patch-index', patch: result.latestPatch });

      const latest = entries[0];
      const current = (database?.patch_history?.records ?? []).find((row) => row.version === latest.version);
      let article = null;
      if (!current?.articleHash) article = await openLatestPatchArticle(page, latest);
      else {
        // Re-read the latest official article through its visible index card once per sync to detect public edits.
        article = await openLatestPatchArticle(page, latest);
      }
      const articleHash = sha256(article.articleText);
      const scope = detectServerScope(article.articleText);
      const parsedChanges = extractPatchChanges(article.articleText);
      const patchChanged = !current || current.articleHash !== articleHash || current.releaseDate !== latest.releaseDate;
      if (patchChanged) {
        result.pendingChanges.push({
          id: `patch-${slugify(latest.version)}-${articleHash.slice(0, 10)}`,
          type: 'PATCH_ARTICLE',
          title: `Patch note resmi ${latest.version}: tinjau perubahan terdeteksi`,
          status: 'PENDING_REVIEW',
          proposed: {
            id: `patch-${slugify(latest.version)}`,
            version: latest.version,
            title: latest.title,
            releaseDate: latest.releaseDate,
            serverScope: scope,
            articleHash,
            changeSummary: parsedChanges,
            sourceUrl: article.articleUrl,
            sourceType: 'OFFICIAL_PATCH_NOTE',
            patchVersion: latest.version,
            retrievalDate: isoDate(),
            verificationStatus: scope === 'UNCLASSIFIED' ? 'PARTIALLY VERIFIED' : 'VERIFIED',
            confidenceLevel: 0.82,
            notes: scope === 'UNCLASSIFIED'
              ? 'Artikel resmi terdeteksi, tetapi tidak mencantumkan heading Original Server/Advance Server yang eksplisit. Tidak ditetapkan sebagai patch live.'
              : 'Cakupan server dibaca dari heading yang tertulis eksplisit pada artikel resmi.'
          }
        });
      }
      result.article = { ...article, articleHash, serverScope: scope, parsedChanges };
    } catch (error) {
      result.sources.patchNotes = { url: OFFICIAL_SOURCES.patchNotes, ok: false, checkedAt, error: error.message };
      result.warnings.push(error.message);
    }

    try {
      const home = await renderedText(page, OFFICIAL_SOURCES.homeId, { minChars: 100 });
      const heroCards = await readHeroCards(page);
      result.heroCards = heroCards;
      result.sources.homeId = { url: home.finalUrl, httpStatus: home.status, ok: heroCards.length > 0, checkedAt, recordsFound: heroCards.length };
      const known = new Map((database?.heroes?.records ?? []).map((row) => [row.id, row]));
      for (const hero of heroCards) {
        const old = known.get(hero.id);
        const stableCurrent = old && JSON.stringify({ n: old.name, r: old.officialRole, s: old.heroSpecialty, p: old.officialPortrait, k: old.skillsText ?? null }) === JSON.stringify({ n: hero.name, r: hero.officialRole, s: hero.heroSpecialty, p: hero.officialPortrait, k: hero.skillsText ?? null });
        if (!stableCurrent) result.pendingChanges.push({
          id: `hero-${hero.id}-${sha256(JSON.stringify(hero)).slice(0, 10)}`,
          type: 'HERO_PROFILE',
          title: `Hero resmi ${hero.name}: profil perlu ditinjau`,
          status: 'PENDING_REVIEW',
          proposed: hero
        });
      }
      if (!heroCards.length) result.warnings.push('Halaman resmi tidak menampilkan kartu hero yang bisa diparse; daftar hero terakhir tidak dihapus.');
    } catch (error) {
      result.sources.homeId = { url: OFFICIAL_SOURCES.homeId, ok: false, checkedAt, error: error.message };
      result.warnings.push(error.message);
    }

    result.success = ['main', 'news', 'patchNotes', 'homeId'].every((key) => Boolean(result.sources[key]?.ok));
    result.partial = !result.success;
    if (!result.success) result.error = 'Tidak ada sumber resmi utama yang berhasil dibaca; data terakhir yang valid harus dipertahankan.';
    return result;
  } catch (error) {
    result.success = false;
    result.error = error.message;
    result.warnings.push(error.message);
    return result;
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
}
