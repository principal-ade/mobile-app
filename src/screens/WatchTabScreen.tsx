/**
 * Watch Tab Screen
 *
 * Shows repository and user activity cards sorted by most recent activity.
 * Features tabs to switch between viewing repos and users.
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  RefreshControl,
  ScrollView,
  FlatList,
  Dimensions,
} from 'react-native';
import { TabView, TabBar, SceneMap, Route } from 'react-native-tab-view';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '@principal-ade/industry-theme';
import { useAuth } from '../hooks/useAuth';
import { useFeedPreferences } from '../context/FeedPreferencesContext';
import { ActivityRepoCard } from '../components/ActivityFeed/ActivityRepoCard';
import { UserCard } from '../components/ActivityFeed/UserCard';
import { LoadingSpinner } from '../components/LoadingSpinner';
import {
  getActivityHeatmap,
  getWatches,
  HeatmapCommit,
  HeatmapAuthor,
  HeatmapRepo,
  FeedWatches,
} from '../services/FeedApiService';
import { saveWatchedUsers, saveWatchedRepos } from '../utils/feedStorage';

interface RepoActivityData {
  repoId: string;
  owner: string;
  name: string;
  commitCount: number;
  latestCommitTime?: string;
  latestCommitAuthor?: {
    login: string;
    avatarUrl?: string;
  };
  latestCommitMessage?: string;
}

interface RepoContribution {
  repoId: string;
  commitCount: number;
  latestCommitTime: string;
}

interface UserActivityData {
  login: string;
  avatarUrl?: string;
  commitCount: number;
  latestCommitTime?: string;
  reposContributedTo: RepoContribution[];
}

export function WatchTabScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { isAuthenticated, token } = useAuth();
  const { version, watchedUsers, watchedRepos } = useFeedPreferences();

  const { width } = Dimensions.get('window');
  const [tabIndex, setTabIndex] = useState(0);
  const [routes] = useState([
    { key: 'users', title: 'Developers' },
    { key: 'repos', title: 'Projects' },
  ]);
  const [commits, setCommits] = useState<HeatmapCommit[]>([]);
  const [authors, setAuthors] = useState<HeatmapAuthor[]>([]);
  const [repos, setRepos] = useState<HeatmapRepo[]>([]);
  const [follows, setFollows] = useState<FeedWatches | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

      // Fetch both activity and follows in parallel
      const [activityResponse, followsResponse] = await Promise.all([
        getActivityHeatmap(token, { hoursBack: 24 }),
        getWatches(token),
      ]);

      setCommits(activityResponse.commits);
      setAuthors(activityResponse.authors);
      setRepos(activityResponse.repos);
      setFollows(followsResponse);

      // Sync API watches to local storage (without triggering version increment)
      saveWatchedUsers(followsResponse.watchedUsers).catch(console.error);
      saveWatchedRepos(followsResponse.watchedRepos).catch(console.error);

      hasFetched.current = true;
      lastFetchTime.current = now;
      versionAtLastFetch.current = version;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load activity');
    } finally {
      setLoading(false);
    }
  }, [token, version]);

  // Fetch on initial mount and when returning to screen if version changed
  useFocusEffect(
    useCallback(() => {
      if (!hasFetched.current) {
        // Initial fetch
        fetchActivity();
      } else if (versionAtLastFetch.current !== version) {
        // Refetch if version changed while away
        fetchActivity(true);
      }
    }, [fetchActivity, version])
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchActivity(true);
    setRefreshing(false);
  }, [fetchActivity]);

  // Process repos data for display
  const repoActivityData: RepoActivityData[] = React.useMemo(() => {
    // Use API watches if available, otherwise use context (local storage)
    const activeWatchedRepos = follows?.watchedRepos ?? watchedRepos;

    // Group commits by repo
    const repoCommitsMap = new Map<string, HeatmapCommit[]>();
    commits.forEach(commit => {
      const existing = repoCommitsMap.get(commit.repoId) || [];
      repoCommitsMap.set(commit.repoId, [...existing, commit]);
    });

    // Create a map of repo metadata from the API response
    const repoMetadataMap = new Map(repos.map(r => [`${r.owner}/${r.name}`.toLowerCase(), r]));

    // Create repo activity data for ALL watched repos
    const repoData: RepoActivityData[] = activeWatchedRepos.map(watchedRepo => {
      const repoIdKey = `${watchedRepo.owner}/${watchedRepo.repo}`.toLowerCase();
      const repoMetadata = repoMetadataMap.get(repoIdKey);

      // Find commits by matching owner/repo from the metadata map
      const repoCommits: HeatmapCommit[] = [];
      if (repoMetadata) {
        const commits = repoCommitsMap.get(repoMetadata.id) || [];
        repoCommits.push(...commits);
      }

      if (repoCommits.length === 0) {
        // Repo has no activity in the time window
        return {
          repoId: `${watchedRepo.owner}/${watchedRepo.repo}`,
          owner: watchedRepo.owner,
          name: watchedRepo.repo,
          commitCount: 0,
          latestCommitTime: undefined,
          latestCommitAuthor: undefined,
          latestCommitMessage: undefined,
        };
      }

      // Sort commits by timestamp (most recent first)
      const sortedCommits = [...repoCommits].sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      const latestCommit = sortedCommits[0];

      return {
        repoId: repoMetadata?.id || `${watchedRepo.owner}/${watchedRepo.repo}`,
        owner: watchedRepo.owner,
        name: watchedRepo.repo,
        commitCount: repoCommits.length,
        latestCommitTime: latestCommit.timestamp,
        latestCommitAuthor: latestCommit.authorLogin ? {
          login: latestCommit.authorLogin,
          avatarUrl: latestCommit.authorAvatarUrl,
        } : undefined,
        latestCommitMessage: undefined,
      };
    });

    // Sort by most recent activity (repos without activity go to the end)
    return repoData.sort((a, b) => {
      // Repos without activity go to the end
      if (a.commitCount === 0 && b.commitCount === 0) {
        return `${a.owner}/${a.name}`.localeCompare(`${b.owner}/${b.name}`); // Alphabetical for repos without activity
      }
      if (a.commitCount === 0) return 1;
      if (b.commitCount === 0) return -1;

      // Sort by most recent activity
      const aTime = a.latestCommitTime ? new Date(a.latestCommitTime).getTime() : 0;
      const bTime = b.latestCommitTime ? new Date(b.latestCommitTime).getTime() : 0;
      return bTime - aTime;
    });
  }, [commits, repos, watchedRepos, follows]);

  // Process users data for display
  const userActivityData: UserActivityData[] = React.useMemo(() => {
    // Use API watches if available, otherwise use context (local storage)
    const activeWatchedUsers = follows?.watchedUsers ?? watchedUsers;

    // Group commits by author (use lowercase for case-insensitive matching)
    const authorCommitsMap = new Map<string, HeatmapCommit[]>();
    commits.forEach(commit => {
      const loginKey = commit.authorLogin.toLowerCase();
      const existing = authorCommitsMap.get(loginKey) || [];
      authorCommitsMap.set(loginKey, [...existing, commit]);
    });

    // Create a map of author metadata from the API response (use lowercase keys)
    const authorMetadataMap = new Map(authors.map(a => [a.login.toLowerCase(), a]));

    // Create user activity data for ALL watched users
    const userData: UserActivityData[] = activeWatchedUsers.map(watchedUser => {
      const loginKey = watchedUser.login.toLowerCase();
      const authorCommits = authorCommitsMap.get(loginKey) || [];
      const authorMetadata = authorMetadataMap.get(loginKey);

      if (authorCommits.length === 0) {
        // User has no activity in the time window
        return {
          login: watchedUser.login,
          avatarUrl: watchedUser.avatarUrl || `https://github.com/${watchedUser.login}.png`,
          commitCount: 0,
          latestCommitTime: '', // No activity
          reposContributedTo: [],
        };
      }

      // Sort commits by timestamp (most recent first)
      const sortedCommits = [...authorCommits].sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      const latestCommit = sortedCommits[0];

      // Group commits by repo and calculate per-repo stats
      const repoCommitsMap = new Map<string, HeatmapCommit[]>();
      authorCommits.forEach(commit => {
        const existing = repoCommitsMap.get(commit.repoId) || [];
        repoCommitsMap.set(commit.repoId, [...existing, commit]);
      });

      const repoContributions: RepoContribution[] = Array.from(repoCommitsMap.entries()).map(([repoId, commits]) => {
        const sortedRepoCommits = [...commits].sort(
          (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
        return {
          repoId,
          commitCount: commits.length,
          latestCommitTime: sortedRepoCommits[0].timestamp,
        };
      }).sort((a, b) =>
        // Sort repos by most recent activity
        new Date(b.latestCommitTime).getTime() - new Date(a.latestCommitTime).getTime()
      );

      return {
        login: watchedUser.login,
        avatarUrl: authorMetadata?.avatarUrl || watchedUser.avatarUrl || `https://github.com/${watchedUser.login}.png`,
        commitCount: authorCommits.length,
        latestCommitTime: latestCommit.timestamp,
        reposContributedTo: repoContributions,
      };
    });

    // Sort by most recent activity (users without activity go to the end)
    return userData.sort((a, b) => {
      // Users without activity go to the end
      if (a.commitCount === 0 && b.commitCount === 0) {
        return a.login.localeCompare(b.login); // Alphabetical for users without activity
      }
      if (a.commitCount === 0) return 1;
      if (b.commitCount === 0) return -1;

      // Sort by most recent activity
      const aTime = a.latestCommitTime ? new Date(a.latestCommitTime).getTime() : 0;
      const bTime = b.latestCommitTime ? new Date(b.latestCommitTime).getTime() : 0;
      return bTime - aTime;
    });
  }, [commits, authors, watchedUsers, follows]);

  // Scene components for TabView
  const ReposScene = () => (
    <FlatList
      data={repoActivityData}
      keyExtractor={(item) => item.repoId}
      renderItem={({ item }) => <ActivityRepoCard {...item} />}
      contentContainerStyle={[
        styles.listContent,
        { paddingBottom: insets.bottom + 24 },
      ]}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor={theme.colors.primary}
        />
      }
      showsVerticalScrollIndicator={false}
      ListEmptyComponent={
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
            No repositories being watched
          </Text>
        </View>
      }
    />
  );

  const UsersScene = () => (
    <FlatList
      data={userActivityData}
      keyExtractor={(item) => item.login}
      renderItem={({ item }) => <UserCard {...item} />}
      contentContainerStyle={[
        styles.listContent,
        { paddingBottom: insets.bottom + 24 },
      ]}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor={theme.colors.primary}
        />
      }
      showsVerticalScrollIndicator={false}
      ListEmptyComponent={
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
            No users being watched
          </Text>
        </View>
      }
    />
  );

  const renderScene = SceneMap({
    repos: ReposScene,
    users: UsersScene,
  });

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
  const activeWatchedUsers = follows?.watchedUsers ?? watchedUsers;
  const activeWatchedRepos = follows?.watchedRepos ?? watchedRepos;
  if (activeWatchedUsers.length === 0 && activeWatchedRepos.length === 0) {
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

      {/* Tabs with Swipe Support */}
      <TabView
        navigationState={{ index: tabIndex, routes }}
        renderScene={renderScene}
        onIndexChange={setTabIndex}
        initialLayout={{ width }}
        renderTabBar={(props) => (
          <TabBar
            {...props}
            indicatorStyle={{ backgroundColor: theme.colors.primary }}
            style={{ backgroundColor: theme.colors.background }}
            activeColor={theme.colors.text}
            inactiveColor={theme.colors.textSecondary}
            // @ts-expect-error - renderLabel exists in react-native-tab-view but may not be in type definitions
            renderLabel={({ route, focused }: { route: Route; focused: boolean }) => (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text
                  style={{
                    color: focused ? theme.colors.primary : theme.colors.textSecondary,
                    fontSize: 15,
                    fontWeight: focused ? '600' : '500',
                  }}
                >
                  {route.title}
                </Text>
                <View
                  style={[
                    styles.countBadge,
                    {
                      backgroundColor: focused
                        ? theme.colors.primary
                        : theme.colors.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.countText,
                      {
                        color: focused ? '#fff' : theme.colors.textSecondary,
                      },
                    ]}
                  >
                    {route.key === 'users'
                      ? userActivityData.length
                      : repoActivityData.length}
                  </Text>
                </View>
              </View>
            )}
          />
        )}
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
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  countBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 24,
    alignItems: 'center',
  },
  countText: {
    fontSize: 12,
    fontWeight: '600',
  },
  listContent: {
    paddingTop: 12,
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
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
  },
});

export default WatchTabScreen;
