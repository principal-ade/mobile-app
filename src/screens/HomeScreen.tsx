import React from 'react';
import { ActivityFeedScreen } from './ActivityFeedScreen';
import { useActivityFeed } from '../hooks/useActivityFeed';

export function HomeScreen() {
  const { summaries, loading, error, refresh } = useActivityFeed({
    refreshInterval: 5 * 60 * 1000, // Auto-refresh every 5 minutes
  });

  return (
    <ActivityFeedScreen
      summaries={summaries}
      loading={loading}
      error={error}
      onRefresh={refresh}
    />
  );
}

export default HomeScreen;
