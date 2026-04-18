/**
 * User Activity Screen
 *
 * Shows a user's commit activity across watched repositories in a feed-like view.
 * Displays activity from the last 24 hours in MobileRepoCard format for testing FileCityCanvas.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Dimensions,
  ViewToken,
  RefreshControl,
  Image,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';
import { useTheme } from '@principal-ade/industry-theme';
import { useAuth } from '../hooks/useAuth';
import { MobileRepoCard } from '../components/ActivityFeed/MobileRepoCard';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { LucideIcon } from '../components/LucideIcon';
import type { WatchStackParamList } from '../navigation/types';
import type { RepoActivitySummary } from '../types/activity';
import { getRecentCommits, type RecentCommit } from '../services/FeedApiService';
import { fetchCommitStats } from '../services/ActivityFeedService';

type UserActivityScreenRouteProp = RouteProp<WatchStackParamList, 'UserActivity'>;

export function UserActivityScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp<WatchStackParamList>>();
  const route = useRoute<UserActivityScreenRouteProp>();
  const { username, avatarUrl, repoFilter } = route.params;
  const { token } = useAuth();

  const { height: screenHeight, width: screenWidth } = Dimensions.get('window');
  const [containerHeight, setContainerHeight] = useState(screenHeight);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [repoSummaries, setRepoSummaries] = useState<RepoActivitySummary[]>([]);
  const [activeCardIndex, setActiveCardIndex] = useState(0);

  const flatListRef = useRef<FlatList>(null);

  // Fetch user's recent commits
  const fetchUserActivity = useCallback(async (showLoadingSpinner = true) => {
    if (!token) return;

    try {
      if (showLoadingSpinner) {
        setLoading(true);
      }
      setError(null);

      // Fetch recent commits for last 24 hours
      const response = await getRecentCommits(token, { hoursBack: 24 });

      // Filter commits by the specific user (case-insensitive)
      const userCommits = response.commits.filter(
        (commit) => commit.authorLogin.toLowerCase() === username.toLowerCase()
      );

      if (userCommits.length === 0) {
        setRepoSummaries([]);
        setLoading(false);
        return;
      }

      // Group commits by repo
      const repoCommitsMap = new Map<string, RecentCommit[]>();
      userCommits.forEach((commit) => {
        const existing = repoCommitsMap.get(commit.repoId) || [];
        repoCommitsMap.set(commit.repoId, [...existing, commit]);
      });

      // Create RepoActivitySummary for each repo
      const summaries: RepoActivitySummary[] = [];

      for (const [repoId, commits] of repoCommitsMap.entries()) {
        // Parse repo ID to get owner/name
        const repoMetadata = response.repos.find((r) => r.id === repoId);
        if (!repoMetadata) continue;

        const sortedCommits = commits.sort(
          (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );

        // Fetch file changes for each commit
        const commitsWithStats = await Promise.all(
          sortedCommits.map(async (commit) => {
            const stats = await fetchCommitStats(
              repoMetadata.owner,
              repoMetadata.name,
              commit.sha
            );
            return {
              repoOwner: repoMetadata.owner,
              repoName: repoMetadata.name,
              sha: commit.sha, // Real SHA from API
              message: commit.message, // Real commit message
              author: commit.authorName,
              authorLogin: commit.authorLogin,
              authorEmail: commit.authorEmail,
              authorAvatarUrl: commit.authorAvatarUrl || null,
              date: commit.timestamp,
              additions: stats?.additions,
              deletions: stats?.deletions,
              filesChanged: stats?.filesChanged,
              files: stats?.files,
            };
          })
        );

        const summary: RepoActivitySummary = {
          owner: repoMetadata.owner,
          repo: repoMetadata.name,
          fullName: `${repoMetadata.owner}/${repoMetadata.name}`,
          commits: commitsWithStats,
          latestCommitAt: new Date(sortedCommits[0].timestamp),
          commitCount: commits.length,
        };

        summaries.push(summary);
      }

      // Sort by latest activity
      summaries.sort((a, b) => b.latestCommitAt.getTime() - a.latestCommitAt.getTime());

      // Filter by repo if specified
      const filteredSummaries = repoFilter
        ? summaries.filter(
            (s) => s.owner === repoFilter.owner && s.repo === repoFilter.name
          )
        : summaries;

      setRepoSummaries(filteredSummaries);
    } catch (err) {
      console.error('[UserActivityScreen] Error fetching activity:', err);
      setError(err instanceof Error ? err.message : 'Failed to load activity');
    } finally {
      setLoading(false);
    }
  }, [token, username, repoFilter]);

  // Fetch on mount
  useEffect(() => {
    fetchUserActivity();
  }, [fetchUserActivity]);

  // Handle refresh
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchUserActivity(false);
    setRefreshing(false);
  }, [fetchUserActivity]);

  // Track active card
  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0]?.index != null) {
        setActiveCardIndex(viewableItems[0].index);
      }
    },
    []
  );

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
  }).current;

  // Render card
  const renderCard = useCallback(
    ({ item }: { item: RepoActivitySummary; index: number }) => (
      <View style={{ height: containerHeight, width: screenWidth }}>
        <MobileRepoCard
          summary={item}
          containerHeight={containerHeight}
          skipTopInset={true}
        />
      </View>
    ),
    [containerHeight, screenWidth]
  );

  // Loading state
  if (loading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: theme.colors.background }]}>
        <LoadingSpinner size="large" color={theme.colors.primary} />
        <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
          Loading {username}'s activity...
        </Text>
      </View>
    );
  }

  // Error state
  if (error) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: theme.colors.background }]}>
        <Text style={[styles.errorText, { color: theme.colors.error }]}>{error}</Text>
      </View>
    );
  }

  // Empty state
  if (repoSummaries.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        {/* Header */}
        <View
          style={[
            styles.header,
            { paddingTop: insets.top + 12, backgroundColor: theme.colors.background },
          ]}
        >
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <LucideIcon name="ChevronLeft" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Image
              source={{ uri: avatarUrl || `https://github.com/${username}.png` }}
              style={styles.headerAvatar}
            />
            <View style={styles.headerTextContainer}>
              <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
                {username}
              </Text>
              <Text style={[styles.headerSubtitle, { color: theme.colors.textSecondary }]}>
                {repoFilter ? `${repoFilter.owner}/${repoFilter.name}` : 'Last 24 hours'}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.centerContainer}>
          <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
            No activity in the last 24 hours
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      onLayout={(event) => {
        setContainerHeight(event.nativeEvent.layout.height);
      }}
    >
      {/* Header */}
      <View
        style={[
          styles.header,
          { paddingTop: insets.top + 12, backgroundColor: theme.colors.background },
        ]}
      >
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <LucideIcon name="ChevronLeft" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Image
            source={{ uri: avatarUrl || `https://github.com/${username}.png` }}
            style={styles.headerAvatar}
          />
          <View style={styles.headerTextContainer}>
            <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
              {username}
            </Text>
            <Text style={[styles.headerSubtitle, { color: theme.colors.textSecondary }]}>
              {repoSummaries.reduce((sum, s) => sum + s.commitCount, 0)} commits · {repoFilter ? `${repoFilter.owner}/${repoFilter.name}` : 'Last 24 hours'}
            </Text>
          </View>
        </View>
      </View>

      {/* Vertical scrolling cards */}
      <FlatList
        ref={flatListRef}
        data={repoSummaries}
        renderItem={renderCard}
        keyExtractor={(item) => item.fullName}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        snapToInterval={containerHeight}
        decelerationRate="fast"
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={theme.colors.primary}
          />
        }
      />

      {/* Progress indicator */}
      {repoSummaries.length > 1 && (
        <View style={[styles.progressIndicator, { paddingBottom: insets.bottom + 16 }]}>
          {repoSummaries.map((_, index) => (
            <View
              key={index}
              style={[
                styles.progressDot,
                {
                  backgroundColor:
                    index === activeCardIndex
                      ? theme.colors.primary
                      : theme.colors.border,
                  opacity: index === activeCardIndex ? 1 : 0.5,
                },
              ]}
            />
          ))}
        </View>
      )}
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
  header: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backButton: {
    padding: 4,
  },
  headerContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
  },
  progressIndicator: {
    position: 'absolute',
    right: 16,
    top: '50%',
    transform: [{ translateY: -50 }],
    gap: 8,
    alignItems: 'center',
  },
  progressDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});

export default UserActivityScreen;
