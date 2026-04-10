import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  ViewToken,
  LayoutChangeEvent,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { useTheme } from '@principal-ade/industry-theme';
import { MobileRepoCard } from '../components/ActivityFeed/MobileRepoCard';
import { groupSummariesByHour, HourlyRepoCard } from '../utils/activityGrouping';
import { useAuth } from '../hooks/useAuth';
import { LoadingSpinner } from '../components/LoadingSpinner';
import type { RepoActivitySummary } from '../types/activity';
import type { RootStackParamList } from '../navigation/types';

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
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const { isAuthenticated } = useAuth();
  const [activeIndex, setActiveIndex] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [containerHeight, setContainerHeight] = useState(812);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);

  const handleCustomize = useCallback(() => {
    if (isAuthenticated) {
      navigation.navigate('FeedCustomization');
    } else {
      setShowLoginPrompt(true);
    }
  }, [isAuthenticated, navigation]);

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
        <LoadingSpinner size="large" color={theme.colors.primary} />
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

      {/* Feed Header */}
      <View style={[styles.feedHeader, { paddingTop: insets.top + 8, backgroundColor: theme.colors.background }]}>
        <Text style={[styles.feedTitle, { color: theme.colors.text }]}>Your Feed</Text>
        <TouchableOpacity onPress={handleCustomize} style={styles.customizeButton}>
          <Text style={[styles.customizeText, { color: theme.colors.primary }]}>Customize</Text>
        </TouchableOpacity>
      </View>

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

      {/* Login Prompt Modal */}
      <Modal
        visible={showLoginPrompt}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLoginPrompt(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
              Sign in Required
            </Text>
            <Text style={[styles.modalMessage, { color: theme.colors.textSecondary }]}>
              Sign in to customize your feed by following users and repositories.
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: theme.colors.background }]}
                onPress={() => setShowLoginPrompt(false)}
              >
                <Text style={[styles.modalButtonText, { color: theme.colors.textSecondary }]}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: theme.colors.primary }]}
                onPress={() => {
                  setShowLoginPrompt(false);
                  navigation.navigate('MainTabs', { screen: 'About' });
                }}
              >
                <Text style={[styles.modalButtonText, { color: '#FFFFFF' }]}>
                  Sign In
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  feedHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    elevation: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  feedTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  customizeButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  customizeText: {
    fontSize: 15,
    fontWeight: '500',
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    width: '100%',
    maxWidth: 320,
    borderRadius: 16,
    padding: 24,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 24,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
});

export default ActivityFeedScreen;
