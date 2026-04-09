/**
 * GitHub Search Service
 *
 * Provides search and suggestion functionality for GitHub users and repositories.
 * Uses web-ade tRPC API endpoints.
 *
 * See: web-ade/docs/mobile-feed-api-requests.md
 */

import { apiConfig } from '../utils/config';

const API_BASE = apiConfig.baseUrl;

export interface GitHubUser {
  login: string;
  avatar_url: string;
  type?: 'User' | 'Organization';
}

export interface SuggestedUser extends GitHubUser {
  name?: string | null;
  bio?: string | null;
  source: 'following' | 'org';
  orgName?: string;
}

export interface GitHubRepo {
  owner: string;
  name: string;
  full_name: string;
  description: string | null;
  stargazers_count: number;
  language: string | null;
  owner_avatar_url: string;
}

export interface SuggestedRepo extends GitHubRepo {
  source: 'starred' | 'org';
  orgName?: string;
}

interface TRPCResponse<T> {
  result: {
    data: T;
  };
}

interface SearchUsersResponse {
  users: Array<{
    login: string;
    avatar_url: string;
    type: 'User' | 'Organization';
  }>;
  total_count: number;
}

interface SearchReposResponse {
  repos: Array<{
    owner: string;
    name: string;
    full_name: string;
    description: string | null;
    stargazers_count: number;
    language: string | null;
    owner_avatar_url: string;
  }>;
  total_count: number;
}

interface SuggestedUsersResponse {
  users: SuggestedUser[];
}

interface SuggestedReposResponse {
  repos: SuggestedRepo[];
}

/**
 * Search for GitHub users by username or name
 */
export async function searchUsers(
  query: string,
  options?: { perPage?: number }
): Promise<{ users: GitHubUser[]; totalCount: number }> {
  if (!query.trim()) {
    return { users: [], totalCount: 0 };
  }

  const perPage = options?.perPage ?? 10;
  const input = JSON.stringify({ query, perPage });
  const url = `${API_BASE}/trpc/github.searchUsers?input=${encodeURIComponent(input)}`;

  const response = await fetch(url);

  if (!response.ok) {
    if (response.status === 403) {
      throw new Error('Rate limit exceeded. Please try again later.');
    }
    throw new Error(`Search failed: ${response.status}`);
  }

  const data: TRPCResponse<SearchUsersResponse> = await response.json();

  return {
    users: data.result.data.users,
    totalCount: data.result.data.total_count,
  };
}

/**
 * Search for GitHub repositories by name
 */
export async function searchRepos(
  query: string,
  options?: { perPage?: number }
): Promise<{ repos: GitHubRepo[]; totalCount: number }> {
  if (!query.trim()) {
    return { repos: [], totalCount: 0 };
  }

  const perPage = options?.perPage ?? 10;
  const input = JSON.stringify({ query, perPage });
  const url = `${API_BASE}/trpc/github.searchRepos?input=${encodeURIComponent(input)}`;

  const response = await fetch(url);

  if (!response.ok) {
    if (response.status === 403) {
      throw new Error('Rate limit exceeded. Please try again later.');
    }
    throw new Error(`Search failed: ${response.status}`);
  }

  const data: TRPCResponse<SearchReposResponse> = await response.json();

  return {
    repos: data.result.data.repos,
    totalCount: data.result.data.total_count,
  };
}

/**
 * Get suggested users (people user follows + org members)
 * Requires authentication - pass GitHub token
 */
export async function getSuggestedUsers(
  githubToken?: string | null
): Promise<{ users: SuggestedUser[] }> {
  if (!githubToken) {
    return { users: [] }; // Not authenticated, return empty
  }

  const url = `${API_BASE}/trpc/github.getSuggestedUsers`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${githubToken}`,
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      return { users: [] }; // Token invalid, return empty
    }
    throw new Error(`Failed to fetch suggestions: ${response.status}`);
  }

  const data: TRPCResponse<SuggestedUsersResponse> = await response.json();
  return { users: data.result.data.users };
}

/**
 * Get suggested repos (starred + org repos)
 * Requires authentication - pass GitHub token
 */
export async function getSuggestedRepos(
  githubToken?: string | null
): Promise<{ repos: SuggestedRepo[] }> {
  if (!githubToken) {
    return { repos: [] }; // Not authenticated, return empty
  }

  const url = `${API_BASE}/trpc/github.getSuggestedRepos`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${githubToken}`,
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      return { repos: [] }; // Token invalid, return empty
    }
    throw new Error(`Failed to fetch suggestions: ${response.status}`);
  }

  const data: TRPCResponse<SuggestedReposResponse> = await response.json();
  return { repos: data.result.data.repos };
}

/**
 * Format star count for display (e.g., 1234 -> "1.2k")
 */
export function formatStars(count: number): string {
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}m`;
  }
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}k`;
  }
  return count.toString();
}
