/**
 * Migration utilities for converting single-account data to multi-account structure
 */

import { getTokens, deleteTokens } from './authStorage';
import { getWatchedUsers, getWatchedRepos } from './feedStorage';
import {
  getAccountRegistry,
  saveAccountRegistry,
  saveAccountTokens,
  saveAccountFeedUsers,
  saveAccountFeedRepos,
} from './accountStorage';
import type { AccountInfo, AccountRegistry } from '../types/account';
import type { GitHubUser } from '../types/github';
import * as SecureStore from 'expo-secure-store';

/**
 * Fetch GitHub user info to get user ID and details
 */
async function fetchGitHubUser(accessToken: string): Promise<GitHubUser> {
  const response = await fetch('https://api.github.com/user', {
    headers: {
      Accept: 'application/json',
      Authorization: `token ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch GitHub user');
  }

  return (await response.json()) as GitHubUser;
}

/**
 * Delete legacy storage item
 */
async function deleteItem(key: string): Promise<void> {
  try {
    if (await SecureStore.isAvailableAsync()) {
      await SecureStore.deleteItemAsync(key);
    }
  } catch {
    // Ignore errors
  }

  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem(key);
  }
}

/**
 * Check if legacy single-account data exists
 */
export async function hasLegacyData(): Promise<boolean> {
  const tokens = await getTokens();
  return tokens !== null;
}

/**
 * Migrate legacy single-account data to multi-account structure
 *
 * Returns true if migration was performed, false if already migrated or no data to migrate
 */
export async function migrateLegacyAccount(): Promise<boolean> {
  try {
    // Check if already migrated
    const existingRegistry = await getAccountRegistry();
    if (existingRegistry) {
      return false; // Already migrated
    }

    // Check for legacy tokens
    const legacyTokens = await getTokens();
    if (!legacyTokens) {
      return false; // Nothing to migrate
    }

    console.log('Starting migration from single-account to multi-account...');

    // Fetch GitHub user to get userId and details
    const user = await fetchGitHubUser(legacyTokens.githubAccessToken);

    // Create account info
    const accountInfo: AccountInfo = {
      userId: user.id,
      login: user.login,
      name: user.name || null,
      avatarUrl: user.avatar_url,
      addedAt: new Date().toISOString(),
    };

    // Migrate tokens
    await saveAccountTokens(user.id, legacyTokens);

    // Migrate feed preferences
    const [users, repos] = await Promise.all([
      getWatchedUsers(),
      getWatchedRepos(),
    ]);

    await saveAccountFeedUsers(user.id, users || []);
    await saveAccountFeedRepos(user.id, repos || []);

    // Create registry with this account as active
    const registry: AccountRegistry = {
      accounts: [accountInfo],
      activeAccountId: user.id,
    };
    await saveAccountRegistry(registry);

    // Clean up legacy keys
    await Promise.all([
      deleteTokens(),
      deleteItem('feed_followed_users'),
      deleteItem('feed_followed_repos'),
    ]);

    console.log(`Migration completed successfully for user ${user.login} (${user.id})`);
    return true;
  } catch (error) {
    console.error('Migration failed:', error);
    // Don't delete legacy data if migration fails
    return false;
  }
}
