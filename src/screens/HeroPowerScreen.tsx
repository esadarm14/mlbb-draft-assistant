import React, { useState } from 'react';
import { 
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, Modal 
} from 'react-native';
import { HeroPowerItem, Lane, MasteryLevel } from '../types';
import { getHeroById } from '../database/heroesData';
import { HeroAvatar } from '../components/HeroAvatar';
import { HeroAutocomplete } from '../components/HeroAutocomplete';
import { Colors, ROLE_COLORS } from '../theme/colors';

interface HeroPowerScreenProps {
  heroPower: HeroPowerItem[];
  onUpdateHeroPower: (items: HeroPowerItem[]) => void;
}

const LANES: (Lane | 'Semua')[] = ['Semua', 'EXP Lane', 'Jungle', 'Mid Lane', 'Gold Lane', 'Roam'];
const MASTERY_LEVELS: MasteryLevel[] = ['Main Hero', 'Highly Mastered', 'Comfortable', 'Backup Hero'];

export const HeroPowerScreen: React.FC<HeroPowerScreenProps> = ({
  heroPower,
  onUpdateHeroPower,
}) => {
  const [selectedLaneTab, setSelectedLaneTab] = useState<Lane | 'Semua'>('Semua');
  const [editingItem, setEditingItem] = useState<HeroPowerItem | null>(null);

  const handleAddHero = (heroId: string) => {
    if (heroPower.some(h => h.heroId === heroId)) return;
    const hero = getHeroById(heroId);
    const primaryLane = (hero?.lanes[0] as Lane) || 'EXP Lane';
    
    const newItem: HeroPowerItem = {
      heroId,
      primaryLane,
      masteryLevel: 'Highly Mastered',
      priority: heroPower.length + 1,
      updatedAt: new Date().toISOString(),
    };
    onUpdateHeroPower([...heroPower, newItem]);
  };

  const handleRemoveHero = (heroId: string) => {
    onUpdateHeroPower(heroPower.filter(h => h.heroId !== heroId));
  };

  const handleUpdateItem = (updated: HeroPowerItem) => {
    onUpdateHeroPower(heroPower.map(h => h.heroId === updated.heroId ? updated : h));
    setEditingItem(null);
  };

  const handleMovePriority = (heroId: string, direction: 'up' | 'down') => {
    const index = heroPower.findIndex(h => h.heroId === heroId);
    if (index < 0) return;
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === heroPower.length - 1) return;

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const nextList = [...heroPower];
    const temp = nextList[index];
    nextList[index] = nextList[targetIndex];
    nextList[targetIndex] = temp;

    // re-assign sequential priorities
    const reordered = nextList.map((item, idx) => ({ ...item, priority: idx + 1 }));
    onUpdateHeroPower(reordered);
  };

  const filteredItems = heroPower.filter(hp => {
    if (selectedLaneTab === 'Semua') return true;
    return hp.primaryLane === selectedLaneTab;
  });

  const getMasteryColor = (level: MasteryLevel) => {
    switch (level) {
      case 'Main Hero': return Colors.gold;
      case 'Highly Mastered': return Colors.purple;
      case 'Comfortable': return Colors.blue;
      case 'Backup Hero': return Colors.textMuted;
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Header Title */}
        <View style={styles.header}>
          <Text style={styles.title}>MY HERO POWER</Text>
          <Text style={styles.subtitle}>
            Daftar hero yang Anda kuasai. Rekomendasi draft cerdas akan memprioritaskan hero di halaman ini.
          </Text>
        </View>

        {/* Hero Autocomplete Search for adding to Hero Power */}
        <View style={styles.searchCard}>
          <HeroAutocomplete
            label="+ Tambah Hero Andalan"
            placeholder="Cari hero untuk ditambahkan ke Hero Power..."
            selectedHeroIds={heroPower.map(h => h.heroId)}
            onAddHero={handleAddHero}
            onRemoveHero={handleRemoveHero}
            variant="gold"
            showRoleFilters
          />
        </View>

        {/* Lane Grouping Tabs */}
        <View style={styles.laneTabsWrapper}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.laneTabs}>
            {LANES.map(lane => {
              const count = lane === 'Semua' 
                ? heroPower.length 
                : heroPower.filter(h => h.primaryLane === lane).length;
              const isSelected = selectedLaneTab === lane;
              return (
                <TouchableOpacity
                  key={lane}
                  onPress={() => setSelectedLaneTab(lane)}
                  style={[styles.laneTab, isSelected && styles.activeLaneTab]}
                >
                  <Text style={[styles.laneTabText, isSelected && styles.activeLaneTabText]}>
                    {lane} ({count})
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Hero Power List */}
        <View style={styles.listContainer}>
          {filteredItems.map((item, index) => {
            const hero = getHeroById(item.heroId);
            if (!hero) return null;
            const primaryRole = hero.roles[0] || 'Tank';
            const roleColor = ROLE_COLORS[primaryRole] || Colors.textSecondary;
            const masteryColor = getMasteryColor(item.masteryLevel);

            return (
              <View key={item.heroId} style={styles.heroCard}>
                {/* Priority Badge */}
                <View style={styles.priorityBox}>
                  <Text style={styles.priorityNum}>#{item.priority}</Text>
                  <View style={styles.priorityBtns}>
                    <TouchableOpacity 
                      onPress={() => handleMovePriority(item.heroId, 'up')}
                      disabled={index === 0}
                      style={styles.arrowBtn}
                    >
                      <Text style={[styles.arrowText, index === 0 && styles.disabledText]}>▲</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      onPress={() => handleMovePriority(item.heroId, 'down')}
                      disabled={index === filteredItems.length - 1}
                      style={styles.arrowBtn}
                    >
                      <Text style={[styles.arrowText, index === filteredItems.length - 1 && styles.disabledText]}>▼</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Hero Avatar and Info */}
                <HeroAvatar hero={hero} size={48} showRoleBadge />
                
                <View style={styles.heroDetails}>
                  <Text style={styles.heroName}>{hero.name}</Text>
                  <View style={styles.heroTagsRow}>
                    <Text style={[styles.roleTag, { color: roleColor }]}>{hero.roles.join('/')}</Text>
                    <Text style={styles.laneTag}> • {item.primaryLane}</Text>
                  </View>
                  <TouchableOpacity 
                    onPress={() => setEditingItem(item)}
                    style={[styles.masteryPill, { borderColor: masteryColor, backgroundColor: 'rgba(255,255,255,0.03)' }]}
                  >
                    <Text style={[styles.masteryText, { color: masteryColor }]}>
                      ★ {item.masteryLevel} (Ubah)
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Remove Hero */}
                <TouchableOpacity 
                  onPress={() => handleRemoveHero(item.heroId)}
                  style={styles.deleteBtn}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Text style={styles.deleteX}>✕</Text>
                </TouchableOpacity>
              </View>
            );
          })}

          {filteredItems.length === 0 && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>🛡️</Text>
              <Text style={styles.emptyTitle}>Belum ada hero di kategori ini</Text>
              <Text style={styles.emptyDesc}>Gunakan kolom pencarian di atas untuk memasukkan hero andalan Anda.</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Edit Mastery Modal */}
      {editingItem && (
        <Modal
          visible={!!editingItem}
          transparent
          animationType="fade"
          onRequestClose={() => setEditingItem(null)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Tingkat Penguasaan Hero</Text>
              <Text style={styles.modalHeroName}>
                {getHeroById(editingItem.heroId)?.name}
              </Text>

              <Text style={styles.modalSectionLabel}>Pilih Lane Utama:</Text>
              <View style={styles.modalOptionsRow}>
                {(['EXP Lane', 'Jungle', 'Mid Lane', 'Gold Lane', 'Roam'] as Lane[]).map(l => (
                  <TouchableOpacity
                    key={l}
                    onPress={() => setEditingItem({ ...editingItem, primaryLane: l })}
                    style={[styles.modalOptionPill, editingItem.primaryLane === l && styles.activeModalOption]}
                  >
                    <Text style={[styles.modalOptionText, editingItem.primaryLane === l && styles.activeModalOptionText]}>
                      {l}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.modalSectionLabel}>Level Penguasaan:</Text>
              {MASTERY_LEVELS.map(level => {
                const color = getMasteryColor(level);
                const isSelected = editingItem.masteryLevel === level;
                return (
                  <TouchableOpacity
                    key={level}
                    onPress={() => setEditingItem({ ...editingItem, masteryLevel: level })}
                    style={[styles.masterySelectRow, isSelected && { borderColor: color, backgroundColor: 'rgba(255,255,255,0.05)' }]}
                  >
                    <Text style={[styles.masterySelectText, { color }]}>
                      {isSelected ? '● ' : '○ '} {level}
                    </Text>
                  </TouchableOpacity>
                );
              })}

              <View style={styles.modalActions}>
                <TouchableOpacity 
                  onPress={() => setEditingItem(null)} 
                  style={styles.modalCancelBtn}
                >
                  <Text style={styles.modalCancelText}>Batal</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  onPress={() => handleUpdateItem(editingItem)} 
                  style={styles.modalSaveBtn}
                >
                  <Text style={styles.modalSaveText}>Simpan</Text>
                </TouchableOpacity>
              </View>
            </View>
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
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 12,
  },
  title: {
    color: Colors.textPrimary,
    fontSize: 18,
    fontWeight: '900',
  },
  subtitle: {
    color: Colors.textSecondary,
    fontSize: 11,
    marginTop: 4,
    lineHeight: 16,
  },
  searchCard: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
  },
  laneTabsWrapper: {
    marginBottom: 12,
  },
  laneTabs: {
    flexDirection: 'row',
  },
  laneTab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    marginRight: 6,
  },
  activeLaneTab: {
    backgroundColor: 'rgba(255, 184, 0, 0.15)',
    borderColor: Colors.gold,
  },
  laneTabText: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  activeLaneTabText: {
    color: Colors.gold,
    fontWeight: '800',
  },
  listContainer: {
    marginTop: 2,
  },
  heroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    borderRadius: 14,
    padding: 10,
    marginBottom: 8,
  },
  priorityBox: {
    alignItems: 'center',
    marginRight: 10,
    width: 24,
  },
  priorityNum: {
    color: Colors.gold,
    fontSize: 11,
    fontWeight: '900',
  },
  priorityBtns: {
    marginTop: 2,
  },
  arrowBtn: {
    padding: 1,
  },
  arrowText: {
    color: Colors.textSecondary,
    fontSize: 9,
  },
  disabledText: {
    color: Colors.textMuted,
    opacity: 0.3,
  },
  heroDetails: {
    flex: 1,
    marginLeft: 12,
  },
  heroName: {
    color: Colors.textPrimary,
    fontSize: 13,
    fontWeight: '800',
  },
  heroTagsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  roleTag: {
    fontSize: 10,
    fontWeight: '600',
  },
  laneTag: {
    fontSize: 10,
    color: Colors.textMuted,
  },
  masteryPill: {
    marginTop: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  masteryText: {
    fontSize: 9,
    fontWeight: '800',
  },
  deleteBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: Colors.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  deleteX: {
    color: Colors.red,
    fontSize: 12,
    fontWeight: 'bold',
  },
  emptyState: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
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
    fontWeight: '700',
  },
  emptyDesc: {
    color: Colors.textMuted,
    fontSize: 11,
    textAlign: 'center',
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    backgroundColor: Colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    padding: 18,
  },
  modalTitle: {
    color: Colors.textPrimary,
    fontSize: 15,
    fontWeight: '900',
  },
  modalHeroName: {
    color: Colors.gold,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
    marginBottom: 12,
  },
  modalSectionLabel: {
    color: Colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
    marginTop: 8,
    marginBottom: 6,
  },
  modalOptionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 10,
  },
  modalOptionPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: Colors.surfaceLight,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    marginRight: 6,
    marginBottom: 6,
  },
  activeModalOption: {
    backgroundColor: 'rgba(0, 136, 255, 0.2)',
    borderColor: Colors.blue,
  },
  modalOptionText: {
    color: Colors.textSecondary,
    fontSize: 11,
  },
  activeModalOptionText: {
    color: Colors.blue,
    fontWeight: 'bold',
  },
  masterySelectRow: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    marginBottom: 6,
  },
  masterySelectText: {
    fontSize: 12,
    fontWeight: '700',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 14,
  },
  modalCancelBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    marginRight: 8,
  },
  modalCancelText: {
    color: Colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
  },
  modalSaveBtn: {
    backgroundColor: Colors.gold,
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderRadius: 8,
  },
  modalSaveText: {
    color: '#000000',
    fontSize: 12,
    fontWeight: '800',
  },
});
