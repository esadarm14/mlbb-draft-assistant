import AsyncStorage from '@react-native-async-storage/async-storage';
import { HeroPowerItem, RankTier, DraftState, DraftReportData } from '../types';

const STORAGE_KEYS = {
  HERO_POWER: 'mlbb_my_hero_power_v1',
  TIER_PREFERENCE: 'mlbb_tier_preference_v1',
  DRAFT_HISTORY: 'mlbb_draft_history_v1',
  CUSTOM_DRAFT_CONFIG: 'mlbb_custom_draft_config_v1',
  SAVED_REPORTS: 'mlbb_saved_reports_v1',
};

// --- HERO POWER PERSISTENCE ---

export async function loadMyHeroPower(): Promise<HeroPowerItem[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.HERO_POWER);
    if (!raw) return getDefaultHeroPower();
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : getDefaultHeroPower();
  } catch {
    return getDefaultHeroPower();
  }
}

export async function saveMyHeroPower(items: HeroPowerItem[]): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.HERO_POWER, JSON.stringify(items));
  } catch (error) {
    console.error('Failed to save Hero Power:', error);
  }
}

export function getDefaultHeroPower(): HeroPowerItem[] {
  return [
    { heroId: 'tigreal', primaryLane: 'Roam', masteryLevel: 'Main Hero', priority: 1, updatedAt: new Date().toISOString() },
    { heroId: 'martis', primaryLane: 'Jungle', masteryLevel: 'Main Hero', priority: 2, updatedAt: new Date().toISOString() },
    { heroId: 'vexana', primaryLane: 'Mid Lane', masteryLevel: 'Highly Mastered', priority: 3, updatedAt: new Date().toISOString() },
    { heroId: 'melissa', primaryLane: 'Gold Lane', masteryLevel: 'Highly Mastered', priority: 4, updatedAt: new Date().toISOString() },
    { heroId: 'terizla', primaryLane: 'EXP Lane', masteryLevel: 'Comfortable', priority: 5, updatedAt: new Date().toISOString() },
    { heroId: 'marcel', primaryLane: 'Roam', masteryLevel: 'Comfortable', priority: 6, updatedAt: new Date().toISOString() },
    { heroId: 'masha', primaryLane: 'EXP Lane', masteryLevel: 'Backup Hero', priority: 7, updatedAt: new Date().toISOString() },
  ];
}

// --- TIER PREFERENCE PERSISTENCE ---

export async function loadTierPreference(): Promise<RankTier> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.TIER_PREFERENCE);
    return (raw as RankTier) || 'Mythic';
  } catch {
    return 'Mythic';
  }
}

export async function saveTierPreference(tier: RankTier): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.TIER_PREFERENCE, tier);
  } catch (error) {
    console.error('Failed to save Tier Preference:', error);
  }
}

// --- DRAFT REPORTS / HISTORY PERSISTENCE ---

export async function loadSavedReports(): Promise<DraftReportData[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.SAVED_REPORTS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function saveDraftReport(report: DraftReportData): Promise<void> {
  try {
    const existing = await loadSavedReports();
    const updated = [report, ...existing.slice(0, 19)]; // Keep latest 20 reports
    await AsyncStorage.setItem(STORAGE_KEYS.SAVED_REPORTS, JSON.stringify(updated));
  } catch (error) {
    console.error('Failed to save Draft Report:', error);
  }
}
