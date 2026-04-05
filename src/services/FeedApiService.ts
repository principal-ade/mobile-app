/**
 * Feed API Service
 *
 * Handles syncing feed preferences with the server via tRPC endpoints.
 * Manages followed users and repos for personalized feed.
 *
 * See: web-ade/.principal-views/feed-collections/feed-collections.otel.canvas
 */

const API_BASE = 'https://app.principal-ade.com/api';

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
