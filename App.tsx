import React, { useState, useEffect } from 'react';
import { View, StyleSheet, StatusBar as RNStatusBar } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { RankTier, HeroPowerItem, DraftReportData } from './src/types';
import { 
  loadMyHeroPower, saveMyHeroPower, 
  loadTierPreference, saveTierPreference, 
  saveDraftReport 
} from './src/storage/storageService';

import { BottomNavigation, TabName } from './src/components/BottomNavigation';
import { HomeScreen } from './src/screens/HomeScreen';
import { HeroPowerScreen } from './src/screens/HeroPowerScreen';
import { DraftScreen } from './src/screens/DraftScreen';
import { CounterScreen } from './src/screens/CounterScreen';
import { HistoryScreen } from './src/screens/HistoryScreen';
import { Colors } from './src/theme/colors';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabName>('home');
  const [currentTier, setCurrentTier] = useState<RankTier>('Mythic');
  const [heroPower, setHeroPower] = useState<HeroPowerItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load persisted Hero Power and Tier Preference on startup
  useEffect(() => {
    async function initAppData() {
      const savedTier = await loadTierPreference();
      const savedHp = await loadMyHeroPower();
      setCurrentTier(savedTier);
      setHeroPower(savedHp);
      setIsLoaded(true);
    }
    initAppData();
  }, []);

  const handleSelectTier = (tier: RankTier) => {
    setCurrentTier(tier);
    saveTierPreference(tier);
  };

  const handleUpdateHeroPower = (items: HeroPowerItem[]) => {
    setHeroPower(items);
    saveMyHeroPower(items);
  };

  const handleSaveReport = (report: DraftReportData) => {
    saveDraftReport(report);
  };

  if (!isLoaded) {
    return <View style={styles.splash} />;
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <StatusBar style="light" backgroundColor={Colors.background} />
        
        {/* Main Active Screen */}
        <View style={styles.screenContainer}>
          {activeTab === 'home' && (
            <HomeScreen
              currentTier={currentTier}
              onSelectTier={handleSelectTier}
              heroPower={heroPower}
              onNavigate={(tab) => setActiveTab(tab)}
            />
          )}

          {activeTab === 'heroPower' && (
            <HeroPowerScreen
              heroPower={heroPower}
              onUpdateHeroPower={handleUpdateHeroPower}
            />
          )}

          {activeTab === 'draft' && (
            <DraftScreen
              currentTier={currentTier}
              onSelectTier={handleSelectTier}
              heroPower={heroPower}
              onSaveReport={handleSaveReport}
            />
          )}

          {activeTab === 'counter' && (
            <CounterScreen
              heroPower={heroPower}
            />
          )}

          {activeTab === 'history' && (
            <HistoryScreen />
          )}
        </View>

        {/* Smartphone Ergonomic Bottom Navigation */}
        <BottomNavigation
          activeTab={activeTab}
          onSelectTab={setActiveTab}
        />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  splash: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  screenContainer: {
    flex: 1,
  },
});
