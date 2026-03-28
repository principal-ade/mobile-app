import * as SecureStore from 'expo-secure-store';

// Token storage keys
const GITHUB_TOKEN_KEY = 'github_access_token';
const WORKOS_TOKEN_KEY = 'workos_access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';
const PENDING_AUTH_KEY = 'pending_auth_state';

export interface AuthTokens {
  githubAccessToken: string;
  workosAccessToken: string;
  refreshToken: string;
}

export interface PendingAuthState {
  codeVerifier: string;
  state: string;
  csrf: string;
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

async function deleteItem(key: string): Promise<void> {
  if (await isSecureStoreAvailable()) {
    await SecureStore.deleteItemAsync(key);
    return;
  }
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem(key);
  }
}

// Token management
export async function saveTokens(tokens: AuthTokens): Promise<void> {
  await Promise.all([
    setItem(GITHUB_TOKEN_KEY, tokens.githubAccessToken),
    setItem(WORKOS_TOKEN_KEY, tokens.workosAccessToken),
    setItem(REFRESH_TOKEN_KEY, tokens.refreshToken),
  ]);
}

export async function getTokens(): Promise<AuthTokens | null> {
  const [githubAccessToken, workosAccessToken, refreshToken] = await Promise.all([
    getItem(GITHUB_TOKEN_KEY),
    getItem(WORKOS_TOKEN_KEY),
    getItem(REFRESH_TOKEN_KEY),
  ]);

  if (!githubAccessToken || !workosAccessToken || !refreshToken) {
    return null;
  }

  return { githubAccessToken, workosAccessToken, refreshToken };
}

export async function deleteTokens(): Promise<void> {
  await Promise.all([
    deleteItem(GITHUB_TOKEN_KEY),
    deleteItem(WORKOS_TOKEN_KEY),
    deleteItem(REFRESH_TOKEN_KEY),
  ]);
}

// Legacy single token support (for migration)
export async function getToken(): Promise<string | null> {
  return getItem(GITHUB_TOKEN_KEY);
}

export async function saveToken(token: string): Promise<void> {
  await setItem(GITHUB_TOKEN_KEY, token);
}

export async function deleteToken(): Promise<void> {
  await deleteItem(GITHUB_TOKEN_KEY);
}

// Pending auth state (stored during OAuth flow)
export async function savePendingAuth(state: PendingAuthState): Promise<void> {
  await setItem(PENDING_AUTH_KEY, JSON.stringify(state));
}

export async function getPendingAuth(): Promise<PendingAuthState | null> {
  const data = await getItem(PENDING_AUTH_KEY);
  if (!data) return null;
  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
}

export async function clearPendingAuth(): Promise<void> {
  await deleteItem(PENDING_AUTH_KEY);
}
