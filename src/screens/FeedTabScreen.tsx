import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../hooks/useAuth';
import SwipeFeedScreen from './SwipeFeedScreen';
import { fetchActivityFeed } from '../services/ActivityFeedService';
import { summariesToCards } from '../utils/feedTransforms';
import type { RepoActivitySummary } from '../types/activity';

/**
 * Feed tab wrapper that shows SwipeFeedScreen for both auth states:
 * - Authenticated users see personalized feed from API
 * - Guest users see featured repos with same swipe UI
 */
export default function FeedTabScreen() {
  const { isAuthenticated } = useAuth();
  const [summaries, setSummaries] = useState<RepoActivitySummary[]>([]);
  const [loading, setLoading] = useState(true);

  const loadFeaturedFeed = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchActivityFeed();
      setSummaries(data);
    } catch (err) {
      console.warn('Failed to load featured feed:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      loadFeaturedFeed();
    }
  }, [isAuthenticated, loadFeaturedFeed]);

  // Transform summaries to cards for guest mode
  const guestCards = useMemo(() => {
    if (isAuthenticated || loading) return undefined;
    return summariesToCards(summaries);
  }, [isAuthenticated, loading, summaries]);

  if (isAuthenticated) {
    return <SwipeFeedScreen />;
  }

  return (
    <SwipeFeedScreen
      initialCards={guestCards}
      isGuest
      onRefresh={loadFeaturedFeed}
    />
  );
}
