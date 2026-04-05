/**
 * Feed API Service
 *
 * Handles syncing feed preferences with the server via tRPC endpoints.
 * Manages followed users and repos for personalized feed.
 *
 * See: web-ade/.principal-views/feed-collections/feed-collections.otel.canvas
 */

// Use localhost for development, production URL for release
const API_BASE = __DEV__ ? 'http://localhost:3000/api' : 'https://app.principal-ade.com/api';

export interface FollowedUser {
  login: string;
  followedAt: string;
}

export interface FollowedRepo {
  owner: string;
  repo: string;
  followedAt: string;
}

export interface FeedFollows {
  followedUsers: FollowedUser[];
  followedRepos: FollowedRepo[];
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
 * Get user's current follows (users and repos)
 * Requires authentication
 */
export async function getFollows(
  githubToken: string
): Promise<FeedFollows> {
  const url = `${API_BASE}/trpc/feed.getFollows`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${githubToken}`,
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Authentication required');
    }
    throw new Error(`Failed to fetch follows: ${response.status}`);
  }

  const data: TRPCResponse<FeedFollows> = await response.json();
  return data.result.data;
}

/**
 * Follow a GitHub user
 * Requires authentication
 */
export async function followUser(
  githubToken: string,
  login: string
): Promise<{ success: boolean; followedUsers: FollowedUser[] }> {
  const url = `${API_BASE}/trpc/feed.followUser`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${githubToken}`,
    },
    body: JSON.stringify({ json: { login } }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    if (response.status === 401) {
      throw new Error('Authentication required');
    }
    if (response.status === 409) {
      throw new Error('Already following this user');
    }
    if (response.status === 412) {
      throw new Error('Follow limit reached');
    }
    throw new Error(
      (errorData as TRPCError)?.error?.message || `Failed to follow user: ${response.status}`
    );
  }

  const data: TRPCResponse<{ success: boolean; followedUsers: FollowedUser[] }> =
    await response.json();
  return data.result.data;
}

/**
 * Unfollow a GitHub user
 * Requires authentication
 */
export async function unfollowUser(
  githubToken: string,
  login: string
): Promise<{ success: boolean; followedUsers: FollowedUser[] }> {
  const url = `${API_BASE}/trpc/feed.unfollowUser`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${githubToken}`,
    },
    body: JSON.stringify({ json: { login } }),
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Authentication required');
    }
    throw new Error(`Failed to unfollow user: ${response.status}`);
  }

  const data: TRPCResponse<{ success: boolean; followedUsers: FollowedUser[] }> =
    await response.json();
  return data.result.data;
}

/**
 * Follow a repository
 * Requires authentication
 */
export async function followRepo(
  githubToken: string,
  owner: string,
  repo: string
): Promise<{ success: boolean; followedRepos: FollowedRepo[] }> {
  const url = `${API_BASE}/trpc/feed.followRepo`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${githubToken}`,
    },
    body: JSON.stringify({ json: { owner, repo } }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    if (response.status === 401) {
      throw new Error('Authentication required');
    }
    if (response.status === 409) {
      throw new Error('Already following this repository');
    }
    if (response.status === 412) {
      throw new Error('Follow limit reached');
    }
    throw new Error(
      (errorData as TRPCError)?.error?.message || `Failed to follow repo: ${response.status}`
    );
  }

  const data: TRPCResponse<{ success: boolean; followedRepos: FollowedRepo[] }> =
    await response.json();
  return data.result.data;
}

/**
 * Unfollow a repository
 * Requires authentication
 */
export async function unfollowRepo(
  githubToken: string,
  owner: string,
  repo: string
): Promise<{ success: boolean; followedRepos: FollowedRepo[] }> {
  const url = `${API_BASE}/trpc/feed.unfollowRepo`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${githubToken}`,
    },
    body: JSON.stringify({ json: { owner, repo } }),
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Authentication required');
    }
    throw new Error(`Failed to unfollow repo: ${response.status}`);
  }

  const data: TRPCResponse<{ success: boolean; followedRepos: FollowedRepo[] }> =
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
 * Card won't show again for this 24h cycle
 * Requires authentication
 */
export async function passCard(
  githubToken: string,
  itemId: string
): Promise<{ success: boolean }> {
  const url = `${API_BASE}/trpc/feed.passCard`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${githubToken}`,
    },
    body: JSON.stringify({ json: { itemId } }),
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
    body: JSON.stringify({ json: card }),
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
    body: JSON.stringify({ json: { itemId } }),
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
