import React, { useState, useMemo } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, FlatList, 
  ScrollView, StyleSheet, Platform 
} from 'react-native';
import { Hero, Role } from '../types';
import { MLBB_HEROES, getHeroById } from '../database/heroesData';
import { HeroAvatar } from './HeroAvatar';
import { HeroChip } from './HeroChip';
import { Colors, ROLE_COLORS } from '../theme/colors';

interface HeroAutocompleteProps {
  label?: string;
  placeholder?: string;
  selectedHeroIds: string[];
  onAddHero: (heroId: string) => void;
  onRemoveHero: (heroId: string) => void;
  onClearAll?: () => void;
  maxSelections?: number;
  excludedHeroIds?: string[]; // e.g. already picked or banned by opposing team
  variant?: 'blue' | 'red' | 'neutral' | 'gold';
  showRoleFilters?: boolean;
}

const ROLES_LIST: (Role | 'All')[] = ['All', 'Tank', 'Fighter', 'Assassin', 'Mage', 'Marksman', 'Support'];

export const HeroAutocomplete: React.FC<HeroAutocompleteProps> = ({
  label,
  placeholder = 'Cari hero (contoh: ma, tig, mar)...',
  selectedHeroIds,
  onAddHero,
  onRemoveHero,
  onClearAll,
  maxSelections,
  excludedHeroIds = [],
  variant = 'neutral',
  showRoleFilters = true,
}) => {
  const [query, setQuery] = useState('');
  const [activeRoleFilter, setActiveRoleFilter] = useState<Role | 'All'>('All');
  const [isFocused, setIsFocused] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>(['tigreal', 'martis', 'marcel', 'melissa']);

  // Exclude already selected or globally excluded heroes
  const unavailableIds = useMemo(() => {
    return new Set([...selectedHeroIds, ...excludedHeroIds].map(id => id.toLowerCase()));
  }, [selectedHeroIds, excludedHeroIds]);

  // Autocomplete matching
  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    return MLBB_HEROES.filter(hero => {
      if (unavailableIds.has(hero.id.toLowerCase())) return false;
      
      const matchesRole = activeRoleFilter === 'All' || hero.roles.includes(activeRoleFilter);
      if (!matchesRole) return false;

      if (!q) return isFocused; // show suggestions when focused
      
      return (
        hero.name.toLowerCase().includes(q) ||
        hero.id.toLowerCase().includes(q) ||
        hero.roles.some(r => r.toLowerCase().includes(q))
      );
    }).slice(0, 8); // Fast, lightweight mobile dropdown
  }, [query, activeRoleFilter, unavailableIds, isFocused]);

  const handleSelectHero = (hero: Hero) => {
    if (maxSelections && selectedHeroIds.length >= maxSelections) return;
    onAddHero(hero.id);
    setQuery('');
    
    // Update recent searches
    setRecentSearches(prev => [hero.id, ...prev.filter(id => id !== hero.id)].slice(0, 6));
  };

  const handleKeyPress = (e: any) => {
    if (e.nativeEvent.key === 'Enter' && suggestions.length > 0) {
      handleSelectHero(suggestions[0]);
    }
  };

  const isMaxReached = !!maxSelections && selectedHeroIds.length >= maxSelections;

  const selectedHeroes = useMemo(() => {
    return selectedHeroIds.map(id => getHeroById(id)).filter((h): h is Hero => !!h);
  }, [selectedHeroIds]);

  const getVariantColor = () => {
    switch (variant) {
      case 'blue': return Colors.blue;
      case 'red': return Colors.red;
      case 'gold': return Colors.gold;
      default: return Colors.surfaceBorder;
    }
  };

  return (
    <View style={styles.container}>
      {/* Label and Clear All Action */}
      <View style={styles.headerRow}>
        {label && <Text style={styles.label}>{label}</Text>}
        {maxSelections && (
          <Text style={styles.counterText}>
            ({selectedHeroIds.length}/{maxSelections})
          </Text>
        )}
        {selectedHeroIds.length > 0 && onClearAll && (
          <TouchableOpacity onPress={onClearAll} style={styles.clearAllBtn}>
            <Text style={styles.clearAllText}>Hapus Semua</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Selected Chips Area */}
      {selectedHeroes.length > 0 && (
        <View style={styles.chipsContainer}>
          {selectedHeroes.map(hero => (
            <HeroChip
              key={hero.id}
              hero={hero}
              variant={variant}
              onRemove={() => onRemoveHero(hero.id)}
            />
          ))}
        </View>
      )}

      {/* Input Box */}
      {!isMaxReached ? (
        <View style={[styles.inputBox, { borderColor: isFocused ? getVariantColor() : Colors.surfaceBorder }]}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.textInput}
            value={query}
            onChangeText={setQuery}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setTimeout(() => setIsFocused(false), 200)}
            placeholder={placeholder}
            placeholderTextColor={Colors.textMuted}
            onSubmitEditing={() => {
              if (suggestions.length > 0) handleSelectHero(suggestions[0]);
            }}
            onKeyPress={handleKeyPress}
            returnKeyType="done"
            autoCapitalize="none"
            autoCorrect={false}
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')} style={styles.clearQueryBtn}>
              <Text style={styles.clearQueryX}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <View style={styles.maxReachedNotice}>
          <Text style={styles.maxReachedText}>Maksimal {maxSelections} hero telah dipilih.</Text>
        </View>
      )}

      {/* Role Filter Pills */}
      {showRoleFilters && !isMaxReached && (
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          style={styles.roleFiltersScroll}
          contentContainerStyle={styles.roleFiltersContainer}
        >
          {ROLES_LIST.map(role => {
            const isActive = activeRoleFilter === role;
            const roleColor = role === 'All' ? Colors.gold : (ROLE_COLORS[role] || Colors.textSecondary);
            return (
              <TouchableOpacity
                key={role}
                onPress={() => setActiveRoleFilter(role)}
                style={[
                  styles.rolePill,
                  isActive && { backgroundColor: Colors.surfaceLight, borderColor: roleColor }
                ]}
              >
                <Text style={[styles.rolePillText, isActive && { color: roleColor, fontWeight: '700' }]}>
                  {role}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {/* Autocomplete Dropdown List */}
      {isFocused && suggestions.length > 0 && (
        <View style={styles.dropdownContainer}>
          <Text style={styles.dropdownHeader}>
            {query.trim() ? `Hasil Pencarian ("${query}")` : 'Saran Cepat Hero'}
          </Text>
          {suggestions.map((item, index) => {
            const primaryRole = item.roles[0] || 'Tank';
            const roleColor = ROLE_COLORS[primaryRole] || Colors.textSecondary;
            return (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.suggestionRow,
                  index === 0 && query.trim().length > 0 && styles.firstSuggestionHighlight
                ]}
                onPress={() => handleSelectHero(item)}
              >
                <HeroAvatar hero={item} size={36} />
                <View style={styles.suggestionInfo}>
                  <Text style={styles.suggestionName}>{item.name}</Text>
                  <View style={styles.suggestionRoleRow}>
                    <Text style={[styles.suggestionRole, { color: roleColor }]}>{item.roles.join(' / ')}</Text>
                    <Text style={styles.suggestionLane}> • {item.lanes.join(', ')}</Text>
                  </View>
                </View>
                <View style={styles.addPill}>
                  <Text style={styles.addPillText}>+ Pilih</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* Recent Searches (shown when focused and empty query) */}
      {isFocused && !query.trim() && recentSearches.length > 0 && (
        <View style={styles.recentContainer}>
          <Text style={styles.recentTitle}>Hero Populer / Terakhir Dicari:</Text>
          <View style={styles.recentChips}>
            {recentSearches
              .filter(id => !unavailableIds.has(id.toLowerCase()))
              .map(id => {
                const h = getHeroById(id);
                if (!h) return null;
                return (
                  <TouchableOpacity
                    key={h.id}
                    onPress={() => handleSelectHero(h)}
                    style={styles.recentChip}
                  >
                    <HeroAvatar hero={h} size={20} />
                    <Text style={styles.recentText}>{h.name}</Text>
                  </TouchableOpacity>
                );
              })}
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 6,
    zIndex: 10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  label: {
    color: Colors.textPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
  counterText: {
    color: Colors.textMuted,
    fontSize: 12,
    marginLeft: 6,
  },
  clearAllBtn: {
    marginLeft: 'auto',
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: Colors.surfaceLight,
  },
  clearAllText: {
    color: Colors.red,
    fontSize: 11,
    fontWeight: '600',
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 4,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
  },
  searchIcon: {
    fontSize: 14,
    marginRight: 8,
  },
  textInput: {
    flex: 1,
    color: Colors.textPrimary,
    fontSize: 13,
    paddingVertical: 8,
  },
  clearQueryBtn: {
    padding: 4,
  },
  clearQueryX: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: 'bold',
  },
  maxReachedNotice: {
    backgroundColor: Colors.surfaceLight,
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  maxReachedText: {
    color: Colors.textSecondary,
    fontSize: 12,
  },
  roleFiltersScroll: {
    marginTop: 6,
  },
  roleFiltersContainer: {
    paddingVertical: 2,
  },
  rolePill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    marginRight: 6,
  },
  rolePillText: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
  dropdownContainer: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    borderRadius: 12,
    marginTop: 6,
    paddingVertical: 6,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  dropdownHeader: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.textMuted,
    paddingHorizontal: 12,
    paddingVertical: 4,
    textTransform: 'uppercase',
  },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.surfaceBorder,
  },
  firstSuggestionHighlight: {
    backgroundColor: Colors.surfaceLight,
  },
  suggestionInfo: {
    flex: 1,
    marginLeft: 10,
  },
  suggestionName: {
    color: Colors.textPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
  suggestionRoleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  suggestionRole: {
    fontSize: 10,
    fontWeight: '600',
  },
  suggestionLane: {
    fontSize: 10,
    color: Colors.textMuted,
  },
  addPill: {
    backgroundColor: Colors.surfaceLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  addPillText: {
    color: Colors.gold,
    fontSize: 10,
    fontWeight: '700',
  },
  recentContainer: {
    backgroundColor: Colors.surface,
    borderRadius: 10,
    padding: 10,
    marginTop: 6,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  recentTitle: {
    fontSize: 11,
    color: Colors.textMuted,
    fontWeight: '600',
    marginBottom: 6,
  },
  recentChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  recentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 16,
    marginRight: 6,
    marginBottom: 6,
  },
  recentText: {
    color: Colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 6,
  },
});
