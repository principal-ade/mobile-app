/**
 * StargazersService - Fetches stargazer data for repositories
 */

import { apiConfig } from '../utils/config';

export interface Stargazer {
  login: string;
  avatarUrl: string;
  starredAt: string;
}

export interface StargazersResult {
  totalCount: number;
  stargazers: Stargazer[];
  pageInfo: {
    hasNextPage: boolean;
    endCursor: string | null;
  };
}

export interface StarHistoryPoint {
  date: string;
  count: number;
}

/**
 * Fetch stargazers for a repository
 */
export async function getStargazers(
  owner: string,
  repo: string,
  limit: number = 100,
  cursor?: string
): Promise<StargazersResult> {
  let url = `${apiConfig.baseUrl}/github/repo/${owner}/${repo}/stargazers?limit=${limit}`;
  if (cursor) {
    url += `&cursor=${encodeURIComponent(cursor)}`;
  }

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error');
    throw new Error(`Failed to fetch stargazers: ${response.status} - ${errorText}`);
  }

  return response.json();
}

/**
 * Fetch all stargazers and build star history data
 * Warning: This can be slow for repos with many stars
 */
export async function getStarHistory(
  owner: string,
  repo: string,
  maxStars: number = 1000
): Promise<{
  history: StarHistoryPoint[];
  recentStargazers: Stargazer[];
  totalCount: number;
  isTruncated: boolean;
}> {
  const allStargazers: Stargazer[] = [];
  let cursor: string | undefined;
  let hasMore = true;
  let totalCount = 0;

  // Fetch stargazers in batches
  while (hasMore && allStargazers.length < maxStars) {
    const result = await getStargazers(owner, repo, 100, cursor);
    totalCount = result.totalCount;
    allStargazers.push(...result.stargazers);
    hasMore = result.pageInfo.hasNextPage;
    cursor = result.pageInfo.endCursor || undefined;
  }

  // Build cumulative star history by date
  // Stars are returned in descending order (most recent first)
  // We need to reverse and count cumulatively
  const starsByDate = new Map<string, number>();

  // Reverse to get chronological order
  const chronological = [...allStargazers].reverse();

  chronological.forEach((star) => {
    const date = star.starredAt.split('T')[0]; // Get just the date part
    starsByDate.set(date, (starsByDate.get(date) || 0) + 1);
  });

  // Build cumulative history
  const history: StarHistoryPoint[] = [];
  let cumulative = totalCount - allStargazers.length; // Account for stars we didn't fetch

  const sortedDates = Array.from(starsByDate.keys()).sort();
  for (const date of sortedDates) {
    cumulative += starsByDate.get(date) || 0;
    history.push({ date, count: cumulative });
  }

  // Recent stargazers are already in descending order (most recent first)
  const recentStargazers = allStargazers.slice(0, 10);

  return {
    history,
    recentStargazers,
    totalCount,
    isTruncated: totalCount > maxStars,
  };
}

export default {
  getStargazers,
  getStarHistory,
};
