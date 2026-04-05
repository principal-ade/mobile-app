import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { useTheme } from '@principal-ade/industry-theme';
import { SwipeCard } from '../components/ActivityFeed/SwipeCard';
import {
  getCommitQueue,
  passCard,
  saveCard,
  type CommitActivityCard,
} from '../services/FeedApiService';
import { getToken } from '../utils/authStorage';
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

  const [isLoading, setIsLoading] = useState(isGuest ? !initialCards : true);
  const [error, setError] = useState<string | null>(null);
  const [cards, setCards] = useState<CommitActivityCard[]>(initialCards || []);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [token, setToken] = useState<string | null>(null);
  const [lastSwipedCard, setLastSwipedCard] = useState<{ card: CommitActivityCard; action: 'seen' | 'saved' } | null>(null);

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

  // Load cards on mount (only for authenticated users, not guests)
  useEffect(() => {
    if (isGuest) return; // Guests get cards via initialCards prop

    async function loadCards() {
      try {
        const authToken = await getToken();
        if (!authToken) {
          setError('Please sign in to view your feed');
          setIsLoading(false);
          return;
        }
        setToken(authToken);

        const result = await getCommitQueue(authToken, 50);
        setCards(result.cards);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load feed');
      } finally {
        setIsLoading(false);
      }
    }
    loadCards();
  }, [isGuest]);

  const currentCard = cards[currentIndex];

  const handleSwipeLeft = useCallback(async () => {
    if (!currentCard) return;

    // Track for undo
    setLastSwipedCard({ card: currentCard, action: 'seen' });

    // Optimistically advance to next card
    setCurrentIndex((prev) => prev + 1);

    // Pass the card in background (only for authenticated users)
    if (token && !isGuest) {
      try {
        await passCard(token, currentCard.itemId);
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

    navigation.navigate('CardDetail', {
      owner: currentCard.repo.owner,
      repo: currentCard.repo.name,
      commits: currentCard.commits.map((c) => ({
        sha: c.sha,
        message: c.message,
        author: c.author.login,
        authorLogin: c.author.login,
        authorAvatarUrl: c.author.avatarUrl || null,
        date: c.committedAt,
      })),
    });
  }, [currentCard, navigation]);

  const handleGoToSaved = useCallback(() => {
    navigation.navigate('MainTabs', { screen: 'Saved' });
  }, [navigation]);

  const handleGoToCustomize = useCallback(() => {
    navigation.navigate('FeedCustomization', {});
  }, [navigation]);

  // Loading state
  if (isLoading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: theme.colors.background, paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
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
            <>
              <TouchableOpacity
                style={[styles.primaryButton, { backgroundColor: theme.colors.primary }]}
                onPress={handleGoToCustomize}
              >
                <Text style={styles.primaryButtonText}>Edit Feed</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.secondaryButton, { borderColor: theme.colors.border }]}
                onPress={handleGoToSaved}
              >
                <Text style={[styles.secondaryButtonText, { color: theme.colors.text }]}>View Saved</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    );
  }

  const currentSummary = cardToSummary(currentCard);
  const nextCard = cards[currentIndex + 1];
  const nextSummary = nextCard ? cardToSummary(nextCard) : null;

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.colors.background },
      ]}
    >
      {/* Drag handle */}
      <View style={[styles.dragHandleContainer, { paddingTop: insets.top + 8 }]}>
        <View style={[styles.dragHandle, { backgroundColor: theme.colors.border }]} />
      </View>

      {/* Card Stack */}
      <View style={styles.cardContainer}>
        {/* Next card (underneath) */}
        {nextSummary && (
          <View style={styles.nextCard}>
            <SwipeCard
              key={nextCard.itemId}
              summary={nextSummary}
              containerHeight={0}
              swipeDisabled
            />
          </View>
        )}

        {/* Current card (on top) */}
        <View style={styles.currentCard}>
          <SwipeCard
            key={currentCard.itemId}
            summary={currentSummary}
            containerHeight={0}
            onPress={handleCardPress}
            onSwipeLeft={handleSwipeLeft}
            onSwipeRight={handleSwipeRight}
            onSwipeDown={lastSwipedCard ? handleUndo : undefined}
          />
        </View>
      </View>

      {/* Bottom action bar */}
      <View style={styles.actionBar}>
        {/* Swipe hints */}
        <View style={styles.hintRow}>
          <Text style={[styles.hintText, { color: theme.colors.textSecondary }]}>← ↑ Seen</Text>
          {lastSwipedCard ? (
            <Text style={[styles.hintText, { color: theme.colors.warning || '#FF9500' }]}>↓ Undo</Text>
          ) : (
            <Text style={[styles.hintText, { color: theme.colors.textSecondary }]}>Swipe</Text>
          )}
          <Text style={[styles.hintText, { color: theme.colors.success }]}>Save →</Text>
        </View>
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
  dragHandleContainer: {
    alignItems: 'center',
    paddingBottom: 8,
  },
  dragHandle: {
    width: 36,
    height: 5,
    borderRadius: 3,
  },
  cardContainer: {
    flex: 1,
    position: 'relative',
  },
  nextCard: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  currentCard: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 2,
  },
  actionBar: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  hintRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  hintText: {
    fontSize: 13,
    fontWeight: '600',
  },
});

export default SwipeFeedScreen;
