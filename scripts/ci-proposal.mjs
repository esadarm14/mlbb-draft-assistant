import { appendFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { loadDatabase, queueChanges, approveChanges } from '../src/data-store.mjs';
import { monitorOfficialSources } from '../src/official-sync.mjs';
import { proposalChangesForSync } from '../src/sync-state.mjs';

const database = await loadDatabase();
const result = await monitorOfficialSources({ database });
const changes = proposalChangesForSync(result);
const output = process.env.GITHUB_OUTPUT;
if (output) await appendFile(output, `changes=${changes.length}\n`, 'utf8');

if (!result.success) {
  const details = [
    'Pengecekan sumber resmi tidak lengkap; database dan branch review tidak diubah.',
    ...(result.error ? [`Kesalahan: ${result.error}`] : []),
    ...(result.warnings ?? []).map((warning) => `- ${warning}`)
  ].join('\n');
  console.warn(details);
  if (process.env.GITHUB_STEP_SUMMARY) await appendFile(process.env.GITHUB_STEP_SUMMARY, `${details}\n`, 'utf8');
  process.exit(0);
}

if (!changes.length) {
  console.log('Tidak ada perubahan resmi baru yang dapat diusulkan. Database tetap tidak berubah.');
  if (process.env.GITHUB_STEP_SUMMARY) await appendFile(process.env.GITHUB_STEP_SUMMARY, 'Tidak ada perubahan resmi baru. Database utama tidak diubah.\n', 'utf8');
  process.exit(0);
}

await queueChanges(changes);
// In CI, applying only to the temporary proposal branch is safe: main is untouched until a human merges the PR.
await approveChanges(changes.map((change) => change.id));
const lines = [
  '# Tinjauan perubahan data resmi MLBB',
  '',
  'Perubahan berikut diproses dari halaman publik Moonton. Perubahan hanya akan masuk ke database utama setelah Pull Request ini ditinjau dan di-merge.',
  '',
  `Waktu pengecekan: ${result.checkedAt}`,
  `Patch terbaru di indeks resmi: ${result.latestPatch?.version ?? 'tidak terdeteksi'}`,
  '',
  '## Perubahan yang diusulkan',
  ...changes.map((item) => {
    const p = item.proposed;
    if (item.type === 'PATCH_ARTICLE') {
      const c = p.changeSummary ?? {};
      return `- **Patch ${p.version}** — server: **${p.serverScope}**; verifikasi: **${p.verificationStatus}**; hero changes: ${c.heroes?.length ?? 0}; revamp: ${c.revamps?.length ?? 0}; hero baru: ${c.newHeroes?.length ?? 0}; equipment/battlefield: ${c.equipmentBattlefield?.length ?? 0}. [Sumber resmi](${p.sourceUrl})`;
    }
    return `- **Hero ${p.name}** — role: ${(p.officialRole ?? []).join(', ') || 'belum diketahui'}; verifikasi: **${p.verificationStatus}**. [Sumber resmi](${p.sourceUrl})`;
  }),
  '',
  '## Pemeriksaan penting',
  '- `UNCLASSIFIED` tidak ditetapkan sebagai Current Live Patch. Advance Server hanya dipisahkan jika artikel menyebutkannya secara eksplisit.',
  '- Label dan perubahan diturunkan dari teks artikel resmi yang tampil di halaman; tidak ada API tak terdokumentasi yang dipanggil.',
  '- Tinjau perubahan dan sumber sebelum merge. Merge PR adalah persetujuan untuk menerapkan database pada branch utama.',
  ...(result.warnings.length ? ['', '## Peringatan', ...result.warnings.map((warning) => `- ${warning}`)] : [])
];
const report = lines.join('\n');
const reportPath = path.join(process.env.RUNNER_TEMP || tmpdir(), 'mlbb-official-review.md');
await writeFile(reportPath, report, 'utf8');
if (output) await appendFile(output, `report=${reportPath}\n`, 'utf8');
if (process.env.GITHUB_STEP_SUMMARY) await appendFile(process.env.GITHUB_STEP_SUMMARY, `${report}\n`, 'utf8');
console.log(`Perubahan pending: ${changes.length}; diterapkan hanya pada working tree branch PR.`);
