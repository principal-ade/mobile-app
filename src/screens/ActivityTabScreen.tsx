/**
 * Activity Tab Screen
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
  Pressable,
  FlatList,
} from 'react-native';
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
  getFollows,
  HeatmapCommit,
  HeatmapAuthor,
  HeatmapRepo,
  FeedFollows,
} from '../services/FeedApiService';

type Tab = 'repos' | 'users';

interface RepoActivityData {
  repoId: string;
  owner: string;
  name: string;
  commitCount: number;
  latestCommitTime: string;
  latestCommitAuthor?: {
    login: string;
    avatarUrl?: string;
  };
  latestCommitMessage?: string;
}

interface UserActivityData {
  login: string;
  avatarUrl?: string;
  commitCount: number;
  latestCommitTime: string;
  reposContributedTo: string[];
}

export function ActivityTabScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { isAuthenticated, token } = useAuth();
  const { version } = useFeedPreferences();

  const [activeTab, setActiveTab] = useState<Tab>('repos');
  const [commits, setCommits] = useState<HeatmapCommit[]>([]);
  const [authors, setAuthors] = useState<HeatmapAuthor[]>([]);
  const [repos, setRepos] = useState<HeatmapRepo[]>([]);
  const [follows, setFollows] = useState<FeedFollows | null>(null);
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
        getFollows(token),
      ]);

      setCommits(activityResponse.commits);
      setAuthors(activityResponse.authors);
      setRepos(activityResponse.repos);
      setFollows(followsResponse);
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

  // Process repos data for display
  const repoActivityData: RepoActivityData[] = React.useMemo(() => {
    if (!follows) return [];

    // Create a set of followed repo IDs for fast lookup
    const followedRepoIds = new Set(
      follows.followedRepos.map(fr => `${fr.owner}/${fr.repo}`)
    );

    // Group commits by repo
    const repoCommitsMap = new Map<string, HeatmapCommit[]>();
    commits.forEach(commit => {
      const existing = repoCommitsMap.get(commit.repoId) || [];
      repoCommitsMap.set(commit.repoId, [...existing, commit]);
    });

    // Create repo activity data - only for followed repos
    const repoData: RepoActivityData[] = [];
    repos.forEach(repo => {
      // Skip repos that are not followed
      if (!followedRepoIds.has(repo.id)) return;

      const repoCommits = repoCommitsMap.get(repo.id) || [];
      if (repoCommits.length === 0) return;

      // Sort commits by timestamp (most recent first)
      const sortedCommits = [...repoCommits].sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      const latestCommit = sortedCommits[0];

      repoData.push({
        repoId: repo.id,
        owner: repo.owner,
        name: repo.name,
        commitCount: repoCommits.length,
        latestCommitTime: latestCommit.timestamp,
        latestCommitAuthor: latestCommit.authorLogin ? {
          login: latestCommit.authorLogin,
          avatarUrl: latestCommit.authorAvatarUrl,
        } : undefined,
        latestCommitMessage: undefined,
      });
    });

    // Sort by most recent activity
    return repoData.sort(
      (a, b) => new Date(b.latestCommitTime).getTime() - new Date(a.latestCommitTime).getTime()
    );
  }, [commits, repos, follows]);

  // Process users data for display
  const userActivityData: UserActivityData[] = React.useMemo(() => {
    if (!follows) return [];

    // Create a set of followed user logins for fast lookup
    const followedUserLogins = new Set(
      follows.followedUsers.map(fu => fu.login)
    );

    // Group commits by author
    const authorCommitsMap = new Map<string, HeatmapCommit[]>();
    commits.forEach(commit => {
      const existing = authorCommitsMap.get(commit.authorLogin) || [];
      authorCommitsMap.set(commit.authorLogin, [...existing, commit]);
    });

    // Create user activity data - only for followed users
    const userData: UserActivityData[] = [];
    authors.forEach(author => {
      // Skip users that are not followed
      if (!followedUserLogins.has(author.login)) return;

      const authorCommits = authorCommitsMap.get(author.login) || [];
      if (authorCommits.length === 0) return;

      // Sort commits by timestamp (most recent first)
      const sortedCommits = [...authorCommits].sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      const latestCommit = sortedCommits[0];

      // Get unique repos this user contributed to
      const uniqueRepos = Array.from(new Set(authorCommits.map(c => c.repoId)));

      userData.push({
        login: author.login,
        avatarUrl: author.avatarUrl,
        commitCount: authorCommits.length,
        latestCommitTime: latestCommit.timestamp,
        reposContributedTo: uniqueRepos,
      });
    });

    // Sort by most recent activity
    return userData.sort(
      (a, b) => new Date(b.latestCommitTime).getTime() - new Date(a.latestCommitTime).getTime()
    );
  }, [commits, authors, follows]);

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

      {/* Tabs */}
      <View style={[styles.tabsContainer, { borderBottomColor: theme.colors.border }]}>
        <Pressable
          style={[
            styles.tab,
            activeTab === 'repos' && [
              styles.activeTab,
              { borderBottomColor: theme.colors.primary },
            ],
          ]}
          onPress={() => setActiveTab('repos')}
        >
          <Text
            style={[
              styles.tabText,
              { color: theme.colors.textSecondary },
              activeTab === 'repos' && [
                styles.activeTabText,
                { color: theme.colors.primary },
              ],
            ]}
          >
            Repositories
          </Text>
          <View
            style={[
              styles.countBadge,
              { backgroundColor: activeTab === 'repos' ? theme.colors.primary : theme.colors.border },
            ]}
          >
            <Text
              style={[
                styles.countText,
                { color: activeTab === 'repos' ? '#fff' : theme.colors.textSecondary },
              ]}
            >
              {repoActivityData.length}
            </Text>
          </View>
        </Pressable>

        <Pressable
          style={[
            styles.tab,
            activeTab === 'users' && [
              styles.activeTab,
              { borderBottomColor: theme.colors.primary },
            ],
          ]}
          onPress={() => setActiveTab('users')}
        >
          <Text
            style={[
              styles.tabText,
              { color: theme.colors.textSecondary },
              activeTab === 'users' && [
                styles.activeTabText,
                { color: theme.colors.primary },
              ],
            ]}
          >
            Users
          </Text>
          <View
            style={[
              styles.countBadge,
              { backgroundColor: activeTab === 'users' ? theme.colors.primary : theme.colors.border },
            ]}
          >
            <Text
              style={[
                styles.countText,
                { color: activeTab === 'users' ? '#fff' : theme.colors.textSecondary },
              ]}
            >
              {userActivityData.length}
            </Text>
          </View>
        </Pressable>
      </View>

      {/* Content - Repos Tab */}
      {activeTab === 'repos' && (
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
                No repository activity in the last 24 hours
              </Text>
            </View>
          }
        />
      )}

      {/* Content - Users Tab */}
      {activeTab === 'users' && (
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
                No user activity in the last 24 hours
              </Text>
            </View>
          }
        />
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
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
    marginRight: 24,
    gap: 8,
  },
  activeTab: {
    borderBottomWidth: 2,
  },
  tabText: {
    fontSize: 15,
    fontWeight: '500',
  },
  activeTabText: {
    fontWeight: '600',
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

export default ActivityTabScreen;
