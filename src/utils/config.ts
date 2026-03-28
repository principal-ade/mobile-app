import Constants from 'expo-constants';

interface AuthConfig {
  authServerUrl: string;
  appScheme: string;
}

const extra = (Constants.expoConfig?.extra ?? {}) as Partial<{
  authServerUrl: string;
}>;

const scheme = Constants.expoConfig?.scheme ?? 'principal-ai';

export const authConfig: AuthConfig = {
  authServerUrl: extra.authServerUrl ?? 'https://auth.principal-ade.com',
  appScheme: typeof scheme === 'string' ? scheme : scheme[0] ?? 'principal-ai',
};

export function isAuthConfigValid(): boolean {
  return Boolean(authConfig.authServerUrl);
}

export function getAuthCallbackUrl(): string {
  return `${authConfig.appScheme}://auth/callback`;
}
