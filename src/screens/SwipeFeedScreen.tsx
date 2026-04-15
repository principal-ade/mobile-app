import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  FlatList,
  ViewToken,
  useWindowDimensions,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useTheme } from '@principal-ade/industry-theme';
import { MobileRepoCard } from '../components/ActivityFeed/MobileRepoCard';
import {
  getCommitQueue,
  passCard,
  saveCard,
  type CommitActivityCard,
} from '../services/FeedApiService';
import { useAuthContext } from '../context/AuthContext';
import { LoadingSpinner } from '../components/LoadingSpinner';
import type { FeedStackParamList, MainTabParamList } from '../navigation/types';
import { TapGestureHandler, State } from 'react-native-gesture-handler';

type NavigationProp = CompositeNavigationProp<
  StackNavigationProp<FeedStackParamList, 'SwipeFeed'>,
  BottomTabNavigationProp<MainTabParamList>
>;

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
  const { height } = useWindowDimensions();

  // Account for tab bar height (56px + adjusted safe area)
  const TAB_BAR_HEIGHT = 56 + (insets.bottom > 0 ? insets.bottom - 8 : 8);
  const availableHeight = height - TAB_BAR_HEIGHT;

  const [isLoading, setIsLoading] = useState(isGuest ? !initialCards : true);
  const [error, setError] = useState<string | null>(null);
  const [cards, setCards] = useState<CommitActivityCard[]>(initialCards || []);
  const [seenCards, setSeenCards] = useState<Set<string>>(new Set());
  const [lastFetchedAt, setLastFetchedAt] = useState<Date | null>(null);
  const [savedCardId, setSavedCardId] = useState<string | null>(null);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const heartScale = useRef(new Animated.Value(0)).current;

  // Debug: log seen cards count when changed
  useEffect(() => {
    if (seenCards.size > 0) {
      console.log(`[SwipeFeedScreen] Marked ${seenCards.size} cards as seen`);
    }
  }, [seenCards]);

  // Update cards when initialCards changes (for guest mode)
  useEffect(() => {
    if (isGuest) {
      if (initialCards) {
        setCards(initialCards);
        setSeenCards(new Set());
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
      setSeenCards(new Set());
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

  // Handle double-tap to save
  const handleDoubleTap = useCallback(async (card: CommitActivityCard) => {
    // Show heart animation
    setSavedCardId(card.itemId);
    Animated.sequence([
      Animated.spring(heartScale, {
        toValue: 1,
        useNativeDriver: true,
        tension: 50,
        friction: 3,
      }),
      Animated.delay(400),
      Animated.timing(heartScale, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setSavedCardId(null);
    });

    // Save the card in background (only for authenticated users)
    if (token && !isGuest) {
      try {
        await saveCard(token, card);
      } catch (err) {
        console.warn('Failed to save card:', err);
      }
    }
  }, [token, isGuest, heartScale]);

  // Store token and isGuest in refs to avoid recreating onViewableItemsChanged
  const tokenRef = useRef(token);
  const isGuestRef = useRef(isGuest);

  useEffect(() => {
    tokenRef.current = token;
    isGuestRef.current = isGuest;
  }, [token, isGuest]);

  // Track viewable items and mark as seen when scrolled past
  const handleViewableItemsChanged = useCallback(({ viewableItems: _viewableItems, changed }: { viewableItems: ViewToken[]; changed: ViewToken[] }) => {
    // Update current card index based on the first viewable item
    if (_viewableItems.length > 0 && _viewableItems[0].index !== null) {
      setCurrentCardIndex(_viewableItems[0].index);
    }

    // Mark cards that are no longer viewable as seen
    changed.forEach((item) => {
      if (!item.isViewable && item.item) {
        // Skip the done card
        if ('isDoneCard' in item.item) return;

        const card = item.item as CommitActivityCard;
        setSeenCards((prev) => {
          if (prev.has(card.itemId)) return prev;
          const newSet = new Set(prev);
          newSet.add(card.itemId);

          // Mark as seen in the API (only for authenticated users)
          if (tokenRef.current && !isGuestRef.current) {
            const seenShas = card.commits.map((c) => c.sha);
            passCard(tokenRef.current, card.itemId, seenShas).catch((err) => {
              console.warn('Failed to pass card:', err);
            });
          }

          return newSet;
        });
      }
    });
  }, []);

  const onViewableItemsChanged = useRef(handleViewableItemsChanged);

  useEffect(() => {
    onViewableItemsChanged.current = handleViewableItemsChanged;
  }, [handleViewableItemsChanged]);

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
    minimumViewTime: 1000, // Must be visible for 1 second before considering it viewed
  }).current;

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

  // Prepare data with done card at the end
  const cardsWithDone = useMemo(() => {
    if (cards.length === 0) return [];
    return [...cards, { isDoneCard: true as const }];
  }, [cards]);

  // Render dot indicator for card progress
  const renderDotIndicator = useCallback(() => {
    const totalCards = cards.length;
    // Hide dots if no cards or if viewing the done card
    if (totalCards === 0 || currentCardIndex >= totalCards) return null;

    const maxDots = 10;
    const dotsToShow = Math.min(totalCards, maxDots);

    return (
      <View style={[styles.dotIndicatorContainer, { top: availableHeight / 2 - (dotsToShow * 10) / 2 }]}>
        {Array.from({ length: dotsToShow }).map((_, index) => {
          const isActive = index === currentCardIndex && currentCardIndex < dotsToShow;
          return (
            <View
              key={index}
              style={[
                styles.dot,
                isActive && styles.dotActive,
                { backgroundColor: isActive ? theme.colors.primary : theme.colors.textMuted },
              ]}
            />
          );
        })}
      </View>
    );
  }, [cards.length, currentCardIndex, theme.colors.primary, theme.colors.textMuted, availableHeight]);

  // Render each card
  const renderCard = useCallback(({ item: card }: { item: CommitActivityCard | { isDoneCard: true } }) => {
    // Check if this is the "done" card
    if ('isDoneCard' in card) {
      return (
        <View style={[styles.cardWrapper, { height: availableHeight }]}>
          <ScrollView
            style={[styles.doneCardContainer, { backgroundColor: theme.colors.background }]}
            contentContainerStyle={[styles.doneCardContent, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 24 }]}
          >
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
              <Text style={[styles.lastUpdatedText, { color: theme.colors.textMuted, marginBottom: 24 }]}>
                {formatLastFetched()}
              </Text>
            )}

            <View style={styles.emptyButtonsContainer}>
              {isGuest ? (
                <>
                  <TouchableOpacity
                    style={[styles.primaryButton, { backgroundColor: theme.colors.primary }]}
                    onPress={() => navigation.navigate('About', { screen: 'AboutHome' })}
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
          </ScrollView>
        </View>
      );
    }

    const actualCard = card as CommitActivityCard;
    const summary = cardToSummary(actualCard);
    const isSaved = savedCardId === actualCard.itemId;

    return (
      <TapGestureHandler
        numberOfTaps={2}
        onHandlerStateChange={(event) => {
          if (event.nativeEvent.state === State.ACTIVE) {
            handleDoubleTap(actualCard);
          }
        }}
      >
        <View style={[styles.cardWrapper, { height: availableHeight }]}>
          <MobileRepoCard
            summary={summary}
            containerHeight={availableHeight}
            skipTopInset={false}
          />
          {/* Heart animation overlay */}
          {isSaved && (
            <Animated.View
              style={[
                styles.heartOverlay,
                {
                  transform: [{ scale: heartScale }],
                },
              ]}
              pointerEvents="none"
            >
              <Text style={styles.heartIcon}>♥</Text>
            </Animated.View>
          )}
        </View>
      </TapGestureHandler>
    );
  }, [availableHeight, handleDoubleTap, savedCardId, heartScale, theme.colors, insets, isGuest, lastFetchedAt, formatLastFetched, navigation, handleGoToCustomize, onRefresh]);

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

  // Empty state (no cards)
  if (cards.length === 0) {
    return (
      <ScrollView
        style={[styles.emptyContainer, { backgroundColor: theme.colors.background }]}
        contentContainerStyle={[styles.emptyContent, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 24 }]}
      >
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
          <Text style={[styles.lastUpdatedText, { color: theme.colors.textMuted, marginBottom: 24 }]}>
            {formatLastFetched()}
          </Text>
        )}

        <View style={styles.emptyButtonsContainer}>
          {isGuest ? (
            <>
              <TouchableOpacity
                style={[styles.primaryButton, { backgroundColor: theme.colors.primary }]}
                onPress={() => navigation.navigate('About', { screen: 'AboutHome' })}
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
      </ScrollView>
    );
  }

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.colors.background },
      ]}
    >
      <FlatList
        data={cardsWithDone}
        renderItem={renderCard}
        keyExtractor={(item) => 'isDoneCard' in item ? 'done-card' : (item as CommitActivityCard).itemId}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        snapToInterval={availableHeight}
        decelerationRate="fast"
        onViewableItemsChanged={onViewableItemsChanged.current}
        viewabilityConfig={viewabilityConfig}
      />
      {renderDotIndicator()}
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
  emptyContainer: {
    flex: 1,
  },
  emptyContent: {
    alignItems: 'center',
    paddingHorizontal: 24,
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
    marginTop: 8,
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
  cardWrapper: {
    width: '100%',
    position: 'relative',
  },
  heartOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  heartIcon: {
    fontSize: 120,
    color: '#FF3B30',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  dotIndicatorContainer: {
    position: 'absolute',
    right: 12,
    flexDirection: 'column',
    alignItems: 'center',
    gap: 8,
    zIndex: 100,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    opacity: 0.4,
  },
  dotActive: {
    width: 8,
    height: 8,
    borderRadius: 4,
    opacity: 1,
  },
  doneCardContainer: {
    flex: 1,
  },
  doneCardContent: {
    alignItems: 'center',
    paddingHorizontal: 24,
    minHeight: '100%',
    justifyContent: 'center',
  },
});

export default SwipeFeedScreen;
