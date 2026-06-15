/**
 * Multi-account storage utilities
 * Manages account registry and per-account data with namespaced keys
 */

import * as SecureStore from 'expo-secure-store';
import type { AccountRegistry } from '../types/account';
import type { AuthTokens } from './authStorage';

// Storage keys
const ACCOUNTS_REGISTRY_KEY = 'accounts_registry';

/**
 * Storage helper functions (reused from authStorage pattern)
 */
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

async function deleteItem(key: string): Promise<void> {
  if (await isSecureStoreAvailable()) {
    await SecureStore.deleteItemAsync(key);
    return;
  }
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem(key);
  }
}

/**
 * Generate namespaced key for account-specific data
 */
function getAccountKey(userId: number, dataType: string): string {
  return `account_${userId}_${dataType}`;
}

/**
 * Account Registry Management
 */

export async function getAccountRegistry(): Promise<AccountRegistry | null> {
  const data = await getItem(ACCOUNTS_REGISTRY_KEY);
  if (!data) return null;
  try {
    return JSON.parse(data) as AccountRegistry;
  } catch {
    console.error('Failed to parse account registry');
    return null;
  }
}

export async function saveAccountRegistry(registry: AccountRegistry): Promise<void> {
  await setItem(ACCOUNTS_REGISTRY_KEY, JSON.stringify(registry));
}

/**
 * Account Tokens Management
 */

export async function getAccountTokens(userId: number): Promise<AuthTokens | null> {
  const data = await getItem(getAccountKey(userId, 'tokens'));
  if (!data) return null;
  try {
    return JSON.parse(data) as AuthTokens;
  } catch {
    console.error(`Failed to parse tokens for account ${userId}`);
    return null;
  }
}

export async function saveAccountTokens(userId: number, tokens: AuthTokens): Promise<void> {
  await setItem(getAccountKey(userId, 'tokens'), JSON.stringify(tokens));
}

export async function deleteAccountTokens(userId: number): Promise<void> {
  await deleteItem(getAccountKey(userId, 'tokens'));
}

/**
 * Delete all data for an account
 */

export async function deleteAccountData(userId: number): Promise<void> {
  await Promise.all([
    deleteAccountTokens(userId),
    // Purge any legacy per-account feed keys left over from the removed watch feature.
    deleteItem(getAccountKey(userId, 'feed_users')),
    deleteItem(getAccountKey(userId, 'feed_repos')),
  ]);
}
