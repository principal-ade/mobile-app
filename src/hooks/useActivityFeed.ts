import { useState, useEffect, useCallback } from 'react';
import type { RepoActivitySummary } from '../types/activity';
import { fetchActivityFeed, FEATURED_REPOS } from '../services/ActivityFeedService';

interface UseActivityFeedOptions {
  /** Repos to fetch (defaults to FEATURED_REPOS) */
  repos?: string[];
  /** Auto-refresh interval in ms (0 to disable) */
  refreshInterval?: number;
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
  const { repos = FEATURED_REPOS, refreshInterval = 0 } = options;

  const [summaries, setSummaries] = useState<RepoActivitySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const data = await fetchActivityFeed(repos);
      setSummaries(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load activity';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [repos]);

  const refresh = useCallback(async () => {
    setLoading(true);
    await fetchData();
  }, [fetchData]);

  // Initial fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-refresh interval
  useEffect(() => {
    if (refreshInterval <= 0) return;

    const interval = setInterval(() => {
      fetchData();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [refreshInterval, fetchData]);

  return {
    summaries,
    loading,
    error,
    refresh,
  };
}
