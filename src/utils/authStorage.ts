import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'github_access_token';

async function isSecureStoreAvailable(): Promise<boolean> {
  try {
    return await SecureStore.isAvailableAsync();
  } catch (error) {
    console.warn('SecureStore availability check failed', error);
    return false;
  }
}

export async function saveToken(token: string): Promise<void> {
  if (await isSecureStoreAvailable()) {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
    return;
  }

  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(TOKEN_KEY, token);
  }
}

export async function getToken(): Promise<string | null> {
  if (await isSecureStoreAvailable()) {
    return SecureStore.getItemAsync(TOKEN_KEY);
  }

  if (typeof localStorage !== 'undefined') {
    return localStorage.getItem(TOKEN_KEY);
  }

  return null;
}

export async function deleteToken(): Promise<void> {
  if (await isSecureStoreAvailable()) {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    return;
  }

  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem(TOKEN_KEY);
  }
}
