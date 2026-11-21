const AI_LABEL = 'AI GENERATED STRATEGIC ANALYSIS';

export function analyzeDraft(database, { ally = [], enemy = [], candidates = [] } = {}) {
  const verifiedHeroes = (database.heroes?.records ?? []).filter((hero) => hero.verificationStatus === 'VERIFIED');
  const allMatchups = database.hero_matchups?.records ?? [];
  const allSynergies = database.hero_synergies?.records ?? [];
  const staleStrategyCount = [...allMatchups, ...allSynergies].filter((row) => row.verificationStatus === 'STALE' || row.potentiallyStale).length;
  const matchups = allMatchups.filter((row) => row.verificationStatus === 'VERIFIED' && !row.potentiallyStale);
  const synergies = allSynergies.filter((row) => row.verificationStatus === 'VERIFIED' && !row.potentiallyStale);
  const available = candidates.length ? candidates : verifiedHeroes.map((hero) => hero.id);
  const evidence = matchups.length + synergies.length;
  const warnings = ['Analisis ini dihasilkan AI/algoritma dan bukan rekomendasi resmi Moonton.', 'Buff saja tidak menaikkan tier hero.'];
  if (staleStrategyCount) warnings.push(`${staleStrategyCount} record strategi ditandai STALE setelah patch Original Server; validasi ulang sebelum digunakan.`);

  if (!available.length || !evidence) {
    return {
      label: AI_LABEL,
      status: 'INSUFFICIENT_VERIFIED_DATA',
      recommendations: [],
      message: 'Belum ada data matchup/synergy yang terverifikasi untuk memberi rekomendasi. Sistem tidak akan mengarang counter atau sinergi.',
      warnings: [...warnings, 'Belum ada data matchup/synergy yang terverifikasi untuk memberi rekomendasi.']
    };
  }

  const rows = available.map((heroId) => {
    let score = 0;
    const reasons = [];
    for (const enemyId of enemy) {
      for (const row of matchups) {
        if (row.heroId === heroId && row.enemyHeroId === enemyId && Number.isFinite(row.score)) {
          score += row.score;
          reasons.push(row.reason || `Matchup evidence vs ${enemyId}`);
        }
      }
    }
    for (const allyId of ally) {
      for (const row of synergies) {
        if (row.heroId === heroId && row.allyHeroId === allyId && Number.isFinite(row.score)) {
          score += row.score;
          reasons.push(row.reason || `Synergy evidence with ${allyId}`);
        }
      }
    }
    return { heroId, score, reasons };
  }).filter((row) => row.reasons.length).sort((a, b) => b.score - a.score);

  return {
    label: AI_LABEL,
    status: rows.length ? 'RECOMMENDATIONS_AVAILABLE' : 'INSUFFICIENT_MATCHUP_EVIDENCE',
    recommendations: rows.slice(0, 5),
    message: rows.length ? 'Urutan dihitung dari bukti matchup/synergy yang terverifikasi saja.' : 'Belum ada bukti terverifikasi yang cocok dengan pilihan draft ini.',
    warnings
  };
}
