/**
 * Activity Tab Screen
 *
 * Shows the hourly activity heatmap visualization
 * with commit activity from followed users and repos.
 */

import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Pressable,
  Image,
} from 'react-native';
import { ScrollView as GHScrollView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '@principal-ade/industry-theme';
import { useAuth } from '../hooks/useAuth';
import { useFeedPreferences } from '../context/FeedPreferencesContext';
import {
  HourlyActivityHeatmap,
  CommitTimestamp,
} from '../components/HourlyActivityHeatmap';
import { BlockCommitsSheet } from '../components/BlockCommitsSheet';
import {
  getActivityHeatmap,
  HeatmapCommit,
  HeatmapAuthor,
  HeatmapRepo,
} from '../services/FeedApiService';

export function ActivityTabScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { isAuthenticated, token, user } = useAuth();
  const { version } = useFeedPreferences();

  const [commits, setCommits] = useState<CommitTimestamp[]>([]);
  const [authors, setAuthors] = useState<HeatmapAuthor[]>([]);
  const [repos, setRepos] = useState<HeatmapRepo[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // UI filter state for heatmap display
  const [selectedAuthorLogins, setSelectedAuthorLogins] = useState<string[] | null>(null);
  const [selectedRepoIds, setSelectedRepoIds] = useState<string[] | null>(null);

  // Block commits sheet state
  const [sheetVisible, setSheetVisible] = useState(false);
  const [selectedBlockStart, setSelectedBlockStart] = useState<Date | null>(null);
  const [selectedBlockEnd, setSelectedBlockEnd] = useState<Date | null>(null);
  const [selectedBlockCount, setSelectedBlockCount] = useState(0);

  // Filter panel state
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);

  // Track if we've done initial fetch and version at last fetch
  const hasFetched = useRef(false);
  const lastFetchTime = useRef<number>(0);
  const versionAtLastFetch = useRef(version);

  const fetchActivity = useCallback(async (force = false) => {
    if (!token) {
      setLoading(false);
      return;
    }

    // Skip if we fetched recently (within 30 seconds) and not forcing
    const now = Date.now();
    if (!force && hasFetched.current && now - lastFetchTime.current < 30000) {
      setLoading(false);
      return;
    }

    try {
      setError(null);
      const response = await getActivityHeatmap(token, {
        hoursBack: 24,
      });

      // Transform API commits to CommitTimestamp format
      const transformedCommits: CommitTimestamp[] = response.commits.map(
        (commit: HeatmapCommit) => ({
          timestamp: new Date(commit.timestamp),
          repoId: commit.repoId,
          authorLogin: commit.authorLogin,
          authorAvatarUrl: commit.authorAvatarUrl,
        })
      );

      setCommits(transformedCommits);
      setAuthors(response.authors);
      setRepos(response.repos);
      hasFetched.current = true;
      lastFetchTime.current = now;
      versionAtLastFetch.current = version;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load activity');
    } finally {
      setLoading(false);
    }
  }, [token, version]);

  // Only fetch on initial mount
  useFocusEffect(
    useCallback(() => {
      if (!hasFetched.current) {
        fetchActivity();
      }
    }, [fetchActivity])
  );

  // Refetch when feed preferences change (version increments)
  useEffect(() => {
    if (hasFetched.current && versionAtLastFetch.current !== version) {
      fetchActivity(true);
      versionAtLastFetch.current = version;
    }
  }, [version, fetchActivity]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchActivity(true);
    setRefreshing(false);
  }, [fetchActivity]);

  const handleBlockClick = useCallback(
    (startTime: Date, endTime: Date, count: number) => {
      if (count === 0) return; // Don't open sheet for empty blocks

      setSelectedBlockStart(startTime);
      setSelectedBlockEnd(endTime);
      setSelectedBlockCount(count);
      setSheetVisible(true);
    },
    []
  );

  const handleSheetClose = useCallback(() => {
    setSheetVisible(false);
  }, []);

  // Toggle author filter selection
  const toggleAuthorFilter = useCallback((login: string) => {
    setSelectedAuthorLogins((prev) => {
      if (!prev) return [login];
      if (prev.includes(login)) {
        const next = prev.filter((l) => l !== login);
        return next.length === 0 ? null : next;
      }
      return [...prev, login];
    });
  }, []);

  // Toggle repo filter selection
  const toggleRepoFilter = useCallback((repoId: string) => {
    setSelectedRepoIds((prev) => {
      if (!prev) return [repoId];
      if (prev.includes(repoId)) {
        const next = prev.filter((r) => r !== repoId);
        return next.length === 0 ? null : next;
      }
      return [...prev, repoId];
    });
  }, []);

  // Select only current user's commits
  const selectMe = useCallback(() => {
    if (user?.login) {
      setSelectedAuthorLogins([user.login]);
      setSelectedRepoIds(null);
    }
  }, [user?.login]);

  // Clear all filters
  const clearFilters = useCallback(() => {
    setSelectedAuthorLogins(null);
    setSelectedRepoIds(null);
    setFilterPanelOpen(false);
  }, []);

  // Get filter label for the button
  const getFilterLabel = useMemo(() => {
    const authorCount = selectedAuthorLogins?.length ?? 0;
    const repoCount = selectedRepoIds?.length ?? 0;

    if (authorCount === 0 && repoCount === 0) {
      return 'All';
    }

    // Check if only "me" is selected
    if (authorCount === 1 && repoCount === 0 && selectedAuthorLogins?.[0] === user?.login) {
      return 'Me';
    }

    const parts: string[] = [];
    if (authorCount > 0) {
      parts.push(`${authorCount} author${authorCount > 1 ? 's' : ''}`);
    }
    if (repoCount > 0) {
      parts.push(`${repoCount} repo${repoCount > 1 ? 's' : ''}`);
    }
    return parts.join(', ');
  }, [selectedAuthorLogins, selectedRepoIds, user?.login]);

  const hasActiveFilter = selectedAuthorLogins !== null || selectedRepoIds !== null;

  // Not authenticated state
  if (!isAuthenticated) {
    return (
      <View
        style={[
          styles.centerContainer,
          {
            backgroundColor: theme.colors.background,
            paddingTop: insets.top,
            paddingBottom: insets.bottom,
          },
        ]}
      >
        <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
          Sign in to view activity
        </Text>
        <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
          Follow users and repositories to see their commit activity here
        </Text>
      </View>
    );
  }

  // Loading state
  if (loading && commits.length === 0) {
    return (
      <View
        style={[
          styles.centerContainer,
          {
            backgroundColor: theme.colors.background,
            paddingTop: insets.top,
          },
        ]}
      >
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
      <View
        style={[
          styles.centerContainer,
          {
            backgroundColor: theme.colors.background,
            paddingTop: insets.top,
          },
        ]}
      >
        <Text style={[styles.errorText, { color: theme.colors.error }]}>
          {error}
        </Text>
      </View>
    );
  }

  // Empty state (no follows)
  if (commits.length === 0 && authors.length === 0 && repos.length === 0) {
    return (
      <ScrollView
        style={[styles.container, { backgroundColor: theme.colors.background }]}
        contentContainerStyle={[
          styles.centerContainer,
          { paddingTop: insets.top + 60, paddingBottom: insets.bottom + 24 },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={theme.colors.primary}
          />
        }
      >
        <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
          No activity yet
        </Text>
        <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
          Follow users and repositories to see their commit activity here
        </Text>
      </ScrollView>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + 12,
            backgroundColor: theme.colors.background,
          },
        ]}
      >
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
          Activity
        </Text>
        <Text style={[styles.headerSubtitle, { color: theme.colors.textSecondary }]}>
          Last 24 hours
        </Text>
      </View>

      {/* Heatmap */}
      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 80 },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={theme.colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heatmapContainer}>
          <HourlyActivityHeatmap
            commits={commits}
            loading={loading}
            onBlockClick={handleBlockClick}
            selectedAuthorLogins={selectedAuthorLogins}
            selectedRepoIds={selectedRepoIds}
          />
        </View>
      </ScrollView>

      {/* Floating filter panel (expanded) */}
      {filterPanelOpen && (
        <View
          style={[
            styles.filterPanel,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
              bottom: insets.bottom + 60,
            },
          ]}
        >
          {/* Me button */}
          {user?.login && (
            <Pressable
              style={[
                styles.filterOption,
                selectedAuthorLogins?.length === 1 &&
                  selectedAuthorLogins[0] === user.login &&
                  selectedRepoIds === null && {
                    backgroundColor: theme.colors.primary + '20',
                  },
              ]}
              onPress={selectMe}
            >
              {user.avatar_url && (
                <Image
                  source={{ uri: user.avatar_url }}
                  style={styles.filterAvatar}
                />
              )}
              <Text style={[styles.filterOptionText, { color: theme.colors.text }]}>
                Me
              </Text>
            </Pressable>
          )}

          {/* Separator */}
          <View style={[styles.filterSeparator, { backgroundColor: theme.colors.border }]} />

          {/* Authors section */}
          <Text style={[styles.filterSectionTitle, { color: theme.colors.textMuted }]}>
            Authors
          </Text>
          <GHScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filterChipsScroll}
            contentContainerStyle={styles.filterChipsContent}
          >
            {authors
              .filter((a) => a.login !== user?.login)
              .map((author) => (
                <Pressable
                  key={author.login}
                  style={[
                    styles.filterChip,
                    { borderColor: theme.colors.border },
                    selectedAuthorLogins?.includes(author.login) && {
                      backgroundColor: theme.colors.primary + '20',
                      borderColor: theme.colors.primary,
                    },
                  ]}
                  onPress={() => toggleAuthorFilter(author.login)}
                >
                  {author.avatarUrl && (
                    <Image
                      source={{ uri: author.avatarUrl }}
                      style={styles.filterChipAvatar}
                    />
                  )}
                  <Text
                    style={[
                      styles.filterChipText,
                      { color: theme.colors.text },
                      selectedAuthorLogins?.includes(author.login) && {
                        color: theme.colors.primary,
                      },
                    ]}
                    numberOfLines={1}
                  >
                    {author.login}
                  </Text>
                </Pressable>
              ))}
          </GHScrollView>

          {/* Repos section */}
          <Text style={[styles.filterSectionTitle, { color: theme.colors.textMuted }]}>
            Repositories
          </Text>
          <GHScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filterChipsScroll}
            contentContainerStyle={styles.filterChipsContent}
          >
            {repos.map((repo) => (
              <Pressable
                key={repo.id}
                style={[
                  styles.filterChip,
                  { borderColor: theme.colors.border },
                  selectedRepoIds?.includes(repo.id) && {
                    backgroundColor: theme.colors.primary + '20',
                    borderColor: theme.colors.primary,
                  },
                ]}
                onPress={() => toggleRepoFilter(repo.id)}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    { color: theme.colors.text },
                    selectedRepoIds?.includes(repo.id) && {
                      color: theme.colors.primary,
                    },
                  ]}
                  numberOfLines={1}
                >
                  {repo.name}
                </Text>
              </Pressable>
            ))}
          </GHScrollView>

          {/* Clear filters */}
          {hasActiveFilter && (
            <Pressable style={styles.clearButton} onPress={clearFilters}>
              <Text style={[styles.clearButtonText, { color: theme.colors.error }]}>
                Clear filters
              </Text>
            </Pressable>
          )}
        </View>
      )}

      {/* Floating filter button */}
      <Pressable
        style={[
          styles.filterButton,
          {
            backgroundColor: hasActiveFilter ? theme.colors.primary : theme.colors.surface,
            borderColor: theme.colors.border,
            bottom: insets.bottom + 16,
          },
        ]}
        onPress={() => setFilterPanelOpen(!filterPanelOpen)}
      >
        <Text
          style={[
            styles.filterButtonText,
            { color: hasActiveFilter ? '#fff' : theme.colors.text },
          ]}
        >
          {getFilterLabel}
        </Text>
      </Pressable>

      {/* Block commits sheet */}
      <BlockCommitsSheet
        visible={sheetVisible}
        onClose={handleSheetClose}
        startTime={selectedBlockStart}
        endTime={selectedBlockEnd}
        githubToken={token}
        expectedCount={selectedBlockCount}
      />
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
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  heatmapContainer: {
    flex: 1,
    minHeight: 500,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    maxWidth: 280,
  },
  // Floating filter button
  filterButton: {
    position: 'absolute',
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  // Filter panel
  filterPanel: {
    position: 'absolute',
    left: 16,
    right: 16,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
    maxHeight: 300,
  },
  filterOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 8,
  },
  filterAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  filterOptionText: {
    fontSize: 14,
    fontWeight: '500',
  },
  filterSeparator: {
    height: 1,
    marginVertical: 8,
  },
  filterSectionTitle: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 8,
    marginTop: 4,
  },
  filterChipsScroll: {
    marginBottom: 8,
  },
  filterChipsContent: {
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 16,
    borderWidth: 1,
    gap: 6,
  },
  filterChipAvatar: {
    width: 18,
    height: 18,
    borderRadius: 9,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '500',
    maxWidth: 100,
  },
  clearButton: {
    alignItems: 'center',
    paddingVertical: 8,
    marginTop: 4,
  },
  clearButtonText: {
    fontSize: 13,
    fontWeight: '500',
  },
});

export default ActivityTabScreen;
