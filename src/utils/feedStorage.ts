import * as SecureStore from 'expo-secure-store';

const WATCHED_USERS_KEY = 'feed_followed_users';
const WATCHED_REPOS_KEY = 'feed_followed_repos';

export interface WatchedUser {
  login: string;
  watchedAt?: string;
  avatarUrl?: string;
}

export interface WatchedRepo {
  owner: string;
  repo: string;
  watchedAt?: string;
  isFeatured?: boolean;
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

// Watched Users
export async function saveWatchedUsers(users: WatchedUser[]): Promise<void> {
  await setItem(WATCHED_USERS_KEY, JSON.stringify(users));
}

export async function getWatchedUsers(): Promise<WatchedUser[] | null> {
  const data = await getItem(WATCHED_USERS_KEY);
  if (!data) return null;
  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
}

// Watched Repos
export async function saveWatchedRepos(repos: WatchedRepo[]): Promise<void> {
  await setItem(WATCHED_REPOS_KEY, JSON.stringify(repos));
}

export async function getWatchedRepos(): Promise<WatchedRepo[] | null> {
  const data = await getItem(WATCHED_REPOS_KEY);
  if (!data) return null;
  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
}

// Check if user has customized their feed (vs using defaults)
export async function hasCustomizedFeed(): Promise<boolean> {
  const repos = await getItem(WATCHED_REPOS_KEY);
  return repos !== null;
}
