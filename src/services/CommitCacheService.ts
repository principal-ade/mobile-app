/**
 * Commit Cache Service
 *
 * Abstracts fetching and caching of commit details.
 * Currently uses in-memory cache, but designed to be
 * swapped out for AsyncStorage/SQLite later.
 */

import { apiConfig } from '../utils/config';
import type { ActivityCommit } from '../types/activity';

const API_BASE = apiConfig.baseUrl;

interface CacheEntry {
  commits: ActivityCommit[];
  fetchedAt: number;
}

// Cache interface for future storage backends
interface CacheStorage {
  get(key: string): Promise<CacheEntry | null>;
  set(key: string, entry: CacheEntry): Promise<void>;
  clear(): Promise<void>;
}

// In-memory cache implementation
class MemoryCache implements CacheStorage {
  private cache = new Map<string, CacheEntry>();
  private maxAge = 24 * 60 * 60 * 1000; // 24 hours

  async get(key: string): Promise<CacheEntry | null> {
    const entry = this.cache.get(key);
    if (!entry) return null;

    // Check if expired
    if (Date.now() - entry.fetchedAt > this.maxAge) {
      this.cache.delete(key);
      return null;
    }

    return entry;
  }

  async set(key: string, entry: CacheEntry): Promise<void> {
    this.cache.set(key, entry);

    // Prune old entries if cache gets too large
    if (this.cache.size > 1000) {
      const now = Date.now();
      for (const [k, v] of this.cache.entries()) {
        if (now - v.fetchedAt > this.maxAge) {
          this.cache.delete(k);
        }
      }
    }
  }

  async clear(): Promise<void> {
    this.cache.clear();
  }
}

// Singleton cache instance
const cache: CacheStorage = new MemoryCache();

/**
 * Generate a cache key for a time block
 */
function getBlockCacheKey(startTime: Date, endTime: Date): string {
  return `block:${startTime.toISOString()}:${endTime.toISOString()}`;
}

/**
 * Fetch commits for a specific time block
 * Checks cache first, then fetches from API if needed
 */
export async function getBlockCommits(
  githubToken: string,
  startTime: Date,
  endTime: Date,
  options?: {
    authorLogins?: string[];
    repoIds?: string[];
    skipCache?: boolean;
  }
): Promise<ActivityCommit[]> {
  const { authorLogins, repoIds, skipCache = false } = options || {};

  // Build cache key including filters
  const filterSuffix = [
    authorLogins?.sort().join(',') || '',
    repoIds?.sort().join(',') || '',
  ].join('|');
  const cacheKey = `${getBlockCacheKey(startTime, endTime)}:${filterSuffix}`;

  // Check cache first
  if (!skipCache) {
    const cached = await cache.get(cacheKey);
    if (cached) {
      return cached.commits;
    }
  }

  // Fetch from API
  const commits = await fetchBlockCommitsFromAPI(
    githubToken,
    startTime,
    endTime,
    { authorLogins, repoIds }
  );

  // Store in cache
  await cache.set(cacheKey, {
    commits,
    fetchedAt: Date.now(),
  });

  return commits;
}

/**
 * Fetch commits from API for a time range
 */
async function fetchBlockCommitsFromAPI(
  githubToken: string,
  startTime: Date,
  endTime: Date,
  options?: {
    authorLogins?: string[];
    repoIds?: string[];
  }
): Promise<ActivityCommit[]> {
  const { authorLogins, repoIds } = options || {};

  const input = {
    startTime: startTime.toISOString(),
    endTime: endTime.toISOString(),
    ...(authorLogins?.length && { authorLogins }),
    ...(repoIds?.length && { repoIds }),
  };

  const url = `${API_BASE}/trpc/feed.getBlockCommits?input=${encodeURIComponent(JSON.stringify(input))}`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${githubToken}`,
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Authentication required');
    }
    throw new Error(`Failed to fetch block commits: ${response.status}`);
  }

  interface TRPCResponse {
    result: {
      data: { commits: ActivityCommit[] };
    };
  }

  const data: TRPCResponse = await response.json();
  return data.result.data.commits;
}

/**
 * Clear the commit cache
 */
export async function clearCommitCache(): Promise<void> {
  await cache.clear();
}

/**
 * Prefetch commits for multiple blocks (for future optimization)
 */
export async function prefetchBlockCommits(
  githubToken: string,
  blocks: Array<{ startTime: Date; endTime: Date }>
): Promise<void> {
  // Fetch in parallel, but don't wait for all
  const promises = blocks.map((block) =>
    getBlockCommits(githubToken, block.startTime, block.endTime).catch(() => {
      // Silently ignore prefetch failures
    })
  );

  await Promise.allSettled(promises);
}
