/**
 * Inbox-local UI preferences.
 *
 * Currently just the "don't ask again" flag for the swipe-to-delete confirm
 * dialog. Persisted the same way as the rest of the app's small prefs
 * (SecureStore on native, `localStorage` polyfill on web — see feedStorage).
 */

import * as SecureStore from 'expo-secure-store';

const SKIP_DELETE_CONFIRM_KEY = 'inbox_skip_delete_confirm';

async function isSecureStoreAvailable(): Promise<boolean> {
  try {
    return await SecureStore.isAvailableAsync();
  } catch {
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

/** Whether the user has opted out of the delete-confirmation dialog. */
export async function getSkipInboxDeleteConfirm(): Promise<boolean> {
  return (await getItem(SKIP_DELETE_CONFIRM_KEY)) === 'true';
}

export async function setSkipInboxDeleteConfirm(skip: boolean): Promise<void> {
  await setItem(SKIP_DELETE_CONFIRM_KEY, skip ? 'true' : 'false');
}
