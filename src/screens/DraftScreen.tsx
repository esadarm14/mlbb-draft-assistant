import React, { useState, useMemo } from 'react';
import { 
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Modal 
} from 'react-native';
import { 
  RankTier, DraftMode, HeroPowerItem, DraftReportData, 
  HeroRecommendation, ComboCardData, TeamPhaseEvaluation 
} from '../types';
import { HeroAutocomplete } from '../components/HeroAutocomplete';
import { HeroAvatar } from '../components/HeroAvatar';
import { PhaseStrengthBadge } from '../components/PhaseStrengthBadge';
import { getHeroById } from '../database/heroesData';
import { getInitialDraftConfig, RANK_TIERS, DEFAULT_TIER_BAN_COUNTS, TIER_META_NOTES } from '../database/draftRules';
import { 
  generateDraftRecommendations, evaluateTeamComposition 
} from '../engine/recommendationEngine';
import { buildComboRecommendations } from '../database/combosData';
import { Colors } from '../theme/colors';

interface DraftScreenProps {
  currentTier: RankTier;
  onSelectTier: (tier: RankTier) => void;
  heroPower: HeroPowerItem[];
  onSaveReport: (report: DraftReportData) => void;
}

type DraftTab = 'board' | 'recommendations' | 'phaseAnalysis';

export const DraftScreen: React.FC<DraftScreenProps> = ({
  currentTier,
  onSelectTier,
  heroPower,
  onSaveReport,
}) => {
  const [activeTab, setActiveTab] = useState<DraftTab>('board');
  const [draftMode, setDraftMode] = useState<DraftMode>('Ranked Draft');
  
  // Selections
  const [bluePicks, setBluePicks] = useState<string[]>([]);
  const [redPicks, setRedPicks] = useState<string[]>([]);
  const [blueBans, setBlueBans] = useState<string[]>([]);
  const [redBans, setRedBans] = useState<string[]>([]);
  
  // Finished Report Modal
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [latestReport, setLatestReport] = useState<DraftReportData | null>(null);

  const draftConfig = useMemo(() => {
    return getInitialDraftConfig(currentTier, draftMode);
  }, [currentTier, draftMode]);

  const allSelectedIds = useMemo(() => {
    return [...bluePicks, ...redPicks, ...blueBans, ...redBans];
  }, [bluePicks, redPicks, blueBans, redBans]);

  // Recommendation engine calculations
  const recommendations = useMemo(() => {
    return generateDraftRecommendations(
      bluePicks,
      redPicks,
      [...blueBans, ...redBans],
      heroPower
    );
  }, [bluePicks, redPicks, blueBans, redBans, heroPower]);

  // Combo suggestions
  const topCombos: ComboCardData[] = useMemo(() => {
    return buildComboRecommendations(bluePicks, redPicks);
  }, [bluePicks, redPicks]);

  // Team Phase Evaluations
  const blueEval: TeamPhaseEvaluation = useMemo(() => {
    return evaluateTeamComposition(bluePicks);
  }, [bluePicks]);

  const redEval: TeamPhaseEvaluation = useMemo(() => {
    return evaluateTeamComposition(redPicks);
  }, [redPicks]);

  const handleResetDraft = () => {
    setBluePicks([]);
    setRedPicks([]);
    setBlueBans([]);
    setRedBans([]);
  };

  const handleFinishDraft = () => {
    const blueHeroes = bluePicks.map(id => getHeroById(id)).filter((h): h is any => !!h);
    const redHeroes = redPicks.map(id => getHeroById(id)).filter((h): h is any => !!h);
    const blueBanHeroes = blueBans.map(id => getHeroById(id)).filter((h): h is any => !!h);
    const redBanHeroes = redBans.map(id => getHeroById(id)).filter((h): h is any => !!h);

    let earlyAdv: 'Blue Team' | 'Red Team' | 'Even' = 'Even';
    if (blueEval.earlyScore > redEval.earlyScore + 5) earlyAdv = 'Blue Team';
    else if (redEval.earlyScore > blueEval.earlyScore + 5) earlyAdv = 'Red Team';

    let midAdv: 'Blue Team' | 'Red Team' | 'Even' = 'Even';
    if (blueEval.midScore > redEval.midScore + 5) midAdv = 'Blue Team';
    else if (redEval.midScore > blueEval.midScore + 5) midAdv = 'Red Team';

    let lateAdv: 'Blue Team' | 'Red Team' | 'Even' = 'Even';
    if (blueEval.lateScore > redEval.lateScore + 5) lateAdv = 'Blue Team';
    else if (redEval.lateScore > blueEval.lateScore + 5) lateAdv = 'Red Team';

    const report: DraftReportData = {
      createdAt: new Date().toISOString(),
      config: draftConfig,
      blueTeam: {
        picks: blueHeroes,
        bans: blueBanHeroes,
        evaluation: blueEval,
      },
      redTeam: {
        picks: redHeroes,
        bans: redBanHeroes,
        evaluation: redEval,
      },
      comparison: {
        earlyAdvantage: earlyAdv,
        midAdvantage: midAdv,
        lateAdvantage: lateAdv,
        summary: `Pertarungan draft antara Tim Biru dan Tim Merah di tier ${currentTier}.`,
      },
      bestCombos: topCombos,
    };

    setLatestReport(report);
    onSaveReport(report);
    setReportModalVisible(true);
  };

  return (
    <View style={styles.container}>
      {/* Tier & Ban Info Bar */}
      <View style={styles.tierBar}>
        <View style={styles.tierBarLeft}>
          <Text style={styles.tierBarLabel}>TIER: <Text style={styles.tierBarValue}>{currentTier}</Text></Text>
          <Text style={styles.tierBarBans}>{draftConfig.bansPerTeam} Ban / Tim</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.quickTierScroll}>
          {RANK_TIERS.map(t => (
            <TouchableOpacity
              key={t}
              onPress={() => onSelectTier(t)}
              style={[styles.tierPill, currentTier === t && styles.activeTierPill]}
            >
              <Text style={[styles.tierPillText, currentTier === t && styles.activeTierPillText]}>
                {t.split(' ')[0]}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Draft Subtabs */}
      <View style={styles.tabBar}>
        <TouchableOpacity 
          onPress={() => setActiveTab('board')}
          style={[styles.tabItem, activeTab === 'board' && styles.activeTabItem]}
        >
          <Text style={[styles.tabText, activeTab === 'board' && styles.activeTabText]}>
            ⚔️ Draft Board
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          onPress={() => setActiveTab('recommendations')}
          style={[styles.tabItem, activeTab === 'recommendations' && styles.activeTabItem]}
        >
          <Text style={[styles.tabText, activeTab === 'recommendations' && styles.activeTabText]}>
            💡 Saran Pick ({recommendations.bestHeroPower.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          onPress={() => setActiveTab('phaseAnalysis')}
          style={[styles.tabItem, activeTab === 'phaseAnalysis' && styles.activeTabItem]}
        >
          <Text style={[styles.tabText, activeTab === 'phaseAnalysis' && styles.activeTabText]}>
            📊 Analisis Fase
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* --- TAB 1: DRAFT BOARD --- */}
        {activeTab === 'board' && (
          <View>
            {/* Blue Team Card */}
            <View style={[styles.teamCard, styles.blueTeamCard]}>
              <View style={styles.teamHeaderRow}>
                <View style={styles.teamBadgeBlue}>
                  <Text style={styles.teamBadgeText}>TIM BIRU (SEKUTU)</Text>
                </View>
                <Text style={styles.pickCounterText}>{bluePicks.length}/5 Pick</Text>
              </View>

              {/* Blue Pick Input */}
              <HeroAutocomplete
                label="Pick Hero Tim Sendiri"
                placeholder="Ketik nama hero (misal: mar, tig, mel)..."
                selectedHeroIds={bluePicks}
                onAddHero={(id) => setBluePicks([...bluePicks, id])}
                onRemoveHero={(id) => setBluePicks(bluePicks.filter(x => x !== id))}
                onClearAll={() => setBluePicks([])}
                maxSelections={5}
                excludedHeroIds={allSelectedIds}
                variant="blue"
              />

              {/* Blue Ban Input */}
              <View style={styles.banSection}>
                <HeroAutocomplete
                  label={`Ban Tim Biru (${blueBans.length}/${draftConfig.bansPerTeam})`}
                  placeholder="Ketik hero yang ingin di-ban..."
                  selectedHeroIds={blueBans}
                  onAddHero={(id) => setBlueBans([...blueBans, id])}
                  onRemoveHero={(id) => setBlueBans(blueBans.filter(x => x !== id))}
                  onClearAll={() => setBlueBans([])}
                  maxSelections={draftConfig.bansPerTeam}
                  excludedHeroIds={allSelectedIds}
                  variant="blue"
                  showRoleFilters={false}
                />
              </View>
            </View>

            {/* Red Team Card */}
            <View style={[styles.teamCard, styles.redTeamCard]}>
              <View style={styles.teamHeaderRow}>
                <View style={styles.teamBadgeRed}>
                  <Text style={styles.teamBadgeText}>TIM MERAH (LAWAN)</Text>
                </View>
                <Text style={styles.pickCounterText}>{redPicks.length}/5 Pick</Text>
              </View>

              {/* Red Pick Input */}
              <HeroAutocomplete
                label="Pick Hero Lawan"
                placeholder="Ketik hero lawan (misal: fanny, ling, yz)..."
                selectedHeroIds={redPicks}
                onAddHero={(id) => setRedPicks([...redPicks, id])}
                onRemoveHero={(id) => setRedPicks(redPicks.filter(x => x !== id))}
                onClearAll={() => setRedPicks([])}
                maxSelections={5}
                excludedHeroIds={allSelectedIds}
                variant="red"
              />

              {/* Red Ban Input */}
              <View style={styles.banSection}>
                <HeroAutocomplete
                  label={`Ban Tim Merah (${redBans.length}/${draftConfig.bansPerTeam})`}
                  placeholder="Ketik hero yang di-ban lawan..."
                  selectedHeroIds={redBans}
                  onAddHero={(id) => setRedBans([...redBans, id])}
                  onRemoveHero={(id) => setRedBans(redBans.filter(x => x !== id))}
                  onClearAll={() => setRedBans([])}
                  maxSelections={draftConfig.bansPerTeam}
                  excludedHeroIds={allSelectedIds}
                  variant="red"
                  showRoleFilters={false}
                />
              </View>
            </View>

            {/* Action Bar */}
            <View style={styles.actionBar}>
              <TouchableOpacity onPress={handleResetDraft} style={styles.resetBtn}>
                <Text style={styles.resetBtnText}>↺ Reset Draft</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                onPress={handleFinishDraft}
                style={[styles.finishBtn, (bluePicks.length === 0 && redPicks.length === 0) && styles.disabledBtn]}
              >
                <Text style={styles.finishBtnText}>✓ Selesaikan & Buat Laporan</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* --- TAB 2: SMART HERO POWER & COUNTER RECOMMENDATIONS --- */}
        {activeTab === 'recommendations' && (
          <View>
            <View style={styles.aiLabelBanner}>
              <Text style={styles.aiLabelText}>🏷️ AI GENERATED STRATEGIC ANALYSIS</Text>
            </View>

            {/* SECTION A: BEST HERO POWER */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>⚡ BEST HERO POWER</Text>
              <Text style={styles.sectionSubtitle}>
                Hero andalan Anda yang paling cocok menghadapi draft lawan saat ini:
              </Text>
            </View>

            {recommendations.bestHeroPower.map((rec) => (
              <View key={rec.hero.id} style={styles.recCard}>
                <View style={styles.recCardTop}>
                  <HeroAvatar hero={rec.hero} size={48} showRoleBadge />
                  <View style={styles.recInfo}>
                    <View style={styles.recNameRow}>
                      <Text style={styles.recHeroName}>{rec.hero.name}</Text>
                      <View style={styles.scoreBadge}>
                        <Text style={styles.scoreBadgeText}>{rec.totalScore}% Match</Text>
                      </View>
                    </View>
                    <Text style={styles.recMasteryText}>★ {rec.masteryLevel}</Text>
                    <Text style={styles.recRoleText}>{rec.hero.roles.join('/')} • {rec.hero.lanes[0]}</Text>
                  </View>
                  <TouchableOpacity 
                    onPress={() => {
                      if (bluePicks.length < 5) setBluePicks([...bluePicks, rec.hero.id]);
                    }}
                    style={styles.pickNowBtn}
                  >
                    <Text style={styles.pickNowText}>+ Pick</Text>
                  </TouchableOpacity>
                </View>

                {/* Reason Pills */}
                <View style={styles.reasonsContainer}>
                  {rec.reasons.map((r, i) => (
                    <View key={i} style={styles.reasonPill}>
                      <Text style={styles.reasonPillText}>✓ {r}</Text>
                    </View>
                  ))}
                </View>

                {/* Phase Strengths */}
                <View style={styles.phaseRow}>
                  <PhaseStrengthBadge label="Early" strength={rec.hero.earlyStrength} compact />
                  <PhaseStrengthBadge label="Mid" strength={rec.hero.midStrength} compact />
                  <PhaseStrengthBadge label="Late" strength={rec.hero.lateStrength} compact />
                </View>
              </View>
            ))}

            {recommendations.bestHeroPower.length === 0 && (
              <View style={styles.emptyNotice}>
                <Text style={styles.emptyNoticeText}>
                  Tidak ada Hero Power yang tersedia atau cocok dengan hero lawan yang dipilih. Silakan periksa daftar di tab Hero Power.
                </Text>
              </View>
            )}

            {/* SECTION B: BEST COUNTER PICK (FROM ENTIRE DATABASE) */}
            <View style={[styles.sectionHeader, { marginTop: 18 }]}>
              <Text style={styles.sectionTitle}>🛡️ BEST COUNTER PICK</Text>
              <Text style={styles.sectionSubtitle}>
                Hero dari database resmi yang memiliki keunggulan matchup tertinggi terhadap hero lawan:
              </Text>
            </View>

            {recommendations.bestCounters.map((rec) => (
              <View key={rec.hero.id} style={[styles.recCard, styles.counterRecCard]}>
                <View style={styles.recCardTop}>
                  <HeroAvatar hero={rec.hero} size={48} showRoleBadge />
                  <View style={styles.recInfo}>
                    <View style={styles.recNameRow}>
                      <Text style={styles.recHeroName}>{rec.hero.name}</Text>
                      <View style={[styles.scoreBadge, { backgroundColor: 'rgba(0, 230, 118, 0.2)' }]}>
                        <Text style={[styles.scoreBadgeText, { color: Colors.green }]}>{rec.counterScore}% Counter</Text>
                      </View>
                    </View>
                    <Text style={styles.recRoleText}>{rec.hero.roles.join('/')} • {rec.hero.lanes[0]}</Text>
                  </View>
                  <TouchableOpacity 
                    onPress={() => {
                      if (bluePicks.length < 5) setBluePicks([...bluePicks, rec.hero.id]);
                    }}
                    style={styles.pickNowBtn}
                  >
                    <Text style={styles.pickNowText}>+ Pick</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.reasonsContainer}>
                  {rec.reasons.map((r, i) => (
                    <View key={i} style={[styles.reasonPill, { borderColor: Colors.greenMuted }]}>
                      <Text style={[styles.reasonPillText, { color: Colors.green }]}>⚡ {r}</Text>
                    </View>
                  ))}
                </View>

                {rec.risks.length > 0 && (
                  <Text style={styles.riskWarningText}>⚠️ {rec.risks[0]}</Text>
                )}
              </View>
            ))}

            {/* SECTION C: SMART COMBO SUGGESTION */}
            <View style={[styles.sectionHeader, { marginTop: 18 }]}>
              <Text style={styles.sectionTitle}>✨ SMART COMBO SUGGESTIONS</Text>
              <Text style={styles.sectionSubtitle}>
                Komposisi tim sinergis untuk mengungguli draft lawan:
              </Text>
            </View>

            {topCombos.map((combo) => (
              <View key={combo.id} style={styles.comboCard}>
                <View style={styles.comboHeader}>
                  <Text style={styles.comboName}>{combo.name}</Text>
                  <View style={styles.comboBadge}>
                    <Text style={styles.comboBadgeText}>{combo.type}</Text>
                  </View>
                </View>
                <Text style={styles.comboDesc}>{combo.synergyExplanation}</Text>
                
                {/* Hero Avatars */}
                <View style={styles.comboHeroesRow}>
                  {combo.coreHeroes.map(h => (
                    <View key={h.id} style={styles.comboHeroItem}>
                      <HeroAvatar hero={h} size={40} showRoleBadge />
                      <Text style={styles.comboHeroName} numberOfLines={1}>{h.name}</Text>
                    </View>
                  ))}
                </View>

                <View style={styles.comboMetaBox}>
                  <Text style={styles.comboMetaTitle}>CARA KERJA:</Text>
                  <Text style={styles.comboMetaBody}>{combo.howItWorks}</Text>
                  
                  <Text style={[styles.comboMetaTitle, { marginTop: 6 }]}>WAKTU PALING EFEKTIF:</Text>
                  <Text style={styles.comboMetaBody}>{combo.effectiveGameTime}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* --- TAB 3: DRAFT PHASE ANALYZER & WIN CONDITION --- */}
        {activeTab === 'phaseAnalysis' && (
          <View>
            <View style={styles.aiLabelBanner}>
              <Text style={styles.aiLabelText}>🏷️ AI GENERATED STRATEGIC ANALYSIS</Text>
            </View>

            {/* Blue Team Phase Card */}
            <View style={[styles.phaseCard, { borderColor: Colors.blue }]}>
              <Text style={[styles.phaseCardTitle, { color: Colors.blue }]}>BLUE TEAM (TIM SENDIRI)</Text>
              <View style={styles.phaseBadgesRow}>
                <PhaseStrengthBadge label="Early" strength={blueEval.early} />
                <PhaseStrengthBadge label="Mid" strength={blueEval.mid} />
                <PhaseStrengthBadge label="Late" strength={blueEval.late} />
              </View>

              <View style={styles.evaluationRow}>
                <Text style={styles.evalLabel}>Keseimbangan Damage:</Text>
                <Text style={styles.evalVal}>{blueEval.magicPhysicalBalance}</Text>
              </View>
              <View style={styles.evaluationRow}>
                <Text style={styles.evalLabel}>Frontline Status:</Text>
                <Text style={[styles.evalVal, { color: blueEval.frontlineAdequate ? Colors.green : Colors.red }]}>
                  {blueEval.frontlineAdequate ? 'Solid' : 'Kurang Frontline'}
                </Text>
              </View>
              <View style={styles.evaluationRow}>
                <Text style={styles.evalLabel}>Tingkat Crowd Control:</Text>
                <Text style={styles.evalVal}>{blueEval.ccRating}</Text>
              </View>

              <View style={styles.winConditionBox}>
                <Text style={styles.wcTitle}>🎯 STRATEGI WIN CONDITION:</Text>
                <Text style={styles.wcBody}>{blueEval.winCondition}</Text>
              </View>
            </View>

            {/* Red Team Phase Card */}
            <View style={[styles.phaseCard, { borderColor: Colors.red, marginTop: 14 }]}>
              <Text style={[styles.phaseCardTitle, { color: Colors.red }]}>RED TEAM (TIM LAWAN)</Text>
              <View style={styles.phaseBadgesRow}>
                <PhaseStrengthBadge label="Early" strength={redEval.early} />
                <PhaseStrengthBadge label="Mid" strength={redEval.mid} />
                <PhaseStrengthBadge label="Late" strength={redEval.late} />
              </View>

              <View style={styles.evaluationRow}>
                <Text style={styles.evalLabel}>Keseimbangan Damage:</Text>
                <Text style={styles.evalVal}>{redEval.magicPhysicalBalance}</Text>
              </View>
              <View style={styles.evaluationRow}>
                <Text style={styles.evalLabel}>Frontline Status:</Text>
                <Text style={[styles.evalVal, { color: redEval.frontlineAdequate ? Colors.green : Colors.red }]}>
                  {redEval.frontlineAdequate ? 'Solid' : 'Kurang Frontline'}
                </Text>
              </View>

              <View style={[styles.winConditionBox, { borderColor: Colors.redMuted }]}>
                <Text style={[styles.wcTitle, { color: Colors.red }]}>⚠️ ANTISIPASI STRATEGI LAWAN:</Text>
                <Text style={styles.wcBody}>{redEval.winCondition}</Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Draft Report Modal */}
      {reportModalVisible && latestReport && (
        <Modal
          visible={reportModalVisible}
          animationType="slide"
          onRequestClose={() => setReportModalVisible(false)}
        >
          <View style={styles.reportModalContainer}>
            <View style={styles.reportModalHeader}>
              <Text style={styles.reportModalTitle}>LAPORAN LENGKAP DRAFT</Text>
              <TouchableOpacity 
                onPress={() => setReportModalVisible(false)}
                style={styles.closeReportBtn}
              >
                <Text style={styles.closeReportText}>✕ Tutup</Text>
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.reportModalContent}>
              <View style={styles.reportBadgeBar}>
                <Text style={styles.reportTierText}>Rank: {latestReport.config.tier}</Text>
                <Text style={styles.reportDateText}>{new Date(latestReport.createdAt).toLocaleDateString()}</Text>
              </View>

              {/* Blue Team Recap */}
              <View style={[styles.reportTeamBox, { borderColor: Colors.blue }]}>
                <Text style={[styles.reportTeamTitle, { color: Colors.blue }]}>TIM BIRU (SEKUTU)</Text>
                <View style={styles.reportPicksRow}>
                  {latestReport.blueTeam.picks.map(h => (
                    <View key={h.id} style={styles.reportHeroItem}>
                      <HeroAvatar hero={h} size={42} showRoleBadge />
                      <Text style={styles.reportHeroName} numberOfLines={1}>{h.name}</Text>
                    </View>
                  ))}
                </View>
                <Text style={styles.reportWcText}>{latestReport.blueTeam.evaluation.winCondition}</Text>
              </View>

              {/* Red Team Recap */}
              <View style={[styles.reportTeamBox, { borderColor: Colors.red, marginTop: 12 }]}>
                <Text style={[styles.reportTeamTitle, { color: Colors.red }]}>TIM MERAH (LAWAN)</Text>
                <View style={styles.reportPicksRow}>
                  {latestReport.redTeam.picks.map(h => (
                    <View key={h.id} style={styles.reportHeroItem}>
                      <HeroAvatar hero={h} size={42} showRoleBadge />
                      <Text style={styles.reportHeroName} numberOfLines={1}>{h.name}</Text>
                    </View>
                  ))}
                </View>
                <Text style={styles.reportWcText}>{latestReport.redTeam.evaluation.winCondition}</Text>
              </View>

              {/* Draft Comparison */}
              <View style={styles.comparisonBox}>
                <Text style={styles.comparisonTitle}>⚖️ PERBANDINGAN FASE PERMAINAN</Text>
                <View style={styles.compRow}>
                  <Text style={styles.compLabel}>Early Game:</Text>
                  <Text style={styles.compVal}>{latestReport.comparison.earlyAdvantage} Unggul</Text>
                </View>
                <View style={styles.compRow}>
                  <Text style={styles.compLabel}>Mid Game:</Text>
                  <Text style={styles.compVal}>{latestReport.comparison.midAdvantage} Unggul</Text>
                </View>
                <View style={styles.compRow}>
                  <Text style={styles.compLabel}>Late Game:</Text>
                  <Text style={styles.compVal}>{latestReport.comparison.lateAdvantage} Unggul</Text>
                </View>
              </View>

              <TouchableOpacity 
                onPress={() => setReportModalVisible(false)}
                style={styles.doneReportBtn}
              >
                <Text style={styles.doneReportBtnText}>Selesai & Kembali</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </Modal>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  tierBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceBorder,
  },
  tierBarLeft: {
    marginRight: 10,
  },
  tierBarLabel: {
    color: Colors.textSecondary,
    fontSize: 10,
    fontWeight: '700',
  },
  tierBarValue: {
    color: Colors.gold,
    fontWeight: '900',
  },
  tierBarBans: {
    color: Colors.textMuted,
    fontSize: 9,
  },
  quickTierScroll: {
    flex: 1,
  },
  tierPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: Colors.surfaceLight,
    marginRight: 6,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  activeTierPill: {
    backgroundColor: 'rgba(255, 184, 0, 0.2)',
    borderColor: Colors.gold,
  },
  tierPillText: {
    color: Colors.textSecondary,
    fontSize: 10,
    fontWeight: '600',
  },
  activeTierPillText: {
    color: Colors.gold,
    fontWeight: '800',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceBorder,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTabItem: {
    borderBottomColor: Colors.gold,
  },
  tabText: {
    color: Colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
  },
  activeTabText: {
    color: Colors.gold,
    fontWeight: '800',
  },
  content: {
    padding: 14,
    paddingBottom: 40,
  },
  teamCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1.5,
  },
  blueTeamCard: {
    borderColor: 'rgba(0, 136, 255, 0.4)',
  },
  redTeamCard: {
    borderColor: 'rgba(255, 51, 75, 0.4)',
  },
  teamHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  teamBadgeBlue: {
    backgroundColor: Colors.blue,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  teamBadgeRed: {
    backgroundColor: Colors.red,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  teamBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  pickCounterText: {
    color: Colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
  },
  banSection: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceBorder,
  },
  actionBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  resetBtn: {
    backgroundColor: Colors.surfaceLight,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  resetBtnText: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  finishBtn: {
    flex: 1,
    marginLeft: 10,
    backgroundColor: Colors.green,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  disabledBtn: {
    opacity: 0.5,
  },
  finishBtnText: {
    color: '#000000',
    fontSize: 12,
    fontWeight: '900',
  },
  aiLabelBanner: {
    backgroundColor: 'rgba(138, 43, 226, 0.15)',
    borderWidth: 1,
    borderColor: Colors.purple,
    borderRadius: 8,
    paddingVertical: 5,
    paddingHorizontal: 10,
    alignItems: 'center',
    marginBottom: 12,
  },
  aiLabelText: {
    color: Colors.purple,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  sectionHeader: {
    marginBottom: 10,
  },
  sectionTitle: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: '900',
  },
  sectionSubtitle: {
    color: Colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
    lineHeight: 15,
  },
  recCard: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
  },
  counterRecCard: {
    borderColor: 'rgba(0, 230, 118, 0.3)',
  },
  recCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  recInfo: {
    flex: 1,
    marginLeft: 10,
  },
  recNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingRight: 6,
  },
  recHeroName: {
    color: Colors.textPrimary,
    fontSize: 13,
    fontWeight: '800',
  },
  scoreBadge: {
    backgroundColor: 'rgba(255, 184, 0, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  scoreBadgeText: {
    color: Colors.gold,
    fontSize: 10,
    fontWeight: '800',
  },
  recMasteryText: {
    color: Colors.gold,
    fontSize: 10,
    fontWeight: '700',
    marginTop: 1,
  },
  recRoleText: {
    color: Colors.textMuted,
    fontSize: 10,
    marginTop: 1,
  },
  pickNowBtn: {
    backgroundColor: Colors.blue,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  pickNowText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  reasonsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  reasonPill: {
    backgroundColor: Colors.surfaceLight,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginRight: 6,
    marginBottom: 4,
  },
  reasonPillText: {
    color: Colors.textSecondary,
    fontSize: 10,
    fontWeight: '600',
  },
  phaseRow: {
    flexDirection: 'row',
    marginTop: 6,
  },
  riskWarningText: {
    color: Colors.red,
    fontSize: 10,
    fontWeight: '600',
    marginTop: 6,
  },
  emptyNotice: {
    backgroundColor: Colors.surface,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    marginBottom: 10,
  },
  emptyNoticeText: {
    color: Colors.textMuted,
    fontSize: 11,
    lineHeight: 16,
  },
  comboCard: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
  },
  comboHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  comboName: {
    color: Colors.textPrimary,
    fontSize: 13,
    fontWeight: '800',
  },
  comboBadge: {
    backgroundColor: 'rgba(138, 43, 226, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  comboBadgeText: {
    color: Colors.purple,
    fontSize: 9,
    fontWeight: '800',
  },
  comboDesc: {
    color: Colors.textSecondary,
    fontSize: 11,
    lineHeight: 15,
    marginBottom: 8,
  },
  comboHeroesRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  comboHeroItem: {
    alignItems: 'center',
    marginRight: 10,
  },
  comboHeroName: {
    color: Colors.textSecondary,
    fontSize: 9,
    fontWeight: '600',
    marginTop: 2,
    maxWidth: 45,
  },
  comboMetaBox: {
    backgroundColor: Colors.surfaceLight,
    padding: 8,
    borderRadius: 8,
  },
  comboMetaTitle: {
    color: Colors.gold,
    fontSize: 9,
    fontWeight: '800',
  },
  comboMetaBody: {
    color: Colors.textPrimary,
    fontSize: 10,
    lineHeight: 14,
    marginTop: 1,
  },
  phaseCard: {
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderRadius: 16,
    padding: 14,
  },
  phaseCardTitle: {
    fontSize: 13,
    fontWeight: '900',
    marginBottom: 8,
  },
  phaseBadgesRow: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  evaluationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.surfaceBorder,
  },
  evalLabel: {
    color: Colors.textMuted,
    fontSize: 11,
  },
  evalVal: {
    color: Colors.textPrimary,
    fontSize: 11,
    fontWeight: '700',
  },
  winConditionBox: {
    backgroundColor: Colors.surfaceLight,
    borderWidth: 1,
    borderColor: Colors.blueMuted,
    borderRadius: 10,
    padding: 10,
    marginTop: 10,
  },
  wcTitle: {
    color: Colors.gold,
    fontSize: 10,
    fontWeight: '900',
    marginBottom: 4,
  },
  wcBody: {
    color: Colors.textPrimary,
    fontSize: 11,
    lineHeight: 16,
  },
  reportModalContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingTop: 40,
  },
  reportModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceBorder,
  },
  reportModalTitle: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: '900',
  },
  closeReportBtn: {
    padding: 6,
  },
  closeReportText: {
    color: Colors.red,
    fontSize: 12,
    fontWeight: '700',
  },
  reportModalContent: {
    padding: 16,
    paddingBottom: 40,
  },
  reportBadgeBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    padding: 10,
    borderRadius: 10,
    marginBottom: 12,
  },
  reportTierText: {
    color: Colors.gold,
    fontSize: 12,
    fontWeight: '800',
  },
  reportDateText: {
    color: Colors.textMuted,
    fontSize: 12,
  },
  reportTeamBox: {
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderRadius: 14,
    padding: 12,
  },
  reportTeamTitle: {
    fontSize: 12,
    fontWeight: '900',
    marginBottom: 8,
  },
  reportPicksRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  reportHeroItem: {
    alignItems: 'center',
    marginRight: 10,
  },
  reportHeroName: {
    color: Colors.textPrimary,
    fontSize: 10,
    fontWeight: '700',
    marginTop: 3,
  },
  reportWcText: {
    color: Colors.textSecondary,
    fontSize: 11,
    lineHeight: 15,
  },
  comparisonBox: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  comparisonTitle: {
    color: Colors.gold,
    fontSize: 11,
    fontWeight: '900',
    marginBottom: 8,
  },
  compRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  compLabel: {
    color: Colors.textSecondary,
    fontSize: 11,
  },
  compVal: {
    color: Colors.textPrimary,
    fontSize: 11,
    fontWeight: '700',
  },
  doneReportBtn: {
    backgroundColor: Colors.gold,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 20,
  },
  doneReportBtnText: {
    color: '#000000',
    fontSize: 13,
    fontWeight: '900',
  },
});
