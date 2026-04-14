/**
 * Feed API Service
 *
 * Handles syncing feed preferences with the server via tRPC endpoints.
 * Manages watched users and repos for personalized feed.
 *
 * See: web-ade/.principal-views/feed-collections/feed-collections.otel.canvas
 */

import { apiConfig } from '../utils/config';
import type { IntroductionTour } from '@principal-ai/file-city-builder';

const API_BASE = apiConfig.baseUrl;

export interface WatchedUser {
  login: string;
  watchedAt: string;
  avatarUrl?: string;
}

export interface WatchedRepo {
  owner: string;
  repo: string;
  watchedAt: string;
}

export interface FeedWatches {
  watchedUsers: WatchedUser[];
  watchedRepos: WatchedRepo[];
}

// Commit Queue Types (Swipe Feed)
export interface CommitAuthor {
  login: string;
  avatarUrl?: string;
}

export interface CommitInfo {
  sha: string;
  message: string;
  author: CommitAuthor;
  committedAt: string;
  url: string;
}

export interface CommitActivityCard {
  itemId: string; // "YYYY-MM-DD:HH:owner/repo"
  repo: {
    owner: string;
    name: string;
  };
  hour: number; // 0-23 UTC
  hourBucket: string; // ISO timestamp for hour start
  commits: CommitInfo[];
  commitCount: number;
  latestCommitAt: string;
}

export interface SavedCard extends CommitActivityCard {
  savedAt: string;
}

interface TRPCResponse<T> {
  result: {
    data: T;
  };
}

interface TRPCError {
  error: {
    message: string;
    code: string;
  };
}

/**
 * Get user's current watches (users and repos)
 * Requires authentication
 */
export async function getWatches(
  githubToken: string
): Promise<FeedWatches> {
  const url = `${API_BASE}/trpc/feed.getWatches`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${githubToken}`,
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Authentication required');
    }
    throw new Error(`Failed to fetch watches: ${response.status}`);
  }

  const data: TRPCResponse<FeedWatches> = await response.json();
  return data.result.data;
}

/**
 * Watch a GitHub user
 * Requires authentication
 */
export async function watchUser(
  githubToken: string,
  login: string
): Promise<{ success: boolean; watchedUsers: WatchedUser[] }> {
  const url = `${API_BASE}/trpc/feed.watchUser`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${githubToken}`,
    },
    body: JSON.stringify({ login }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    if (response.status === 401) {
      throw new Error('Authentication required');
    }
    if (response.status === 409) {
      throw new Error('Already watching this user');
    }
    if (response.status === 412) {
      throw new Error('Watch limit reached');
    }
    throw new Error(
      (errorData as TRPCError)?.error?.message || `Failed to watch user: ${response.status}`
    );
  }

  const data: TRPCResponse<{ success: boolean; watchedUsers: WatchedUser[] }> =
    await response.json();
  return data.result.data;
}

/**
 * Unwatch a GitHub user
 * Requires authentication
 */
export async function unwatchUser(
  githubToken: string,
  login: string
): Promise<{ success: boolean; watchedUsers: WatchedUser[] }> {
  const url = `${API_BASE}/trpc/feed.unwatchUser`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${githubToken}`,
    },
    body: JSON.stringify({ login }),
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Authentication required');
    }
    throw new Error(`Failed to unwatch user: ${response.status}`);
  }

  const data: TRPCResponse<{ success: boolean; watchedUsers: WatchedUser[] }> =
    await response.json();
  return data.result.data;
}

/**
 * Watch a repository
 * Requires authentication
 */
export async function watchRepo(
  githubToken: string,
  owner: string,
  repo: string
): Promise<{ success: boolean; watchedRepos: WatchedRepo[] }> {
  const url = `${API_BASE}/trpc/feed.watchRepo`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${githubToken}`,
    },
    body: JSON.stringify({ owner, repo }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    if (response.status === 401) {
      throw new Error('Authentication required');
    }
    if (response.status === 409) {
      throw new Error('Already watching this repository');
    }
    if (response.status === 412) {
      throw new Error('Watch limit reached');
    }
    throw new Error(
      (errorData as TRPCError)?.error?.message || `Failed to watch repo: ${response.status}`
    );
  }

  const data: TRPCResponse<{ success: boolean; watchedRepos: WatchedRepo[] }> =
    await response.json();
  return data.result.data;
}

/**
 * Unwatch a repository
 * Requires authentication
 */
export async function unwatchRepo(
  githubToken: string,
  owner: string,
  repo: string
): Promise<{ success: boolean; watchedRepos: WatchedRepo[] }> {
  const url = `${API_BASE}/trpc/feed.unwatchRepo`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${githubToken}`,
    },
    body: JSON.stringify({ owner, repo }),
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Authentication required');
    }
    throw new Error(`Failed to unwatch repo: ${response.status}`);
  }

  const data: TRPCResponse<{ success: boolean; watchedRepos: WatchedRepo[] }> =
    await response.json();
  return data.result.data;
}

// ============================================================================
// Commit Queue (Swipe Feed) Endpoints
// ============================================================================

/**
 * Get commit activity cards from the last 24 hours
 * Cards are grouped by repo + hour bucket
 * Requires authentication
 */
export async function getCommitQueue(
  githubToken: string,
  limit: number = 20
): Promise<{ cards: CommitActivityCard[]; hasMore: boolean }> {
  const url = `${API_BASE}/trpc/feed.getCommitQueue?input=${encodeURIComponent(JSON.stringify({ json: { limit } }))}`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${githubToken}`,
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Authentication required');
    }
    throw new Error(`Failed to fetch commit queue: ${response.status}`);
  }

  const data: TRPCResponse<{ cards: CommitActivityCard[]; hasMore: boolean }> =
    await response.json();
  return data.result.data;
}

/**
 * Pass a card (swipe left)
 * Marks specific commits as seen so they won't show again
 * New commits for the same repo/hour will still appear
 * Requires authentication
 */
export async function passCard(
  githubToken: string,
  itemId: string,
  seenCommitShas: string[]
): Promise<{ success: boolean }> {
  const url = `${API_BASE}/trpc/feed.passCard`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${githubToken}`,
    },
    body: JSON.stringify({ itemId, seenCommitShas }),
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Authentication required');
    }
    throw new Error(`Failed to pass card: ${response.status}`);
  }

  const data: TRPCResponse<{ success: boolean }> = await response.json();
  return data.result.data;
}

/**
 * Save a card (swipe right)
 * Full card snapshot is persisted
 * Requires authentication
 */
export async function saveCard(
  githubToken: string,
  card: CommitActivityCard
): Promise<{ success: boolean }> {
  const url = `${API_BASE}/trpc/feed.saveCard`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${githubToken}`,
    },
    body: JSON.stringify(card),
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Authentication required');
    }
    throw new Error(`Failed to save card: ${response.status}`);
  }

  const data: TRPCResponse<{ success: boolean }> = await response.json();
  return data.result.data;
}

/**
 * Get all saved cards
 * Sorted by savedAt (newest first)
 * Requires authentication
 */
export async function getSavedCards(
  githubToken: string
): Promise<{ savedCards: SavedCard[] }> {
  const url = `${API_BASE}/trpc/feed.getSavedCards`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${githubToken}`,
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Authentication required');
    }
    throw new Error(`Failed to fetch saved cards: ${response.status}`);
  }

  const data: TRPCResponse<{ savedCards: SavedCard[] }> = await response.json();
  return data.result.data;
}

/**
 * Remove a card from saved list
 * Requires authentication
 */
export async function unsaveCard(
  githubToken: string,
  itemId: string
): Promise<{ success: boolean }> {
  const url = `${API_BASE}/trpc/feed.unsaveCard`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${githubToken}`,
    },
    body: JSON.stringify({ itemId }),
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Authentication required');
    }
    throw new Error(`Failed to unsave card: ${response.status}`);
  }

  const data: TRPCResponse<{ success: boolean }> = await response.json();
  return data.result.data;
}

// ============================================================================
// Activity Heatmap
// ============================================================================

export interface HeatmapCommit {
  timestamp: string; // ISO date string
  repoId: string; // "owner/repo"
  authorLogin: string;
  authorAvatarUrl?: string;
}

export interface HeatmapAuthor {
  login: string;
  avatarUrl?: string;
  commitCount: number;
}

export interface HeatmapRepo {
  id: string; // "owner/repo"
  owner: string;
  name: string;
  commitCount: number;
}

export interface ActivityHeatmapResponse {
  commits: HeatmapCommit[];
  /** Authors with activity in this time range */
  authors: HeatmapAuthor[];
  /** Repos with activity in this time range */
  repos: HeatmapRepo[];
  /** Time range covered */
  timeRange: {
    start: string; // ISO date
    end: string; // ISO date
  };
}

/**
 * Get commit activity for heatmap visualization
 * Returns commits from watched users/repos for the specified time range
 * Requires authentication
 *
 * @param hoursBack - Number of hours to look back (default: 24, max: 168/1 week)
 * @param authorLogins - Optional filter to specific authors
 * @param repoIds - Optional filter to specific repos ("owner/repo" format)
 */
export async function getActivityHeatmap(
  githubToken: string,
  options?: {
    hoursBack?: number;
    authorLogins?: string[];
    repoIds?: string[];
  }
): Promise<ActivityHeatmapResponse> {
  const { hoursBack = 24, authorLogins, repoIds } = options || {};

  const input = {
    json: {
      hoursBack: Math.min(hoursBack, 168), // Cap at 1 week
      ...(authorLogins?.length && { authorLogins }),
      ...(repoIds?.length && { repoIds }),
    },
  };

  const url = `${API_BASE}/trpc/feed.getActivityHeatmap?input=${encodeURIComponent(JSON.stringify(input))}`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${githubToken}`,
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Authentication required');
    }
    throw new Error(`Failed to fetch activity heatmap: ${response.status}`);
  }

  const data: TRPCResponse<ActivityHeatmapResponse> = await response.json();
  return data.result.data;
}

// ============================================================================
// Repo Activity
// ============================================================================

export interface RepoActivityResponse {
  commits: Array<{
    timestamp: string;
    repoId: string;
    authorLogin: string;
    authorAvatarUrl?: string;
  }>;
  timeRange: {
    start: string;
    end: string;
  };
}

/**
 * Get commit activity for a specific repository
 * Fetches commits directly from GitHub for the given repo
 */
export async function getRepoActivity(
  githubToken: string,
  owner: string,
  repo: string,
  hoursBack: number = 168
): Promise<RepoActivityResponse> {
  const input = {
    owner,
    repo,
    hoursBack: Math.min(hoursBack, 168),
  };

  const url = `${API_BASE}/trpc/feed.getRepoActivity?input=${encodeURIComponent(JSON.stringify(input))}`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${githubToken}`,
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Authentication required');
    }
    throw new Error(`Failed to fetch repo activity: ${response.status}`);
  }

  const data: TRPCResponse<RepoActivityResponse> = await response.json();
  return data.result.data;
}

// ============================================================================
// Tour Availability
// ============================================================================

export interface TourAvailability {
  hasTour: boolean;
  tourPath: string | null;
  forkOwner: string | null;
  forkRepo: string | null;
  cached: boolean;
}

/**
 * Check if a repository has a tour available
 * Checks Redis cache for tour availability from fork repos
 */
export async function checkTourAvailability(
  owner: string,
  repo: string
): Promise<TourAvailability> {
  const input = { owner, repo };
  const url = `${API_BASE}/trpc/github.checkTourAvailability?input=${encodeURIComponent(JSON.stringify(input))}`;

  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to check tour availability: ${response.status}`);
  }

  const data: TRPCResponse<TourAvailability> = await response.json();
  return data.result.data;
}

// ============================================================================
// Repos with Tours
// ============================================================================

export interface RepoWithTour {
  owner: string;
  name: string;
  full_name: string;
  description?: string | null;
  stargazers_count: number;
  language?: string | null;
  owner_avatar_url: string;
  forkOwner: string; // The tour org that has the fork
  forkRepo: string; // The fork repo name
  tourPath: string; // Path to tour file
}

/**
 * Get all repositories that have tours available
 * Returns repos from tour organizations with parent repo info
 * Cached on server for 24 hours
 */
export async function getReposWithTours(): Promise<{ repos: RepoWithTour[]; cached: boolean }> {
  const url = `${API_BASE}/trpc/github.getReposWithTours`;

  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch repos with tours: ${response.status}`);
  }

  const data: TRPCResponse<{ repos: RepoWithTour[]; cached: boolean }> = await response.json();
  return data.result.data;
}

/**
 * Get tour JSON for a repository
 * Fetches and parses the tour file from GitHub
 */
export async function getTour(
  owner: string,
  repo: string,
  tourPath: string,
  branch: string = 'main'
): Promise<{ tour: IntroductionTour; cached: boolean }> {
  const input = { owner, repo, tourPath, branch };
  const url = `${API_BASE}/trpc/github.getTour?input=${encodeURIComponent(JSON.stringify(input))}`;

  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch tour: ${response.status}`);
  }

  const data: TRPCResponse<{ tour: IntroductionTour; cached: boolean }> = await response.json();
  return data.result.data;
}

// ============================================================================
// AI Commit Summary
// ============================================================================

export interface CommitForSummary {
  sha: string;
  message: string;
  author: string;
  additions?: number;
  deletions?: number;
  filesChanged?: number;
}

/**
 * Get AI-generated summary of commits
 * Uses OpenRouter API via server endpoint
 */
export async function getCommitsSummary(
  commits: CommitForSummary[],
  repoName: string,
  audienceLevel: 'maintainer' | 'non-technical' = 'non-technical'
): Promise<string> {
  const url = `${API_BASE}/explain-commits`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ commits, repoName, audienceLevel }),
  });

  if (!response.ok) {
    throw new Error(`Failed to get commits summary: ${response.status}`);
  }

  // Parse SSE response
  const text = await response.text();
  const lines = text.split('\n');

  for (const line of lines) {
    if (line.startsWith('data: ')) {
      try {
        const data = JSON.parse(line.slice(6));
        if (data.type === 'text' && data.content) {
          return data.content;
        }
      } catch {
        // Ignore parse errors
      }
    }
  }

  throw new Error('No summary in response');
}
