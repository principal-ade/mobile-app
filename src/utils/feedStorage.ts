import * as SecureStore from 'expo-secure-store';
import type { Collection } from '../types/collections';

const COLLECTIONS_KEY = 'collections';

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

// Collections
export async function saveCollections(collections: Collection[]): Promise<void> {
  try {
    await setItem(COLLECTIONS_KEY, JSON.stringify(collections));
  } catch (error) {
    console.warn('Failed to save collections to storage:', error);
  }
}

export async function getCollections(): Promise<Collection[] | null> {
  try {
    const data = await getItem(COLLECTIONS_KEY);
    if (!data) return null;
    return JSON.parse(data);
  } catch (error) {
    console.warn('Failed to get collections from storage:', error);
    return null;
  }
}
