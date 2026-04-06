import Constants from 'expo-constants';

interface AuthConfig {
  authServerUrl: string;
  appScheme: string;
}

interface ApiConfig {
  baseUrl: string;
}

const extra = (Constants.expoConfig?.extra ?? {}) as Partial<{
  authServerUrl: string;
  apiBaseUrl: string;
}>;

const scheme = Constants.expoConfig?.scheme ?? 'principal-ai';

export const authConfig: AuthConfig = {
  authServerUrl: extra.authServerUrl ?? 'https://auth.principal-ade.com',
  appScheme: typeof scheme === 'string' ? scheme : scheme[0] ?? 'principal-ai',
};

// API configuration - uses localhost in dev, production in release
// Can be overridden via app.json extra.apiBaseUrl
export const apiConfig: ApiConfig = {
  baseUrl: extra.apiBaseUrl ?? (__DEV__ ? 'http://localhost:3000/api' : 'https://app.principal-ade.com/api'),
};

export function isAuthConfigValid(): boolean {
  return Boolean(authConfig.authServerUrl);
}

export function getAuthCallbackUrl(): string {
  return `${authConfig.appScheme}://auth/callback`;
}
