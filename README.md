# MLBB Draft Assistant (Mobile-First Web App)

Asisten draft **Mobile Legends: Bang Bang** berbasis web yang dioptimalkan khusus untuk browser smartphone (portrait, navigasi bawah ramah satu tangan, tanpa perlu install APK) — dapat dibuka langsung atau ditambahkan ke Layar Utama (*Add to Home Screen*).

## Fitur Utama

- **Hero Autocomplete & Chip Selection**: Pencarian cepat sebagian nama, tidak peka huruf besar/kecil, filter role, *recent search*, anti-duplikat, dan hapus per-chip (`×`).
- **My Hero Power**: Simpan daftar hero andalan per lane (`EXP Lane`, `Jungle`, `Mid Lane`, `Gold Lane`, `Roam`) beserta tingkat penguasaan (`Main Hero`, `Highly Mastered`, `Comfortable`, `Backup Hero`) dan prioritas. Tersimpan otomatis di perangkat (`localStorage`).
- **Draft Simulator Berbasis Tier**: Dukungan jumlah ban per tier (`Epic` 3 ban, `Legend` 4 ban, `Mythic` s.d. `Mythical Immortal` 5 ban), dengan rekomendasi **Best Hero Power** dan **Best Counter Pick**.
- **Smart Counter Analyzer**: Analisis counter kontekstual (`Best Counter`, `Alternative Counter`, `Situational Counter`) beserta kelebihan, kekurangan, dan risiko.
- **Smart Combo Suggestion & Phase Analyzer**: 3 saran komposisi combo tim terbaik, kekuatan fase *Early / Mid / Late game*, serta *Win Condition*.

## Branch Cadangan

- `backup/web-version` — versi web statis awal + Vercel API routes (`v1.0-web`).
- `backup/mobile-expo` — versi React Native / Expo Android mobile app.

## Menjalankan Secara Lokal

```bash
npm install
npm run dev
```

> Catatan: Analisis strategi dihasilkan otomatis berdasarkan atribut dan kemampuan hero dalam database lokal (bukan statistik resmi Moonton).
