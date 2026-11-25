import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Hero } from '../types';
import { HeroAvatar } from './HeroAvatar';
import { Colors, ROLE_COLORS } from '../theme/colors';

interface HeroChipProps {
  hero: Hero;
  onRemove?: () => void;
  variant?: 'blue' | 'red' | 'neutral' | 'gold';
  showLane?: boolean;
}

export const HeroChip: React.FC<HeroChipProps> = ({
  hero,
  onRemove,
  variant = 'neutral',
  showLane = false,
}) => {
  const primaryRole = hero.roles[0] || 'Tank';
  const roleColor = ROLE_COLORS[primaryRole] || Colors.textSecondary;

  const getBorderColor = () => {
    switch (variant) {
      case 'blue': return Colors.blue;
      case 'red': return Colors.red;
      case 'gold': return Colors.gold;
      default: return Colors.surfaceBorder;
    }
  };

  return (
    <View style={[styles.chip, { borderColor: getBorderColor() }]}>
      <HeroAvatar hero={hero} size={26} />
      <View style={styles.textContainer}>
        <Text style={styles.name} numberOfLines={1}>{hero.name}</Text>
        <Text style={[styles.role, { color: roleColor }]}>
          {showLane && hero.lanes[0] ? hero.lanes[0] : primaryRole}
        </Text>
      </View>
      {onRemove && (
        <TouchableOpacity 
          onPress={onRemove} 
          style={styles.removeBtn} 
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityLabel={`Hapus ${hero.name}`}
        >
          <Text style={styles.removeX}>✕</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderRadius: 20,
    paddingVertical: 4,
    paddingLeft: 4,
    paddingRight: 10,
    marginRight: 8,
    marginBottom: 8,
  },
  textContainer: {
    marginLeft: 6,
    marginRight: 6,
  },
  name: {
    color: Colors.textPrimary,
    fontSize: 12,
    fontWeight: '700',
  },
  role: {
    fontSize: 9,
    fontWeight: '600',
  },
  removeBtn: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: Colors.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
  },
  removeX: {
    color: Colors.textSecondary,
    fontSize: 10,
    fontWeight: 'bold',
    lineHeight: 12,
  },
});
