import React from 'react';
import { 
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Image 
} from 'react-native';
import { RankTier, HeroPowerItem } from '../types';
import { HeroAvatar } from '../components/HeroAvatar';
import { getHeroById } from '../database/heroesData';
import { Colors } from '../theme/colors';
import { TIER_META_NOTES } from '../database/draftRules';

interface HomeScreenProps {
  currentTier: RankTier;
  onSelectTier: (tier: RankTier) => void;
  heroPower: HeroPowerItem[];
  onNavigate: (tab: 'heroPower' | 'draft' | 'counter' | 'history') => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  currentTier,
  onSelectTier,
  heroPower,
  onNavigate,
}) => {
  const mainHeroes = heroPower
    .filter(hp => hp.masteryLevel === 'Main Hero' || hp.masteryLevel === 'Highly Mastered')
    .slice(0, 5);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* App Header Banner */}
      <View style={styles.header}>
        <View>
          <Text style={styles.appTitle}>MLBB DRAFT ASSISTANT</Text>
          <Text style={styles.appSubtitle}>Official Moonton Intelligence & Strategic AI</Text>
        </View>
        <View style={styles.officialBadge}>
          <Text style={styles.officialBadgeText}>PATCH 2.2.16</Text>
        </View>
      </View>

      {/* Official Data Center Card */}
      <View style={styles.officialCard}>
        <View style={styles.cardHeaderRow}>
          <Text style={styles.cardHeaderTitle}>📡 Official Data Center</Text>
          <View style={styles.statusPill}>
            <View style={styles.liveDot} />
            <Text style={styles.statusPillText}>LIVE PATCH</Text>
          </View>
        </View>
        <Text style={styles.officialDesc}>
          Data hero, penyesuaian kemampuan, dan balance patch bersumber resmi dari portal Moonton Mobile Legends.
        </Text>
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>2.2.16</Text>
            <Text style={styles.statLabel}>Current Patch</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>Original</Text>
            <Text style={styles.statLabel}>Server Scope</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>Terverifikasi</Text>
            <Text style={styles.statLabel}>Moonton Source</Text>
          </View>
        </View>
      </View>

      {/* Quick Draft Action CTA */}
      <TouchableOpacity 
        style={styles.quickDraftBtn}
        onPress={() => onNavigate('draft')}
        activeOpacity={0.8}
      >
        <View style={styles.draftBtnIconWrapper}>
          <Text style={styles.draftBtnIcon}>⚔️</Text>
        </View>
        <View style={styles.draftBtnTextContainer}>
          <Text style={styles.draftBtnTitle}>Mulai Draft Simulator</Text>
          <Text style={styles.draftBtnSubtitle}>Tier aktif: {currentTier} • Ban & Pick Pintar</Text>
        </View>
        <Text style={styles.draftBtnChevron}>➔</Text>
      </TouchableOpacity>

      {/* Current Rank Tier Selector */}
      <View style={styles.card}>
        <View style={styles.cardHeaderRow}>
          <Text style={styles.cardHeaderTitle}>🏆 Tier Saat Ini (Rank Mode)</Text>
          <Text style={styles.tierName}>{currentTier}</Text>
        </View>
        <Text style={styles.tierMetaText}>
          {TIER_META_NOTES[currentTier]}
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tierScroll}>
          {(['Epic', 'Legend', 'Mythic', 'Mythical Honor', 'Mythical Glory', 'Mythical Immortal'] as RankTier[]).map(t => {
            const isSelected = currentTier === t;
            return (
              <TouchableOpacity
                key={t}
                onPress={() => onSelectTier(t)}
                style={[styles.tierChip, isSelected && styles.selectedTierChip]}
              >
                <Text style={[styles.tierChipText, isSelected && styles.selectedTierChipText]}>
                  {t}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* My Hero Power Preview */}
      <View style={styles.card}>
        <View style={styles.cardHeaderRow}>
          <Text style={styles.cardHeaderTitle}>⚡ My Hero Power</Text>
          <TouchableOpacity onPress={() => onNavigate('heroPower')}>
            <Text style={styles.manageLink}>Kelola ({heroPower.length}) ➔</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.heroPowerNote}>
          Hero andalan yang Anda kuasai. Sistem akan memprioritaskan rekomendasi dari daftar ini.
        </Text>
        <View style={styles.heroPowerRow}>
          {mainHeroes.map(hp => {
            const hero = getHeroById(hp.heroId);
            if (!hero) return null;
            return (
              <View key={hp.heroId} style={styles.heroPowerItem}>
                <HeroAvatar hero={hero} size={48} showRoleBadge />
                <Text style={styles.heroPowerName} numberOfLines={1}>{hero.name}</Text>
                <Text style={styles.heroPowerLevel}>{hp.masteryLevel.split(' ')[0]}</Text>
              </View>
            );
          })}
          {heroPower.length === 0 && (
            <TouchableOpacity onPress={() => onNavigate('heroPower')} style={styles.emptyHpBtn}>
              <Text style={styles.emptyHpText}>+ Masukkan Hero Andalan Anda</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Quick Tools Grid */}
      <View style={styles.toolsGrid}>
        <TouchableOpacity 
          style={styles.toolCard}
          onPress={() => onNavigate('counter')}
        >
          <Text style={styles.toolIcon}>🛡️</Text>
          <Text style={styles.toolTitle}>Smart Counter</Text>
          <Text style={styles.toolDesc}>Cari counter terbaik lawan seketika</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.toolCard}
          onPress={() => onNavigate('history')}
        >
          <Text style={styles.toolIcon}>📜</Text>
          <Text style={styles.toolTitle}>Riwayat & Patch</Text>
          <Text style={styles.toolDesc}>Laporan draft & perbandingan patch</Text>
        </TouchableOpacity>
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
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  appTitle: {
    color: Colors.textPrimary,
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  appSubtitle: {
    color: Colors.gold,
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  officialBadge: {
    backgroundColor: Colors.surfaceLight,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.goldMuted,
  },
  officialBadgeText: {
    color: Colors.gold,
    fontSize: 10,
    fontWeight: '800',
  },
  officialCard: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  cardHeaderTitle: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: '800',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 230, 118, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.green,
    marginRight: 5,
  },
  statusPillText: {
    color: Colors.green,
    fontSize: 9,
    fontWeight: '800',
  },
  officialDesc: {
    color: Colors.textSecondary,
    fontSize: 11,
    lineHeight: 16,
    marginBottom: 12,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statBox: {
    flex: 1,
    backgroundColor: Colors.surfaceLight,
    borderRadius: 8,
    padding: 8,
    alignItems: 'center',
    marginHorizontal: 3,
  },
  statNumber: {
    color: Colors.textPrimary,
    fontSize: 13,
    fontWeight: '800',
  },
  statLabel: {
    color: Colors.textMuted,
    fontSize: 9,
    marginTop: 2,
  },
  quickDraftBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.blue,
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
    elevation: 4,
  },
  draftBtnIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  draftBtnIcon: {
    fontSize: 20,
  },
  draftBtnTextContainer: {
    flex: 1,
  },
  draftBtnTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  draftBtnSubtitle: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 11,
    marginTop: 2,
  },
  draftBtnChevron: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  card: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
  },
  tierName: {
    color: Colors.gold,
    fontSize: 12,
    fontWeight: '800',
  },
  tierMetaText: {
    color: Colors.textSecondary,
    fontSize: 11,
    lineHeight: 16,
    marginBottom: 10,
  },
  tierScroll: {
    flexDirection: 'row',
  },
  tierChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: Colors.surfaceLight,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    marginRight: 8,
  },
  selectedTierChip: {
    backgroundColor: 'rgba(255, 184, 0, 0.15)',
    borderColor: Colors.gold,
  },
  tierChipText: {
    color: Colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },
  selectedTierChipText: {
    color: Colors.gold,
    fontWeight: '800',
  },
  manageLink: {
    color: Colors.blue,
    fontSize: 11,
    fontWeight: '700',
  },
  heroPowerNote: {
    color: Colors.textMuted,
    fontSize: 11,
    marginBottom: 12,
  },
  heroPowerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  heroPowerItem: {
    alignItems: 'center',
    width: 60,
  },
  heroPowerName: {
    color: Colors.textPrimary,
    fontSize: 11,
    fontWeight: '700',
    marginTop: 4,
  },
  heroPowerLevel: {
    color: Colors.gold,
    fontSize: 9,
    fontWeight: '600',
  },
  emptyHpBtn: {
    flex: 1,
    padding: 16,
    borderRadius: 10,
    backgroundColor: Colors.surfaceLight,
    alignItems: 'center',
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  emptyHpText: {
    color: Colors.gold,
    fontSize: 12,
    fontWeight: '700',
  },
  toolsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  toolCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    borderRadius: 14,
    padding: 14,
    marginHorizontal: 4,
  },
  toolIcon: {
    fontSize: 22,
    marginBottom: 6,
  },
  toolTitle: {
    color: Colors.textPrimary,
    fontSize: 13,
    fontWeight: '800',
  },
  toolDesc: {
    color: Colors.textMuted,
    fontSize: 10,
    marginTop: 4,
    lineHeight: 14,
  },
});
