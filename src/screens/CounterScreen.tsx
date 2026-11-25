import React, { useState, useMemo } from 'react';
import { 
  View, Text, ScrollView, TouchableOpacity, StyleSheet 
} from 'react-native';
import { HeroPowerItem, CounterBreakdown } from '../types';
import { HeroAutocomplete } from '../components/HeroAutocomplete';
import { HeroAvatar } from '../components/HeroAvatar';
import { PhaseStrengthBadge } from '../components/PhaseStrengthBadge';
import { analyzeEnemyCounters } from '../engine/recommendationEngine';
import { Colors, ROLE_COLORS } from '../theme/colors';

interface CounterScreenProps {
  heroPower: HeroPowerItem[];
}

export const CounterScreen: React.FC<CounterScreenProps> = ({ heroPower }) => {
  const [enemyHeroIds, setEnemyHeroIds] = useState<string[]>(['fanny', 'claude']);
  const [activeCategoryTab, setActiveCategoryTab] = useState<'All' | 'Best Counter' | 'Alternative Counter' | 'Situational Counter'>('All');

  const counterResults: CounterBreakdown[] = useMemo(() => {
    return analyzeEnemyCounters(enemyHeroIds, heroPower);
  }, [enemyHeroIds, heroPower]);

  const filteredResults = useMemo(() => {
    if (activeCategoryTab === 'All') return counterResults;
    return counterResults.filter(c => c.category === activeCategoryTab);
  }, [counterResults, activeCategoryTab]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>SMART COUNTER ANALYZER</Text>
        <Text style={styles.subtitle}>
          Analisis counter kontekstual berdasarkan kit skill, burst, CC, dan fase permainan.
        </Text>
      </View>

      {/* AI Label */}
      <View style={styles.aiLabelBanner}>
        <Text style={styles.aiLabelText}>🏷️ AI GENERATED STRATEGIC ANALYSIS</Text>
      </View>

      {/* Enemy Input Autocomplete */}
      <View style={styles.inputCard}>
        <HeroAutocomplete
          label="Hero Lawan yang Ingin Di-Counter"
          placeholder="Ketik hero lawan (misal: fanny, ling, claude)..."
          selectedHeroIds={enemyHeroIds}
          onAddHero={(id) => setEnemyHeroIds([...enemyHeroIds, id])}
          onRemoveHero={(id) => setEnemyHeroIds(enemyHeroIds.filter(x => x !== id))}
          onClearAll={() => setEnemyHeroIds([])}
          maxSelections={5}
          variant="red"
          showRoleFilters
        />
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterTabsRow}>
        {(['All', 'Best Counter', 'Alternative Counter', 'Situational Counter'] as const).map(cat => {
          const isSelected = activeCategoryTab === cat;
          return (
            <TouchableOpacity
              key={cat}
              onPress={() => setActiveCategoryTab(cat)}
              style={[styles.filterTab, isSelected && styles.activeFilterTab]}
            >
              <Text style={[styles.filterTabText, isSelected && styles.activeFilterTabText]}>
                {cat === 'All' ? 'Semua' : cat.split(' ')[0]}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Counter Cards */}
      <View style={styles.cardsContainer}>
        {filteredResults.map(item => {
          const primaryRole = item.hero.roles[0] || 'Tank';
          const roleColor = ROLE_COLORS[primaryRole] || Colors.textSecondary;

          const getCategoryBadgeColor = () => {
            switch (item.category) {
              case 'Best Counter': return Colors.green;
              case 'Alternative Counter': return Colors.blue;
              default: return Colors.gold;
            }
          };

          const catColor = getCategoryBadgeColor();

          return (
            <View key={item.hero.id} style={[styles.counterCard, { borderColor: item.isHeroPower ? Colors.gold : Colors.surfaceBorder }]}>
              {/* Card Top */}
              <View style={styles.cardTopRow}>
                <HeroAvatar hero={item.hero} size={48} showRoleBadge />
                <View style={styles.heroMeta}>
                  <View style={styles.nameRow}>
                    <Text style={styles.heroName}>{item.hero.name}</Text>
                    {item.isHeroPower && (
                      <View style={styles.hpBadge}>
                        <Text style={styles.hpBadgeText}>⚡ HERO POWER</Text>
                      </View>
                    )}
                  </View>
                  <Text style={[styles.heroRole, { color: roleColor }]}>
                    {item.hero.roles.join('/')} • {item.hero.lanes[0]}
                  </Text>
                  {item.masteryLevel && (
                    <Text style={styles.masteryText}>Penguasaan: {item.masteryLevel}</Text>
                  )}
                </View>

                {/* Counter Effectiveness % */}
                <View style={[styles.effectivenessBadge, { borderColor: catColor, backgroundColor: 'rgba(255,255,255,0.03)' }]}>
                  <Text style={[styles.effectivenessNum, { color: catColor }]}>
                    {item.counterEffectiveness}%
                  </Text>
                  <Text style={[styles.categoryText, { color: catColor }]}>
                    {item.category.split(' ')[0]}
                  </Text>
                </View>
              </View>

              {/* Reasons */}
              <View style={styles.detailBox}>
                <Text style={styles.detailLabel}>ALASAN COUNTER:</Text>
                <Text style={styles.detailText}>{item.counterReason}</Text>
              </View>

              {/* Pros & Cons */}
              <View style={styles.prosConsRow}>
                <View style={styles.prosCol}>
                  <Text style={styles.prosTitle}>KELEBIHAN:</Text>
                  {item.pros.map((p, i) => (
                    <Text key={i} style={styles.prosText}>✓ {p}</Text>
                  ))}
                </View>

                <View style={styles.consCol}>
                  <Text style={styles.consTitle}>KELEMAHAN:</Text>
                  {item.cons.map((c, i) => (
                    <Text key={i} style={styles.consText}>✕ {c}</Text>
                  ))}
                </View>
              </View>

              {/* Risk Alert */}
              <View style={styles.riskBox}>
                <Text style={styles.riskTitle}>⚠️ RISIKO PEMILIHAN:</Text>
                <Text style={styles.riskText}>{item.risk}</Text>
              </View>

              {/* Phase Strengths */}
              <View style={styles.phaseRow}>
                <PhaseStrengthBadge label="Early" strength={item.hero.earlyStrength} compact />
                <PhaseStrengthBadge label="Mid" strength={item.hero.midStrength} compact />
                <PhaseStrengthBadge label="Late" strength={item.hero.lateStrength} compact />
              </View>
            </View>
          );
        })}

        {filteredResults.length === 0 && (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>🛡️</Text>
            <Text style={styles.emptyTitle}>Pilih hero lawan di atas</Text>
            <Text style={styles.emptySubtitle}>
              Sistem akan menghitung counter paling efektif berdasarkan kit kemampuan hero.
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 10,
  },
  title: {
    color: Colors.textPrimary,
    fontSize: 18,
    fontWeight: '900',
  },
  subtitle: {
    color: Colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
    lineHeight: 16,
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
  },
  inputCard: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
  },
  filterTabsRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  filterTab: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    marginRight: 6,
  },
  activeFilterTab: {
    backgroundColor: 'rgba(0, 230, 118, 0.15)',
    borderColor: Colors.green,
  },
  filterTabText: {
    color: Colors.textSecondary,
    fontSize: 10,
    fontWeight: '700',
  },
  activeFilterTabText: {
    color: Colors.green,
    fontWeight: '800',
  },
  cardsContainer: {
    marginTop: 2,
  },
  counterCard: {
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  heroMeta: {
    flex: 1,
    marginLeft: 12,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  heroName: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: '800',
  },
  hpBadge: {
    backgroundColor: 'rgba(255, 184, 0, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 6,
  },
  hpBadgeText: {
    color: Colors.gold,
    fontSize: 9,
    fontWeight: '800',
  },
  heroRole: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  masteryText: {
    color: Colors.gold,
    fontSize: 9,
    fontWeight: '600',
    marginTop: 1,
  },
  effectivenessBadge: {
    borderWidth: 1.5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    alignItems: 'center',
  },
  effectivenessNum: {
    fontSize: 14,
    fontWeight: '900',
  },
  categoryText: {
    fontSize: 8,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  detailBox: {
    backgroundColor: Colors.surfaceLight,
    padding: 8,
    borderRadius: 8,
    marginTop: 10,
  },
  detailLabel: {
    color: Colors.gold,
    fontSize: 9,
    fontWeight: '800',
  },
  detailText: {
    color: Colors.textPrimary,
    fontSize: 11,
    lineHeight: 15,
    marginTop: 2,
  },
  prosConsRow: {
    flexDirection: 'row',
    marginTop: 8,
  },
  prosCol: {
    flex: 1,
    paddingRight: 6,
  },
  consCol: {
    flex: 1,
    paddingLeft: 6,
  },
  prosTitle: {
    color: Colors.green,
    fontSize: 9,
    fontWeight: '800',
    marginBottom: 2,
  },
  prosText: {
    color: Colors.textSecondary,
    fontSize: 10,
    lineHeight: 14,
  },
  consTitle: {
    color: Colors.red,
    fontSize: 9,
    fontWeight: '800',
    marginBottom: 2,
  },
  consText: {
    color: Colors.textSecondary,
    fontSize: 10,
    lineHeight: 14,
  },
  riskBox: {
    backgroundColor: 'rgba(255, 51, 75, 0.08)',
    borderLeftWidth: 3,
    borderLeftColor: Colors.red,
    padding: 6,
    borderRadius: 4,
    marginTop: 8,
  },
  riskTitle: {
    color: Colors.red,
    fontSize: 9,
    fontWeight: '800',
  },
  riskText: {
    color: Colors.textPrimary,
    fontSize: 10,
    marginTop: 1,
  },
  phaseRow: {
    flexDirection: 'row',
    marginTop: 10,
  },
  emptyCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  emptyIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  emptyTitle: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: '800',
  },
  emptySubtitle: {
    color: Colors.textMuted,
    fontSize: 11,
    textAlign: 'center',
    marginTop: 4,
  },
});
