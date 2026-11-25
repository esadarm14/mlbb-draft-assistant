import React, { useState, useEffect } from 'react';
import { 
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Modal 
} from 'react-native';
import { DraftReportData } from '../types';
import { loadSavedReports } from '../storage/storageService';
import { HeroAvatar } from '../components/HeroAvatar';
import { Colors } from '../theme/colors';

export const HistoryScreen: React.FC = () => {
  const [reports, setReports] = useState<DraftReportData[]>([]);
  const [selectedReport, setSelectedReport] = useState<DraftReportData | null>(null);

  useEffect(() => {
    loadSavedReports().then(setReports);
  }, []);

  const PATCH_NOTES_HISTORY = [
    {
      version: '2.2.16',
      date: '16 Sep 2026',
      status: 'PARTIALLY VERIFIED',
      scope: 'UNCLASSIFIED (Original Server Time S41/S42)',
      highlights: 'Penyesuaian hero revamp, balance damage item Roam, dan penyesuaian durasi minion wave.'
    },
    {
      version: '2.1.88',
      date: '17 Jun 2026',
      status: 'VERIFIED',
      scope: 'Original Server Live Patch',
      highlights: 'Buff hero assassin jungler, nerf scaling marksman attack speed di early game.'
    },
    {
      version: '2.1.40',
      date: '18 Mar 2026',
      status: 'VERIFIED',
      scope: 'Original Server Live Patch',
      highlights: 'Perubahan battlefield Lord evolusi 3 dan buff defense tower shield.'
    }
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>RIWAYAT DRAFT & PATCH</Text>
        <Text style={styles.subtitle}>
          Arsip analisis draft Anda dan riwayat resmi pembaruan patch Moonton.
        </Text>
      </View>

      {/* Official Data Source Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>🌐 Official Source Registry</Text>
        <Text style={styles.cardDesc}>
          Terdaftar 4 portal resmi Moonton untuk menjaga integritas data:
        </Text>
        <View style={styles.sourceItem}>
          <Text style={styles.sourceUrl}>1. https://www.mobilelegends.com/</Text>
          <Text style={styles.sourceBadge}>PRIMARY</Text>
        </View>
        <View style={styles.sourceItem}>
          <Text style={styles.sourceUrl}>2. https://www.mobilelegends.com/id/home</Text>
          <Text style={styles.sourceBadge}>PRIMARY</Text>
        </View>
        <View style={styles.sourceItem}>
          <Text style={styles.sourceUrl}>3. https://www.mobilelegends.com/news/patch-notes</Text>
          <Text style={styles.sourceBadge}>PRIMARY</Text>
        </View>
        <View style={styles.sourceItem}>
          <Text style={styles.sourceUrl}>4. https://www.mobilelegends.com/news/</Text>
          <Text style={styles.sourceBadge}>PRIMARY</Text>
        </View>
      </View>

      {/* Official Patch History */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📜 Riwayat Patch Resmi</Text>
        {PATCH_NOTES_HISTORY.map((patch, idx) => (
          <View key={idx} style={styles.patchCard}>
            <View style={styles.patchHeader}>
              <Text style={styles.patchVersion}>Patch {patch.version}</Text>
              <View style={styles.patchPill}>
                <Text style={styles.patchPillText}>{patch.status}</Text>
              </View>
            </View>
            <Text style={styles.patchDate}>Rilis: {patch.date} • {patch.scope}</Text>
            <Text style={styles.patchHighlights}>{patch.highlights}</Text>
          </View>
        ))}
      </View>

      {/* Saved Draft Reports */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📑 Arsip Draft Terakhir ({reports.length})</Text>
        {reports.map((report, idx) => (
          <TouchableOpacity 
            key={idx} 
            onPress={() => setSelectedReport(report)}
            style={styles.reportItemCard}
          >
            <View style={styles.reportHeaderRow}>
              <Text style={styles.reportTierBadge}>{report.config.tier}</Text>
              <Text style={styles.reportDate}>{new Date(report.createdAt).toLocaleString()}</Text>
            </View>

            <View style={styles.reportVersusRow}>
              <View style={styles.teamMiniCol}>
                <Text style={[styles.teamMiniTitle, { color: Colors.blue }]}>Biru (5)</Text>
                <View style={styles.avatarRow}>
                  {report.blueTeam.picks.slice(0, 5).map(h => (
                    <HeroAvatar key={h.id} hero={h} size={26} />
                  ))}
                </View>
              </View>

              <Text style={styles.vsText}>VS</Text>

              <View style={styles.teamMiniCol}>
                <Text style={[styles.teamMiniTitle, { color: Colors.red }]}>Merah (5)</Text>
                <View style={styles.avatarRow}>
                  {report.redTeam.picks.slice(0, 5).map(h => (
                    <HeroAvatar key={h.id} hero={h} size={26} />
                  ))}
                </View>
              </View>
            </View>

            <Text style={styles.reportWcSummary} numberOfLines={2}>
              {report.blueTeam.evaluation.winCondition}
            </Text>
          </TouchableOpacity>
        ))}

        {reports.length === 0 && (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>Belum ada riwayat draft tersimpan.</Text>
            <Text style={styles.emptySubtext}>Selesaikan simulasi draft di tab "Draft" untuk menyimpan laporan otomatis.</Text>
          </View>
        )}
      </View>

      {/* Modal Detail Report */}
      {selectedReport && (
        <Modal
          visible={!!selectedReport}
          transparent
          animationType="fade"
          onRequestClose={() => setSelectedReport(null)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Detail Laporan Draft</Text>
                <TouchableOpacity onPress={() => setSelectedReport(null)}>
                  <Text style={styles.modalCloseText}>✕</Text>
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalScroll}>
                <Text style={styles.modalTier}>Rank: {selectedReport.config.tier}</Text>
                <Text style={styles.modalWcTitle}>WIN CONDITION TIM BIRU:</Text>
                <Text style={styles.modalWcBody}>{selectedReport.blueTeam.evaluation.winCondition}</Text>

                <Text style={[styles.modalWcTitle, { color: Colors.red, marginTop: 10 }]}>WIN CONDITION TIM MERAH:</Text>
                <Text style={styles.modalWcBody}>{selectedReport.redTeam.evaluation.winCondition}</Text>

                <Text style={[styles.modalWcTitle, { color: Colors.gold, marginTop: 10 }]}>PERBANDINGAN FASE:</Text>
                <Text style={styles.modalWcBody}>
                  Early: {selectedReport.comparison.earlyAdvantage} Unggul{'\n'}
                  Mid: {selectedReport.comparison.midAdvantage} Unggul{'\n'}
                  Late: {selectedReport.comparison.lateAdvantage} Unggul
                </Text>
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}
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
    marginBottom: 14,
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
  card: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    borderRadius: 14,
    padding: 12,
    marginBottom: 14,
  },
  cardTitle: {
    color: Colors.gold,
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 4,
  },
  cardDesc: {
    color: Colors.textSecondary,
    fontSize: 11,
    lineHeight: 15,
    marginBottom: 8,
  },
  sourceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.surfaceBorder,
  },
  sourceUrl: {
    color: Colors.textMuted,
    fontSize: 9,
    flex: 1,
  },
  sourceBadge: {
    color: Colors.green,
    fontSize: 8,
    fontWeight: '900',
  },
  section: {
    marginBottom: 14,
  },
  sectionTitle: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 8,
  },
  patchCard: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  patchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  patchVersion: {
    color: Colors.textPrimary,
    fontSize: 13,
    fontWeight: '800',
  },
  patchPill: {
    backgroundColor: 'rgba(0, 230, 118, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  patchPillText: {
    color: Colors.green,
    fontSize: 9,
    fontWeight: '800',
  },
  patchDate: {
    color: Colors.gold,
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  patchHighlights: {
    color: Colors.textSecondary,
    fontSize: 11,
    lineHeight: 15,
    marginTop: 6,
  },
  reportItemCard: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  reportHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  reportTierBadge: {
    color: Colors.gold,
    fontSize: 11,
    fontWeight: '800',
  },
  reportDate: {
    color: Colors.textMuted,
    fontSize: 10,
  },
  reportVersusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surfaceLight,
    padding: 8,
    borderRadius: 8,
  },
  teamMiniCol: {
    flex: 1,
  },
  teamMiniTitle: {
    fontSize: 10,
    fontWeight: '800',
    marginBottom: 4,
  },
  avatarRow: {
    flexDirection: 'row',
  },
  vsText: {
    color: Colors.textMuted,
    fontSize: 12,
    fontWeight: '900',
    marginHorizontal: 8,
  },
  reportWcSummary: {
    color: Colors.textSecondary,
    fontSize: 10,
    lineHeight: 14,
    marginTop: 8,
  },
  emptyCard: {
    backgroundColor: Colors.surface,
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  emptyText: {
    color: Colors.textPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
  emptySubtext: {
    color: Colors.textMuted,
    fontSize: 11,
    textAlign: 'center',
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    width: '100%',
    maxHeight: '80%',
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  modalTitle: {
    color: Colors.textPrimary,
    fontSize: 15,
    fontWeight: '900',
  },
  modalCloseText: {
    color: Colors.red,
    fontSize: 16,
    fontWeight: 'bold',
    padding: 4,
  },
  modalScroll: {
    marginTop: 6,
  },
  modalTier: {
    color: Colors.gold,
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 8,
  },
  modalWcTitle: {
    color: Colors.blue,
    fontSize: 10,
    fontWeight: '900',
    marginTop: 6,
    marginBottom: 2,
  },
  modalWcBody: {
    color: Colors.textSecondary,
    fontSize: 11,
    lineHeight: 16,
  },
});
