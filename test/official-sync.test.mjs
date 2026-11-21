import test from 'node:test';
import assert from 'node:assert/strict';
import {
  assertOfficialUrl,
  detectServerScope,
  extractPatchChanges,
  extractPatchEntries,
  parseHeroCard
} from '../src/official-sync.mjs';

 test('patch index parser reads versions and dates while removing duplicate cards', () => {
  const page = `
2.2.16 PATCH NOTES
2026-09-16
2.2.16 PATCH NOTES
2026-09-16
2.1.88 PATCH NOTES
2026-06-17
`;
  assert.deepEqual(extractPatchEntries(page), [
    { version: '2.2.16', title: '2.2.16 PATCH NOTES', releaseDate: '2026-09-16' },
    { version: '2.1.88', title: '2.1.88 PATCH NOTES', releaseDate: '2026-06-17' }
  ]);
});

test('hero card parser keeps visible official facts and leaves unknown values explicit', () => {
  const hero = parseHeroCard({
    text: 'Kalea\nSupport\nFighter\nControl\nRegen\nSurge of Life\nAfter casting a skill, Kalea creates a Water Zone on the ground.',
    portrait: 'https://akmweb.youngjoygame.com/web/gms/image/example.jpg'
  });
  assert.equal(hero.name, 'Kalea');
  assert.deepEqual(hero.officialRole, ['Support', 'Fighter']);
  assert.deepEqual(hero.heroSpecialty, ['Control', 'Regen']);
  assert.equal(hero.heroId, null);
  assert.equal(hero.releaseStatus, 'UNVERIFIED OFFICIAL DATA');
  assert.equal(hero.skillsText.includes('Surge of Life'), true);
});

test('server scope is assigned only by explicit standalone headings', () => {
  assert.equal(detectServerScope('PATCH NOTES FOR ORIGINAL SERVER\nHero adjustments'), 'ORIGINAL_SERVER');
  assert.equal(detectServerScope('Advance Server\nHero adjustments'), 'ADVANCE_SERVER');
  assert.equal(detectServerScope('This note mentions Original Server in a sentence.'), 'UNCLASSIFIED');
  assert.equal(detectServerScope('Original Server\nAdvance Server'), 'MULTI_SERVER');
});

test('patch legend in the official order maps arrows to buff, nerf, and adjustment', () => {
  const article = `
The marks (↑) (↓) (~) are used for hero changes: Buff, Nerf, and Adjustment.
[Ling] (↑)
Skill 1: cooldown reduced from 10s to 9s.
[Hanabi] (↓)
Basic attack damage reduced.
[Lesley] (~)
Ultimate damage adjusted while its cooldown remains unchanged.
`;
  const parsed = extractPatchChanges(article);
  assert.equal(parsed.arrowLegendVerified, true);
  assert.deepEqual(parsed.heroes.map((hero) => [hero.heroName, hero.changeType]), [
    ['Ling', 'BUFF'], ['Hanabi', 'NERF'], ['Lesley', 'ADJUSTMENT']
  ]);
});

test('public official host validation rejects non-Moonton and insecure URLs', () => {
  assert.equal(assertOfficialUrl('https://new.mobilelegends.com/news/articleldetail?newsid=1'), 'https://new.mobilelegends.com/news/articleldetail?newsid=1');
  assert.throws(() => assertOfficialUrl('https://example.org/news'), /di luar daftar host resmi/);
  assert.throws(() => assertOfficialUrl('http://www.mobilelegends.com/'), /di luar daftar host resmi/);
});
