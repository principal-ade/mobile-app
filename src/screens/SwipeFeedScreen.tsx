import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { useTheme } from '@principal-ade/industry-theme';
import { SwipeCard } from '../components/ActivityFeed/SwipeCard';
import {
  getCommitQueue,
  passCard,
  saveCard,
  type CommitActivityCard,
} from '../services/FeedApiService';
import { useAuthContext } from '../context/AuthContext';
import { LoadingSpinner } from '../components/LoadingSpinner';
import type { RootStackParamList } from '../navigation/types';

type NavigationProp = StackNavigationProp<RootStackParamList, 'SwipeFeed'>;

interface SwipeFeedScreenProps {
  /** Pre-loaded cards for guest mode (skips auth and API fetch) */
  initialCards?: CommitActivityCard[];
  /** Whether this is a guest viewing featured repos */
  isGuest?: boolean;
  /** Callback to refresh guest cards */
  onRefresh?: () => Promise<void>;
}

// Convert API card to RepoActivitySummary format for SwipeCard
function cardToSummary(card: CommitActivityCard) {
  return {
    owner: card.repo.owner,
    repo: card.repo.name,
    fullName: `${card.repo.owner}/${card.repo.name}`,
    commits: card.commits.map((c) => ({
      repoOwner: card.repo.owner,
      repoName: card.repo.name,
      sha: c.sha,
      message: c.message,
      author: c.author.login,
      authorLogin: c.author.login,
      authorEmail: '',
      authorAvatarUrl: c.author.avatarUrl || null,
      date: c.committedAt,
    })),
    latestCommitAt: new Date(card.latestCommitAt),
    commitCount: card.commitCount,
  };
}

export function SwipeFeedScreen({ initialCards, isGuest = false, onRefresh }: SwipeFeedScreenProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const { token } = useAuthContext();

  const [isLoading, setIsLoading] = useState(isGuest ? !initialCards : true);
  const [error, setError] = useState<string | null>(null);
  const [cards, setCards] = useState<CommitActivityCard[]>(initialCards || []);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [lastSwipedCard, setLastSwipedCard] = useState<{ card: CommitActivityCard; action: 'seen' | 'saved' } | null>(null);
  const [lastFetchedAt, setLastFetchedAt] = useState<Date | null>(null);

  // Update cards when initialCards changes (for guest mode)
  useEffect(() => {
    if (isGuest) {
      if (initialCards) {
        setCards(initialCards);
        setCurrentIndex(0);
        setIsLoading(false);
      } else {
        setIsLoading(true);
      }
    }
  }, [isGuest, initialCards]);

  // Load cards function (reusable for initial load and refresh)
  const loadCards = useCallback(async (showLoading = true) => {
    if (isGuest) return; // Guests get cards via initialCards prop

    try {
      if (showLoading) setIsLoading(true);
      if (!token) {
        setError('Please sign in to view your feed');
        setIsLoading(false);
        return;
      }

      const result = await getCommitQueue(token, 50);
      setCards(result.cards);
      setCurrentIndex(0);
      setLastSwipedCard(null);
      setLastFetchedAt(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load feed');
    } finally {
      setIsLoading(false);
    }
  }, [isGuest, token]);

  // Load cards on mount
  useEffect(() => {
    loadCards();
  }, [loadCards]);

  // Refresh when screen comes back into focus (e.g., after editing feed)
  useFocusEffect(
    useCallback(() => {
      // Skip on initial mount (handled by useEffect above)
      // Only refresh if we already have a token (meaning we loaded before)
      if (token && !isGuest) {
        loadCards(false); // Don't show loading spinner on refocus
      }
    }, [token, isGuest, loadCards])
  );

  const currentCard = cards[currentIndex];

  const handleSwipeLeft = useCallback(async () => {
    if (!currentCard) return;

    // Track for undo
    setLastSwipedCard({ card: currentCard, action: 'seen' });

    // Optimistically advance to next card
    setCurrentIndex((prev) => prev + 1);

    // Pass the card in background (only for authenticated users)
    // Send commit SHAs so only these specific commits are marked as seen
    if (token && !isGuest) {
      try {
        const seenShas = currentCard.commits.map((c) => c.sha);
        await passCard(token, currentCard.itemId, seenShas);
      } catch (err) {
        console.warn('Failed to pass card:', err);
      }
    }
  }, [token, currentCard, isGuest]);

  const handleSwipeRight = useCallback(async () => {
    if (!currentCard) return;

    // Track for undo
    setLastSwipedCard({ card: currentCard, action: 'saved' });

    // Optimistically advance to next card
    setCurrentIndex((prev) => prev + 1);

    // Save the card in background (only for authenticated users)
    if (token && !isGuest) {
      try {
        await saveCard(token, currentCard);
      } catch (err) {
        console.warn('Failed to save card:', err);
      }
    }
  }, [token, currentCard, isGuest]);

  const handleUndo = useCallback(() => {
    if (!lastSwipedCard || currentIndex === 0) return;

    // Go back to the previous card
    setCurrentIndex((prev) => prev - 1);
    setLastSwipedCard(null);

    // Note: We don't unsave/unpass from API - this is just local undo
    // The card will be re-evaluated on next swipe
  }, [lastSwipedCard, currentIndex]);

  const handleCardPress = useCallback(() => {
    if (!currentCard) return;

    const summary = cardToSummary(currentCard);
    navigation.navigate('CardDetail', {
      summary: {
        owner: summary.owner,
        repo: summary.repo,
        fullName: summary.fullName,
        commits: summary.commits.map((c) => ({
          repoOwner: c.repoOwner,
          repoName: c.repoName,
          sha: c.sha,
          message: c.message,
          author: c.author,
          authorLogin: c.authorLogin,
          authorEmail: c.authorEmail,
          authorAvatarUrl: c.authorAvatarUrl,
          date: c.date,
        })),
        latestCommitAt: summary.latestCommitAt.toISOString(),
        commitCount: summary.commitCount,
      },
    });
  }, [currentCard, navigation]);

  // Format relative time for "last updated" display
  const formatLastFetched = useCallback(() => {
    if (!lastFetchedAt) return null;
    const now = new Date();
    const diffMs = now.getTime() - lastFetchedAt.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Updated just now';
    if (diffMins === 1) return 'Updated 1m ago';
    if (diffMins < 60) return `Updated ${diffMins}m ago`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours === 1) return 'Updated 1h ago';
    return `Updated ${diffHours}h ago`;
  }, [lastFetchedAt]);

  const handleGoToCustomize = useCallback(() => {
    navigation.navigate('FeedCustomization', {});
  }, [navigation]);

  // Loading state
  if (isLoading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: theme.colors.background, paddingTop: insets.top }]}>
        <LoadingSpinner size="large" color={theme.colors.primary} />
        <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
          Loading your feed...
        </Text>
      </View>
    );
  }

  // Error state
  if (error) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: theme.colors.background, paddingTop: insets.top }]}>
        <Text style={[styles.errorText, { color: theme.colors.error }]}>{error}</Text>
        <TouchableOpacity
          style={[styles.retryButton, { borderColor: theme.colors.primary }]}
          onPress={() => {
            setError(null);
            setIsLoading(true);
          }}
        >
          <Text style={[styles.retryText, { color: theme.colors.primary }]}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Empty state (no more cards)
  if (!currentCard || currentIndex >= cards.length) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: theme.colors.background, paddingTop: insets.top }]}>
        {/* Checkmark icon */}
        <View style={[styles.emptyIconContainer, { borderColor: theme.colors.success }]}>
          <View style={[styles.checkmark, { borderColor: theme.colors.success }]} />
        </View>
        <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
          You're all caught up!
        </Text>
        <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
          {isGuest
            ? 'Sign in to customize your feed and save cards.'
            : 'No more activity cards to review right now.'}
        </Text>
        {lastFetchedAt && (
          <Text style={[styles.lastUpdatedText, { color: theme.colors.textMuted, marginBottom: 16 }]}>
            {formatLastFetched()}
          </Text>
        )}
        <View style={styles.emptyButtonsContainer}>
          {isGuest ? (
            <>
              <TouchableOpacity
                style={[styles.primaryButton, { backgroundColor: theme.colors.primary }]}
                onPress={() => navigation.navigate('MainTabs', { screen: 'About' })}
              >
                <Text style={styles.primaryButtonText}>Sign In</Text>
              </TouchableOpacity>
              {onRefresh && (
                <TouchableOpacity
                  style={[styles.secondaryButton, { borderColor: theme.colors.border }]}
                  onPress={onRefresh}
                >
                  <Text style={[styles.secondaryButtonText, { color: theme.colors.text }]}>Refresh</Text>
                </TouchableOpacity>
              )}
            </>
          ) : (
            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: theme.colors.primary }]}
              onPress={handleGoToCustomize}
            >
              <Text style={styles.primaryButtonText}>Edit Feed</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  // Get visible cards (current + next) - using slice preserves keys
  const visibleCards = cards.slice(currentIndex, currentIndex + 2);

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.colors.background, paddingTop: insets.top },
      ]}
    >
      {/* Card Stack - render in reverse so first card is on top */}
      <View style={styles.cardContainer}>
        {visibleCards.map((card, index) => {
          const isCurrentCard = index === 0;
          const summary = cardToSummary(card);

          return (
            <View
              key={card.itemId}
              style={[
                styles.stackedCard,
                { zIndex: visibleCards.length - index },
              ]}
            >
              <SwipeCard
                summary={summary}
                containerHeight={0}
                swipeDisabled={!isCurrentCard}
                onPress={isCurrentCard ? handleCardPress : undefined}
                onSwipeLeft={isCurrentCard ? handleSwipeLeft : undefined}
                onSwipeRight={isCurrentCard ? handleSwipeRight : undefined}
                onSwipeDown={isCurrentCard && lastSwipedCard ? handleUndo : undefined}
              />
            </View>
          );
        })}
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    borderWidth: 1,
  },
  retryText: {
    fontSize: 15,
    fontWeight: '600',
  },
  emptyIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  checkmark: {
    width: 24,
    height: 14,
    borderLeftWidth: 3,
    borderBottomWidth: 3,
    transform: [{ rotate: '-45deg' }, { translateY: -4 }],
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyButtonsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  primaryButton: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 1,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  lastUpdatedText: {
    fontSize: 12,
  },
  cardContainer: {
    flex: 1,
    position: 'relative',
  },
  stackedCard: {
    ...StyleSheet.absoluteFillObject,
  },
});

export default SwipeFeedScreen;
