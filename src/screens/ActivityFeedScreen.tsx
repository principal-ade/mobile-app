import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  ViewToken,
  LayoutChangeEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@principal-ade/industry-theme';
import { MobileRepoCard } from '../components/ActivityFeed/MobileRepoCard';
import { groupSummariesByHour, HourlyRepoCard } from '../utils/activityGrouping';
import type { RepoActivitySummary } from '../types/activity';

interface ActivityFeedScreenProps {
  summaries: RepoActivitySummary[];
  loading?: boolean;
  error?: string | null;
  onRefresh?: () => void;
}

export function ActivityFeedScreen({
  summaries,
  loading = false,
  error = null,
  onRefresh,
}: ActivityFeedScreenProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [activeIndex, setActiveIndex] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [containerHeight, setContainerHeight] = useState(812);

  const onContainerLayout = useCallback((event: LayoutChangeEvent) => {
    const { height } = event.nativeEvent.layout;
    if (height > 0) {
      setContainerHeight(height);
    }
  }, []);

  // Group summaries by hour
  const cards = groupSummariesByHour(summaries);

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0]?.index != null) {
        setActiveIndex(viewableItems[0].index);
      }
    },
    []
  );

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
  }).current;

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await onRefresh?.();
    setRefreshing(false);
  }, [onRefresh]);

  const renderCard = useCallback(
    ({ item }: { item: HourlyRepoCard }) => (
      <View style={[styles.cardContainer, { height: containerHeight }]}>
        <MobileRepoCard
          summary={item.summary}
          hourLabel={item.hourLabel}
          containerHeight={containerHeight}
        />
      </View>
    ),
    [containerHeight]
  );

  // Loading state
  if (loading && cards.length === 0) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: theme.colors.background, paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
          Loading activity...
        </Text>
      </View>
    );
  }

  // Error state
  if (error) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: theme.colors.background, paddingTop: insets.top }]}>
        <Text style={[styles.errorText, { color: theme.colors.error }]}>{error}</Text>
      </View>
    );
  }

  // Empty state
  if (cards.length === 0) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: theme.colors.background, paddingTop: insets.top }]}>
        <Text style={styles.emptyIcon}>📁</Text>
        <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
          No recent activity
        </Text>
        <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
          Commits from featured repositories will appear here
        </Text>
      </View>
    );
  }

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      onLayout={onContainerLayout}
    >
      <FlatList
        data={cards}
        renderItem={renderCard}
        keyExtractor={(item) => item.key}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        snapToInterval={containerHeight}
        decelerationRate="fast"
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        refreshControl={
          onRefresh ? (
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={theme.colors.primary}
            />
          ) : undefined
        }
      />

      {/* Side indicator dots */}
      {cards.length > 1 && (
        <View style={styles.indicatorContainer}>
          {cards.slice(0, 10).map((card, index) => (
            <View
              key={card.key}
              style={[
                styles.indicator,
                {
                  backgroundColor: theme.colors.primary,
                  opacity: index === activeIndex ? 1 : 0.3,
                },
              ]}
            />
          ))}
          {cards.length > 10 && (
            <Text style={[styles.indicatorOverflow, { color: theme.colors.textSecondary }]}>
              +{cards.length - 10}
            </Text>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  cardContainer: {
    width: '100%',
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
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
    opacity: 0.5,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
  },
  indicatorContainer: {
    position: 'absolute',
    right: 8,
    top: '50%',
    transform: [{ translateY: -50 }],
    alignItems: 'center',
    gap: 6,
    padding: 4,
  },
  indicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  indicatorOverflow: {
    fontSize: 10,
    marginTop: 4,
  },
});

export default ActivityFeedScreen;
