import * as SecureStore from 'expo-secure-store';

const FOLLOWED_USERS_KEY = 'feed_followed_users';
const FOLLOWED_REPOS_KEY = 'feed_followed_repos';

export interface FollowedUser {
  login: string;
  followedAt?: string;
  avatarUrl?: string;
}

export interface FollowedRepo {
  owner: string;
  repo: string;
  followedAt?: string;
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

// Followed Users
export async function saveFollowedUsers(users: FollowedUser[]): Promise<void> {
  await setItem(FOLLOWED_USERS_KEY, JSON.stringify(users));
}

export async function getFollowedUsers(): Promise<FollowedUser[] | null> {
  const data = await getItem(FOLLOWED_USERS_KEY);
  if (!data) return null;
  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
}

// Followed Repos
export async function saveFollowedRepos(repos: FollowedRepo[]): Promise<void> {
  await setItem(FOLLOWED_REPOS_KEY, JSON.stringify(repos));
}

export async function getFollowedRepos(): Promise<FollowedRepo[] | null> {
  const data = await getItem(FOLLOWED_REPOS_KEY);
  if (!data) return null;
  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
}

// Check if user has customized their feed (vs using defaults)
export async function hasCustomizedFeed(): Promise<boolean> {
  const repos = await getItem(FOLLOWED_REPOS_KEY);
  return repos !== null;
}
