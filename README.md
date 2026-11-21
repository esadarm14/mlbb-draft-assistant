# MLBB Draft Assistant — Official Data Center

Aplikasi local-first untuk mengelola data MLBB dengan prioritas sumber resmi Moonton. Fakta hero/patch dan analisis strategi dipisahkan; temuan otomatis tidak diterapkan sebelum ditinjau.

## Jalankan lokal

```bash
npm install
npx playwright install chromium
npm start
```

Buka `http://127.0.0.1:8787`. Server sengaja hanya bind ke localhost; jangan ubah ke alamat publik tanpa menambahkan autentikasi, rate limiting, dan hardening. Tombol **Sync Now** membaca halaman publik resmi dengan browser biasa. Tidak ada login, CAPTCHA bypass, atau endpoint API tak terdokumentasi. Jika halaman gagal, data valid terakhir tetap disimpan dan status menjadi stale.

## Sinkronisasi otomatis

Workflow `.github/workflows/official-patch-monitor.yml` memeriksa sumber setiap hari pukul 10.00 WIB dan dapat dijalankan manual dari GitHub Actions. Workflow merender halaman publik, mengklik kartu patch yang terlihat, lalu mengusulkan perubahan database melalui branch dan Pull Request. Workflow tidak menulis langsung ke `main`; review dan merge PR menjadi persetujuan untuk menerapkan perubahan. GitHub Actions memakai `GITHUB_TOKEN` bawaan, tidak membutuhkan secret tambahan.

## Database JSON

- `heroes.json`, `hero_skills.json`, `hero_roles.json`
- `patch_history.json`, `hero_adjustments.json`
- `hero_matchups.json`, `hero_synergies.json`, `draft_rules.json`
- `source_registry.json`
- `sync_state.json`, `sync_logs.json`, `pending_changes.json` untuk status operasional lokal

Setiap record faktual menyertakan `sourceUrl`, `sourceType`, `patchVersion`, `retrievalDate`, `verificationStatus`, dan `confidenceLevel`. Status yang digunakan: `VERIFIED`, `PARTIALLY VERIFIED`, `UNVERIFIED`, dan `STALE`.

## Patch server & kelengkapan data

Indeks Moonton yang diperiksa memuat judul patch dan tanggal, tetapi tidak selalu menamai Original Server atau Advance Server. Versi tanpa penanda server eksplisit tetap `UNCLASSIFIED` dan **tidak** ditampilkan sebagai Current Live Patch. Jika dialog privasi atau persetujuan menutupi kontrol halaman, monitor berhenti tanpa menyetujui dialog atau memaksa interaksi; data terakhir tetap dipertahankan. Data awal memuat kartu hero yang tampak pada beranda resmi, bukan klaim roster lengkap; Hero ID, portrait, status rilis, dan label skill yang tidak tersaji eksplisit tetap ditandai belum terverifikasi.

## Review dan import

Pada tab **Admin Data**, hasil sync masuk antrean pending. **Approve selected** menerapkan perubahan terpilih ke file JSON setelah pemeriksaan. Manual JSON Import memvalidasi schema dan metadata; data faktual hanya boleh menggunakan HTTPS dari domain resmi Moonton. **Export Database** mengunduh seluruh berkas database.

## Strategi draft

Counter, synergy, ban, komposisi, dan rekomendasi adalah analisis AI/algoritma—bukan rekomendasi resmi Moonton. Engine hanya memberi saran jika ada record matchup/synergy terverifikasi. Setelah patch Original Server terverifikasi disetujui, record strategi dari patch lama ditandai `STALE` dan tidak dipakai sampai ditinjau ulang. Buff saja tidak menaikkan tier hero. Basis awal matchup dan synergy sengaja kosong daripada diisi dengan data tidak resmi atau rekaan.

## Uji dan validasi

```bash
npm test
npm run validate
```

`npm run ci:proposal` adalah langkah internal GitHub Actions; ia hanya membuat proposal setelah semua sumber inti berhasil dibaca, dan tidak menulis ke `main` secara langsung.
