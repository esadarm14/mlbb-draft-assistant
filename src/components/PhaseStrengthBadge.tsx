import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { PhaseStrength } from '../types';
import { Colors } from '../theme/colors';

interface PhaseStrengthBadgeProps {
  label: 'Early' | 'Mid' | 'Late';
  strength: PhaseStrength;
  compact?: boolean;
}

export const PhaseStrengthBadge: React.FC<PhaseStrengthBadgeProps> = ({
  label,
  strength,
  compact = false,
}) => {
  const getBadgeColors = () => {
    switch (strength) {
      case 'Strong':
        return { bg: 'rgba(0, 230, 118, 0.15)', text: Colors.green, border: Colors.green };
      case 'Average':
        return { bg: 'rgba(255, 184, 0, 0.15)', text: Colors.gold, border: Colors.gold };
      case 'Weak':
        return { bg: 'rgba(255, 51, 75, 0.15)', text: Colors.red, border: Colors.red };
    }
  };

  const colors = getBadgeColors();

  if (compact) {
    return (
      <View style={[styles.compactContainer, { backgroundColor: colors.bg, borderColor: colors.border }]}>
        <Text style={styles.compactLabel}>{label[0]}:</Text>
        <Text style={[styles.compactValue, { color: colors.text }]}>{strength}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.bg, borderColor: colors.border }]}>
      <Text style={styles.label}>{label} Game</Text>
      <Text style={[styles.strengthText, { color: colors.text }]}>{strength}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    marginRight: 6,
    minWidth: 70,
  },
  label: {
    color: Colors.textMuted,
    fontSize: 9,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  strengthText: {
    fontSize: 11,
    fontWeight: '800',
    marginTop: 1,
  },
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    marginRight: 4,
  },
  compactLabel: {
    color: Colors.textMuted,
    fontSize: 9,
    fontWeight: '700',
    marginRight: 2,
  },
  compactValue: {
    fontSize: 9,
    fontWeight: '800',
  },
});
