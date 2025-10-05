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
