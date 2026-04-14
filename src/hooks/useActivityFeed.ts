import { useState, useEffect, useCallback, useMemo } from 'react';
import type { RepoActivitySummary } from '../types/activity';
import { fetchActivityFeed, FEATURED_REPOS } from '../services/ActivityFeedService';
import { useFeedPreferences, type WatchedRepo } from '../context/FeedPreferencesContext';

interface UseActivityFeedOptions {
  /** Repos to fetch (overrides saved preferences if provided) */
  repos?: string[];
  /** Auto-refresh interval in ms (0 to disable) */
  refreshInterval?: number;
  /** Skip loading from context and use provided/default repos */
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

  // Get repos from context (always called to follow hook rules)
  const { watchedRepos, version, isLoading: contextLoading } = useFeedPreferences();

  const [summaries, setSummaries] = useState<RepoActivitySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Derive resolved repos from context or overrides
  const resolvedRepos = useMemo(() => {
    if (overrideRepos) return overrideRepos;
    if (skipStorage) return FEATURED_REPOS;
    if (contextLoading) return null; // Wait for context to load
    if (watchedRepos.length > 0) {
      return watchedRepos.map((r: WatchedRepo) => `${r.owner}/${r.repo}`);
    }
    return FEATURED_REPOS;
  }, [overrideRepos, skipStorage, contextLoading, watchedRepos]);

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

  // Initial fetch when repos are resolved, and refetch when version changes
  useEffect(() => {
    if (resolvedRepos) {
      fetchData();
    }
    // Include version to refetch when preferences change (only matters when using context)
  }, [resolvedRepos, fetchData, version]);

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
