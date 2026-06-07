import * as SecureStore from 'expo-secure-store';

/**
 * Persistence for the Recent tab's view mode (list vs. full-bleed cards).
 * Mirrors the SecureStore-with-localStorage-fallback pattern in feedStorage.
 */

const RECENT_TRAILS_VIEW_MODE_KEY = 'recent_trails_view_mode';

export type RecentTrailsViewMode = 'list' | 'cards';

export const DEFAULT_RECENT_TRAILS_VIEW_MODE: RecentTrailsViewMode = 'list';

async function isSecureStoreAvailable(): Promise<boolean> {
  try {
    return await SecureStore.isAvailableAsync();
  } catch (error) {
    console.warn('SecureStore availability check failed', error);
    return false;
  }
}

async function setItem(key: string, value: string): Promise<void> {
  if (await isSecureStoreAvailable()) {
    await SecureStore.setItemAsync(key, value);
    return;
  }
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(key, value);
  }
}

async function getItem(key: string): Promise<string | null> {
  if (await isSecureStoreAvailable()) {
    return SecureStore.getItemAsync(key);
  }
  if (typeof localStorage !== 'undefined') {
    return localStorage.getItem(key);
  }
  return null;
}

export async function saveRecentTrailsViewMode(
  mode: RecentTrailsViewMode,
): Promise<void> {
  try {
    await setItem(RECENT_TRAILS_VIEW_MODE_KEY, mode);
  } catch (error) {
    console.warn('Failed to save recent trails view mode:', error);
  }
}

export async function getRecentTrailsViewMode(): Promise<RecentTrailsViewMode> {
  try {
    const data = await getItem(RECENT_TRAILS_VIEW_MODE_KEY);
    return data === 'cards' || data === 'list'
      ? data
      : DEFAULT_RECENT_TRAILS_VIEW_MODE;
  } catch {
    return DEFAULT_RECENT_TRAILS_VIEW_MODE;
  }
}
