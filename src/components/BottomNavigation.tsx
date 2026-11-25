import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Colors } from '../theme/colors';

export type TabName = 'home' | 'heroPower' | 'draft' | 'counter' | 'history';

interface BottomNavigationProps {
  activeTab: TabName;
  onSelectTab: (tab: TabName) => void;
}

interface TabItem {
  id: TabName;
  label: string;
  icon: string;
  badge?: string;
}

const TABS: TabItem[] = [
  { id: 'home', label: 'Home', icon: '🏠' },
  { id: 'heroPower', label: 'Hero Power', icon: '⚡' },
  { id: 'draft', label: 'Draft', icon: '⚔️' },
  { id: 'counter', label: 'Counter', icon: '🛡️' },
  { id: 'history', label: 'History', icon: '📜' },
];

export const BottomNavigation: React.FC<BottomNavigationProps> = ({
  activeTab,
  onSelectTab,
}) => {
  return (
    <View style={styles.container}>
      {TABS.map(tab => {
        const isActive = activeTab === tab.id;
        return (
          <TouchableOpacity
            key={tab.id}
            onPress={() => onSelectTab(tab.id)}
            style={styles.tabButton}
            activeOpacity={0.7}
          >
            <View style={[styles.iconWrapper, isActive && styles.activeIconWrapper]}>
              <Text style={styles.icon}>{tab.icon}</Text>
            </View>
            <Text style={[styles.label, isActive && styles.activeLabel]}>
              {tab.label}
            </Text>
            {isActive && <View style={styles.activeIndicator} />}
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceBorder,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 24 : 10,
    elevation: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    paddingVertical: 2,
  },
  iconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
  },
  activeIconWrapper: {
    backgroundColor: 'rgba(255, 184, 0, 0.15)',
  },
  icon: {
    fontSize: 16,
  },
  label: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  activeLabel: {
    color: Colors.gold,
    fontWeight: '800',
  },
  activeIndicator: {
    position: 'absolute',
    top: -8,
    width: 28,
    height: 3,
    backgroundColor: Colors.gold,
    borderBottomLeftRadius: 2,
    borderBottomRightRadius: 2,
  },
});
