const AI_LABEL = 'AI GENERATED STRATEGIC ANALYSIS';

function evaluateComposition(heroRecords, heroIds) {
  const heroesMap = new Map((heroRecords || []).map((h) => [h.id, h]));
  const roles = { Tank: 0, Fighter: 0, Assassin: 0, Mage: 0, Marksman: 0, Support: 0 };
  const specialties = {};
  let frontline = 0;
  let magicDamage = 0;
  let physicalDamage = 0;
  let crowdControl = 0;
  let sustain = 0;

  for (const id of heroIds) {
    const hero = heroesMap.get(id);
    if (!hero) continue;
    for (const r of hero.officialRole || []) {
      if (Object.hasOwn(roles, r)) roles[r] += 1;
      if (r === 'Tank' || r === 'Fighter') frontline += 1;
      if (r === 'Mage') magicDamage += 1;
      if (r === 'Marksman' || r === 'Assassin') physicalDamage += 1;
    }
    for (const s of hero.heroSpecialty || []) {
      specialties[s] = (specialties[s] || 0) + 1;
      if (/control|crowd control/i.test(s)) crowdControl += 1;
      if (/regen|support/i.test(s)) sustain += 1;
      if (/magic/i.test(s)) magicDamage += 1;
    }
  }

  const gaps = [];
  const strengths = [];
  if (heroIds.length > 0) {
    if (frontline === 0) gaps.push('Belum ada Frontline (Tank/Fighter) untuk menahan inisiasi dan absorpsi damage.');
    else strengths.push(`Frontline memadai (${frontline} hero tahan badan).`);

    if (magicDamage === 0 && heroIds.length >= 2) gaps.push('Kekurangan Magic Damage; lawan berpeluang menumpuk Physical Defense.');
    else if (magicDamage > 0) strengths.push('Memiliki sumber Magic Damage.');

    if (crowdControl === 0 && heroIds.length >= 2) gaps.push('Minim Crowd Control/Disruption untuk setup teamfight atau disengage.');
    else if (crowdControl > 0) strengths.push(`Memiliki kemampuan Crowd Control (${crowdControl} sumber).`);

    if (sustain > 0) strengths.push('Memiliki hero dengan sustain/regen/utility.');
  }

  return {
    heroCount: heroIds.length,
    roles,
    frontline,
    magicDamage,
    physicalDamage,
    crowdControl,
    sustain,
    gaps,
    strengths
  };
}

export function analyzeDraft(database, { ally = [], enemy = [], candidates = [] } = {}) {
  const allHeroes = database.heroes?.records ?? [];
  const verifiedHeroes = allHeroes.filter((hero) => hero.verificationStatus === 'VERIFIED');
  const allMatchups = database.hero_matchups?.records ?? [];
  const allSynergies = database.hero_synergies?.records ?? [];
  const adjustments = database.hero_adjustments?.records ?? [];
  const staleStrategyCount = [...allMatchups, ...allSynergies].filter((row) => row.verificationStatus === 'STALE' || row.potentiallyStale).length;
  const matchups = allMatchups.filter((row) => row.verificationStatus === 'VERIFIED' && !row.potentiallyStale);
  const synergies = allSynergies.filter((row) => row.verificationStatus === 'VERIFIED' && !row.potentiallyStale);
  const available = candidates.length ? candidates : verifiedHeroes.map((hero) => hero.id);
  const evidence = matchups.length + synergies.length;
  const warnings = [
    'Analisis ini dihasilkan AI/algoritma dan bukan rekomendasi resmi Moonton.',
    'Buff saja tidak menaikkan tier hero; pertimbangkan komposisi dan kebutuhan tim.'
  ];
  if (staleStrategyCount) warnings.push(`${staleStrategyCount} record strategi ditandai STALE setelah patch Original Server; validasi ulang sebelum digunakan.`);

  const allyComp = evaluateComposition(allHeroes, ally);
  const enemyComp = evaluateComposition(allHeroes, enemy);

  // Counter Pick Analysis (B. STRATEGIC ANALYSIS)
  const counterPicks = {};
  for (const enemyId of enemy) {
    const counters = matchups
      .filter((m) => m.enemyHeroId === enemyId && m.score > 0)
      .map((m) => ({ heroId: m.heroId, score: m.score, reason: m.reason || `Bukti keunggulan vs ${enemyId}` }))
      .sort((a, b) => b.score - a.score);
    counterPicks[enemyId] = counters;
  }

  // Hero Synergy Analysis (B. STRATEGIC ANALYSIS)
  const heroSynergies = {};
  for (const allyId of ally) {
    const syns = synergies
      .filter((s) => s.allyHeroId === allyId && s.score > 0)
      .map((s) => ({ heroId: s.heroId, score: s.score, reason: s.reason || `Bukti sinergi bersama ${allyId}` }))
      .sort((a, b) => b.score - a.score);
    heroSynergies[allyId] = syns;
  }

  // Ban Recommendation Analysis (B. STRATEGIC ANALYSIS)
  const banRecommendations = [];
  const enemyThreats = new Map();
  for (const allyId of ally) {
    for (const m of matchups) {
      if (m.enemyHeroId === allyId && m.score > 0) {
        const prev = enemyThreats.get(m.heroId) || { threatScore: 0, targets: [] };
        prev.threatScore += m.score;
        prev.targets.push(allyId);
        enemyThreats.set(m.heroId, prev);
      }
    }
  }
  for (const [threatHeroId, data] of enemyThreats.entries()) {
    if (!enemy.includes(threatHeroId)) {
      banRecommendations.push({
        heroId: threatHeroId,
        priority: data.threatScore >= 2 ? 'HIGH' : 'MEDIUM',
        reason: `Ancaman counter terverifikasi terhadap kawan (${data.targets.join(', ')}).`
      });
    }
  }
  banRecommendations.sort((a, b) => (b.priority === 'HIGH' ? 1 : 0) - (a.priority === 'HIGH' ? 1 : 0));

  if (!available.length || !evidence) {
    return {
      label: AI_LABEL,
      status: 'INSUFFICIENT_VERIFIED_DATA',
      recommendations: [],
      counterPicks,
      heroSynergies,
      banRecommendations,
      teamComposition: { ally: allyComp, enemy: enemyComp },
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

    // Role fit consideration
    const heroInfo = allHeroes.find((h) => h.id === heroId);
    if (heroInfo) {
      const heroRoles = heroInfo.officialRole || [];
      if (allyComp.frontline === 0 && (heroRoles.includes('Tank') || heroRoles.includes('Fighter'))) {
        reasons.push('Mengisi kebutuhan frontline tim');
      }
      if (allyComp.magicDamage === 0 && heroRoles.includes('Mage')) {
        reasons.push('Mengisi kebutuhan Magic Damage tim');
      }
    }

    // Check if hero has patch adjustments
    const recentAdj = adjustments.filter((a) => a.heroName && a.heroName.toLowerCase() === heroId.toLowerCase());
    if (recentAdj.length) {
      reasons.push(`Penyesuaian patch resmi tercatat: ${recentAdj.map((a) => a.category).join(', ')}`);
    }

    return { heroId, score, reasons };
  }).filter((row) => row.reasons.length).sort((a, b) => b.score - a.score);

  return {
    label: AI_LABEL,
    status: rows.length ? 'RECOMMENDATIONS_AVAILABLE' : 'INSUFFICIENT_MATCHUP_EVIDENCE',
    recommendations: rows.slice(0, 5),
    counterPicks,
    heroSynergies,
    banRecommendations: banRecommendations.slice(0, 5),
    teamComposition: { ally: allyComp, enemy: enemyComp },
    message: rows.length ? 'Urutan dihitung dari bukti matchup/synergy yang terverifikasi saja.' : 'Belum ada bukti terverifikasi yang cocok dengan pilihan draft ini.',
    warnings
  };
}
