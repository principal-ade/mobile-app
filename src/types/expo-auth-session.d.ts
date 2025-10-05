declare module 'expo-auth-session' {
  export interface AuthSessionResult {
    type: 'success' | 'error' | 'dismiss';
    errorCode?: string;
    params?: Record<string, string> & { code?: string };
  }

  export interface DiscoveryDocument {
    authorizationEndpoint: string;
    tokenEndpoint?: string;
    revocationEndpoint?: string;
  }

  export interface TokenResponseLike {
    accessToken?: string;
    access_token?: string;
    tokenType?: string;
    token_type?: string;
    scope?: string;
  }

  export function makeRedirectUri(options?: Record<string, unknown>): string;
  export function useAuthRequest(
    config: Record<string, unknown>,
    discovery: DiscoveryDocument,
  ): [Record<string, unknown> | null, AuthSessionResult | null, (options?: Record<string, unknown>) => Promise<AuthSessionResult>];
  export function exchangeCodeAsync(
    config: Record<string, string>,
    discovery: DiscoveryDocument,
  ): Promise<TokenResponseLike>;
}
