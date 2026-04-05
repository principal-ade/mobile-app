import { useState, useEffect, useCallback } from 'react';
import type { RepoActivitySummary } from '../types/activity';
import { fetchActivityFeed, FEATURED_REPOS } from '../services/ActivityFeedService';
import { getFollowedRepos } from '../utils/feedStorage';

interface UseActivityFeedOptions {
  /** Repos to fetch (overrides saved preferences if provided) */
  repos?: string[];
  /** Auto-refresh interval in ms (0 to disable) */
  refreshInterval?: number;
  /** Skip loading from storage and use provided/default repos */
  skipStorage?: boolean;
}

interface UseActivityFeedResult {
  summaries: RepoActivitySummary[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useActivityFeed(
  options: UseActivityFeedOptions = {}
): UseActivityFeedResult {
  const { repos: overrideRepos, refreshInterval = 0, skipStorage = false } = options;

  const [summaries, setSummaries] = useState<RepoActivitySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resolvedRepos, setResolvedRepos] = useState<string[] | null>(overrideRepos ?? null);

  // Load repos from storage on mount (unless overridden or skipped)
  useEffect(() => {
    if (overrideRepos || skipStorage) {
      setResolvedRepos(overrideRepos ?? FEATURED_REPOS);
      return;
    }

    async function loadRepos() {
      try {
        const savedRepos = await getFollowedRepos();
        if (savedRepos && savedRepos.length > 0) {
          setResolvedRepos(savedRepos.map((r) => `${r.owner}/${r.repo}`));
        } else {
          setResolvedRepos(FEATURED_REPOS);
        }
      } catch {
        setResolvedRepos(FEATURED_REPOS);
      }
    }
    loadRepos();
  }, [overrideRepos, skipStorage]);

  const fetchData = useCallback(async () => {
    if (!resolvedRepos) return; // Wait for repos to be loaded
    try {
      setError(null);
      const data = await fetchActivityFeed(resolvedRepos);
      setSummaries(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load activity';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [resolvedRepos]);

  const refresh = useCallback(async () => {
    setLoading(true);
    await fetchData();
  }, [fetchData]);

  // Initial fetch when repos are resolved
  useEffect(() => {
    if (resolvedRepos) {
      fetchData();
    }
  }, [resolvedRepos, fetchData]);

  // Auto-refresh interval
  useEffect(() => {
    if (refreshInterval <= 0 || !resolvedRepos) return;

    const interval = setInterval(() => {
      fetchData();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [refreshInterval, fetchData, resolvedRepos]);

  return {
    summaries,
    loading,
    error,
    refresh,
  };
}
