import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { useTheme } from '@principal-ade/industry-theme';
import { useAuth } from '../hooks/useAuth';
import SwipeFeedScreen from './SwipeFeedScreen';
import FeedOnboardingScreen from './FeedOnboardingScreen';
import { fetchActivityFeed } from '../services/ActivityFeedService';
import { getFollows } from '../services/FeedApiService';
import { summariesToCards } from '../utils/feedTransforms';
import { useAuthContext } from '../context/AuthContext';
import type { RepoActivitySummary } from '../types/activity';

/**
 * Feed tab wrapper that handles three states:
 * - Guest users: see featured repos with swipe UI
 * - Authenticated users with no follows: see onboarding flow
 * - Authenticated users with follows: see personalized feed from API
 */
export default function FeedTabScreen() {
  const { isAuthenticated } = useAuth();
  const { theme } = useTheme();
  const { token } = useAuthContext();

  // Guest mode state
  const [summaries, setSummaries] = useState<RepoActivitySummary[]>([]);
  const [loading, setLoading] = useState(true);

  // Onboarding state
  const [needsOnboarding, setNeedsOnboarding] = useState<boolean | null>(null);
  const [onboardingComplete, setOnboardingComplete] = useState(false);

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

  // Check if authenticated user needs onboarding
  useEffect(() => {
    if (!isAuthenticated) {
      setNeedsOnboarding(false);
      loadFeaturedFeed();
      return;
    }

    // Reset onboarding complete when auth changes
    setOnboardingComplete(false);

    async function checkFollows() {
      try {
        if (!token) {
          setNeedsOnboarding(false);
          return;
        }

        const follows = await getFollows(token);
        const hasFollows =
          follows.followedUsers.length > 0 || follows.followedRepos.length > 0;
        setNeedsOnboarding(!hasFollows);
      } catch (err) {
        console.warn('Failed to check follows:', err);
        // On error, skip onboarding and show feed
        setNeedsOnboarding(false);
      }
    }
    checkFollows();
  }, [isAuthenticated, loadFeaturedFeed, token]);

  // Transform summaries to cards for guest mode
  const guestCards = useMemo(() => {
    if (isAuthenticated || loading) return undefined;
    return summariesToCards(summaries);
  }, [isAuthenticated, loading, summaries]);

  // Show loading while checking onboarding status
  if (isAuthenticated && needsOnboarding === null) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  // Show onboarding for authenticated users with no follows
  if (isAuthenticated && needsOnboarding && !onboardingComplete) {
    return (
      <FeedOnboardingScreen
        onComplete={() => {
          setOnboardingComplete(true);
          setNeedsOnboarding(false);
        }}
      />
    );
  }

  // Authenticated users with follows (or completed onboarding)
  if (isAuthenticated) {
    return <SwipeFeedScreen />;
  }

  // Guest users
  return (
    <SwipeFeedScreen
      initialCards={guestCards}
      isGuest
      onRefresh={loadFeaturedFeed}
    />
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
