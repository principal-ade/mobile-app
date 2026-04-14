import * as SecureStore from 'expo-secure-store';

const SEARCH_HISTORY_KEY = 'search_history';
const CLICKED_RESULTS_KEY = 'clicked_results';
const MAX_HISTORY_ENTRIES = 3;
const MAX_CLICKED_RESULTS = 5;

export interface SearchHistoryEntry {
  query: string;
  timestamp: string;
}

export interface ClickedResult {
  type: 'repo' | 'user';
  id: string;
  name: string;
  owner?: string; // For repos
  login?: string; // For users
  avatarUrl: string;
  timestamp: string;
  githubType?: 'User' | 'Organization'; // For distinguishing users from orgs
}

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

/**
 * Get search history
 * Returns most recent searches first (sorted by timestamp descending)
 */
export async function getSearchHistory(): Promise<SearchHistoryEntry[]> {
  const data = await getItem(SEARCH_HISTORY_KEY);
  if (!data) return [];
  try {
    return JSON.parse(data);
  } catch {
    return [];
  }
}

/**
 * Save a search query to history
 * - Deduplicates: if query already exists, updates timestamp and moves to front
 * - FIFO: removes oldest entry when exceeding MAX_HISTORY_ENTRIES
 */
export async function saveSearchQuery(query: string): Promise<void> {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) return;

  const history = await getSearchHistory();

  // Remove existing entry if present (case-insensitive)
  const filtered = history.filter(
    entry => entry.query.toLowerCase() !== trimmedQuery.toLowerCase()
  );

  // Add new entry at the front
  const newEntry: SearchHistoryEntry = {
    query: trimmedQuery,
    timestamp: new Date().toISOString(),
  };

  const updated = [newEntry, ...filtered];

  // Keep only MAX_HISTORY_ENTRIES (FIFO)
  const limited = updated.slice(0, MAX_HISTORY_ENTRIES);

  await setItem(SEARCH_HISTORY_KEY, JSON.stringify(limited));
}

/**
 * Clear all search history
 */
export async function clearSearchHistory(): Promise<void> {
  if (await isSecureStoreAvailable()) {
    await SecureStore.deleteItemAsync(SEARCH_HISTORY_KEY);
    return;
  }
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem(SEARCH_HISTORY_KEY);
  }
}

/**
 * Get clicked results history
 * Returns most recent clicks first (sorted by timestamp descending)
 */
export async function getClickedResults(): Promise<ClickedResult[]> {
  const data = await getItem(CLICKED_RESULTS_KEY);
  if (!data) return [];
  try {
    return JSON.parse(data);
  } catch {
    return [];
  }
}

/**
 * Save a clicked result to history
 * - Deduplicates: if result already exists, updates timestamp and moves to front
 * - FIFO: removes oldest entry when exceeding MAX_CLICKED_RESULTS
 */
export async function saveClickedResult(result: Omit<ClickedResult, 'timestamp'>): Promise<void> {
  const history = await getClickedResults();

  // Remove existing entry if present (by id)
  const filtered = history.filter(entry => entry.id !== result.id);

  // Add new entry at the front
  const newEntry: ClickedResult = {
    ...result,
    timestamp: new Date().toISOString(),
  };

  const updated = [newEntry, ...filtered];

  // Keep only MAX_CLICKED_RESULTS (FIFO)
  const limited = updated.slice(0, MAX_CLICKED_RESULTS);

  await setItem(CLICKED_RESULTS_KEY, JSON.stringify(limited));
}

/**
 * Clear all clicked results
 */
export async function clearClickedResults(): Promise<void> {
  if (await isSecureStoreAvailable()) {
    await SecureStore.deleteItemAsync(CLICKED_RESULTS_KEY);
    return;
  }
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem(CLICKED_RESULTS_KEY);
  }
}
