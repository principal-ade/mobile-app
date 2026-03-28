import * as Crypto from 'expo-crypto';

/**
 * Generates a cryptographically secure random string for PKCE code verifier
 * @returns A base64url-encoded random string (43-128 characters)
 */
export async function generateCodeVerifier(): Promise<string> {
  const randomBytes = await Crypto.getRandomBytesAsync(32);
  return base64UrlEncode(randomBytes);
}

/**
 * Generates a code challenge from a code verifier using SHA256
 * @param verifier The code verifier string
 * @returns A base64url-encoded SHA256 hash of the verifier
 */
export async function generateCodeChallenge(verifier: string): Promise<string> {
  const digest = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    verifier,
    { encoding: Crypto.CryptoEncoding.BASE64 },
  );
  return base64UrlEncodeFromBase64(digest);
}

/**
 * Generates PKCE code verifier and challenge pair
 */
export async function generatePKCE(): Promise<{
  codeVerifier: string;
  codeChallenge: string;
}> {
  const codeVerifier = await generateCodeVerifier();
  const codeChallenge = await generateCodeChallenge(codeVerifier);
  return { codeVerifier, codeChallenge };
}

/**
 * Generates a state parameter with CSRF token
 * State is a base64url-encoded JSON object: {csrf: string}
 */
export async function generateState(): Promise<string> {
  const csrfBytes = await Crypto.getRandomBytesAsync(16);
  const csrf = base64UrlEncode(csrfBytes);
  const stateObj = { csrf };
  const stateJson = JSON.stringify(stateObj);
  // Convert string to bytes and base64url encode
  const stateBytes = new Uint8Array(stateJson.split('').map(c => c.charCodeAt(0)));
  return base64UrlEncode(stateBytes);
}

/**
 * Decodes the state parameter
 * @param state - Base64URL encoded state string
 * @returns Decoded state object with csrf token
 */
export function decodeState(state: string): { csrf: string } {
  try {
    // Convert base64url to base64
    let base64 = state.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) {
      base64 += '=';
    }
    // Decode base64 to string
    const decoded = atob(base64);
    return JSON.parse(decoded);
  } catch {
    throw new Error('Invalid state parameter');
  }
}

/**
 * Converts a byte array to base64url encoding
 */
function base64UrlEncode(buffer: Uint8Array): string {
  const base64 = btoa(String.fromCharCode(...Array.from(buffer)));
  return base64UrlEncodeFromBase64(base64);
}

/**
 * Converts base64 to base64url encoding (RFC 4648)
 */
function base64UrlEncodeFromBase64(base64: string): string {
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}
