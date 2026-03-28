import * as WebBrowser from 'expo-web-browser';
import { authConfig, getAuthCallbackUrl } from '../utils/config';
import { generatePKCE, generateState, decodeState } from '../utils/pkce';
import {
  savePendingAuth,
  getPendingAuth,
  clearPendingAuth,
  saveTokens,
  AuthTokens,
} from '../utils/authStorage';
import { GitHubUser } from '../types/github';

// Ensure any pending auth sessions are completed
WebBrowser.maybeCompleteAuthSession();

export interface AuthResult {
  tokens: AuthTokens;
  user: GitHubUser;
}

interface AuthServerStartResponse {
  auth_url: string;
}

interface AuthServerTokenResponse {
  github_access_token: string;
  workos_access_token: string;
  refresh_token: string;
  user: {
    id: string | number;
    email: string;
    login: string;
    name: string;
    avatar_url: string;
  };
}

/**
 * Initiates the auth flow using proper mobile OAuth:
 * 1. Opens auth URL in secure browser session
 * 2. Auth server redirects back to app via deep link
 * 3. App extracts state and exchanges for tokens
 */
export async function startAuthFlow(): Promise<AuthResult> {
  // Generate PKCE and state
  const { codeVerifier, codeChallenge } = await generatePKCE();
  const state = await generateState();
  const { csrf } = decodeState(state);

  // Save pending auth state
  await savePendingAuth({ codeVerifier, state, csrf });

  const { authServerUrl } = authConfig;
  const callbackUrl = getAuthCallbackUrl();

  // Call auth server to get OAuth URL with mobile callback
  const response = await fetch(`${authServerUrl}/api/auth/workos/start`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      code_challenge: codeChallenge,
      state,
      return_url: callbackUrl, // Deep link for redirect back to app
    }),
  });

  if (!response.ok) {
    await clearPendingAuth();
    const error = await response.text();
    throw new Error(`Auth server error: ${error}`);
  }

  const data: AuthServerStartResponse = await response.json();

  if (!data.auth_url) {
    await clearPendingAuth();
    throw new Error('No auth_url returned from auth server');
  }

  // Open auth session - automatically handles redirect back to app
  const result = await WebBrowser.openAuthSessionAsync(
    data.auth_url,
    callbackUrl,
  );

  if (result.type !== 'success' || !result.url) {
    await clearPendingAuth();
    if (result.type === 'cancel' || result.type === 'dismiss') {
      throw new Error('Sign in was cancelled');
    }
    throw new Error('Authentication failed');
  }

  // Extract state from redirect URL
  const redirectUrl = new URL(result.url);
  const returnedState = redirectUrl.searchParams.get('state');

  // Check for auth errors in redirect
  const authError = redirectUrl.searchParams.get('auth_error');
  if (authError) {
    await clearPendingAuth();
    const errorMessage = redirectUrl.searchParams.get('error_message') || authError;
    throw new Error(errorMessage);
  }

  if (!returnedState) {
    await clearPendingAuth();
    throw new Error('Missing state in callback');
  }

  // Exchange for tokens
  return await exchangeForTokens(returnedState);
}

/**
 * Exchanges the state + code_verifier for tokens
 */
async function exchangeForTokens(returnedState: string): Promise<AuthResult> {
  const pendingAuth = await getPendingAuth();
  if (!pendingAuth) {
    throw new Error('No pending auth state found');
  }

  // Validate state matches (CSRF protection)
  if (returnedState !== pendingAuth.state) {
    await clearPendingAuth();
    throw new Error('State mismatch - authentication may have been tampered with');
  }

  const { authServerUrl } = authConfig;

  // Exchange code_verifier for tokens (using mobile-specific endpoint)
  const response = await fetch(`${authServerUrl}/api/auth/workos/token/mobile`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      state: pendingAuth.state,
      code_verifier: pendingAuth.codeVerifier,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
    await clearPendingAuth();
    throw new Error(errorData.error_description || errorData.error || 'Token exchange failed');
  }

  const data: AuthServerTokenResponse = await response.json();

  // Validate response
  if (!data.github_access_token || !data.workos_access_token || !data.refresh_token) {
    await clearPendingAuth();
    throw new Error('Invalid token response from auth server');
  }

  // Clear pending state
  await clearPendingAuth();

  const tokens: AuthTokens = {
    githubAccessToken: data.github_access_token,
    workosAccessToken: data.workos_access_token,
    refreshToken: data.refresh_token,
  };

  // Save tokens
  await saveTokens(tokens);

  const user: GitHubUser = {
    id: typeof data.user.id === 'string' ? parseInt(data.user.id, 10) : data.user.id,
    login: data.user.login,
    name: data.user.name,
    avatar_url: data.user.avatar_url,
    html_url: `https://github.com/${data.user.login}`,
  };

  return { tokens, user };
}

/**
 * Verifies email with the 6-digit code sent to the user
 * Returns the auth result after successful verification
 */
export async function verifyEmail(state: string, verificationCode: string): Promise<AuthResult> {
  const { authServerUrl } = authConfig;

  // First, verify the email with the code
  const verifyResponse = await fetch(`${authServerUrl}/api/auth/workos/verify`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      state,
      verificationCode,
    }),
  });

  if (!verifyResponse.ok) {
    const errorData = await verifyResponse.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(errorData.error_description || errorData.error || 'Verification failed');
  }

  // After verification succeeds, exchange for tokens using PKCE
  return await exchangeForTokens(state);
}

/**
 * Refreshes the access tokens using the refresh token
 */
export async function refreshTokens(refreshToken: string): Promise<AuthTokens> {
  const { authServerUrl } = authConfig;

  const response = await fetch(`${authServerUrl}/api/auth/refresh`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    throw new Error('Token refresh failed');
  }

  const data = await response.json();

  const tokens: AuthTokens = {
    githubAccessToken: data.github_access_token,
    workosAccessToken: data.workos_access_token,
    refreshToken: data.refresh_token,
  };

  await saveTokens(tokens);
  return tokens;
}
