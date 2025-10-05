import Constants from 'expo-constants';

interface GitHubConfig {
  clientId: string;
  scopes: string[];
}

const extra = (Constants.expoConfig?.extra ?? {}) as Partial<{
  githubClientId: string;
  githubClientSecret: string;
  githubScopes: string[];
}>;

export const githubConfig: GitHubConfig = {
  clientId: extra.githubClientId ?? '',
  scopes: Array.isArray(extra.githubScopes) ? extra.githubScopes : ['repo'],
};

export function isGitHubConfigValid(): boolean {
  return Boolean(githubConfig.clientId);
}
