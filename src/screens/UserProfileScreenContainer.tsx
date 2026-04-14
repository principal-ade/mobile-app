/**
 * UserProfileScreenContainer
 *
 * Container component that fetches user data from GitHub API
 * and renders the UserProfileScreen component.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { useTheme } from '@principal-ade/industry-theme';
import { UserProfileScreen, type HourlyActivityGroup } from './UserProfileScreen';
import type { FeedStackParamList } from '../navigation/types';
import {
  getUserProfile,
  getUserActivity,
  getPinnedRepositories,
  type GitHubUserProfile,
  type UserActivityResponse,
  type ActivityEvent,
} from '../services/GitHubSearchService';
import { useFeedPreferences } from '../context/FeedPreferencesContext';
import { fetchUserRepositories, fetchOrganizationsForUser } from '../services/GithubService';
import { GitHubRepository, GitHubOrganization } from '../types/github';
import { useAuthContext } from '../context/AuthContext';

type UserProfileRouteProp = RouteProp<FeedStackParamList, 'UserProfile'>;

/**
 * Transform activity events into hourly groups for display
 * Groups commit events by hour and repository
 */
function transformActivityToHourlyGroups(activity: ActivityEvent[]): HourlyActivityGroup[] {
  const now = new Date();

  // Filter to only commit events (backend already filtered to requested days)
  const commits = activity.filter(event => event.type === 'commit');

  // Group by hour and repository
  const groups = new Map<string, HourlyActivityGroup>();

  for (const event of commits) {
    const timestamp = new Date(event.timestamp);
    const hourBucket = new Date(timestamp);
    hourBucket.setMinutes(0, 0, 0);

    const hour = hourBucket.getHours();
    const dateStr = hourBucket.toISOString().split('T')[0];
    const hourStr = hour.toString().padStart(2, '0');
    const groupKey = `${dateStr}:${hourStr}:${event.repository}`;

    // Calculate hours ago
    const hoursAgo = Math.floor((now.getTime() - hourBucket.getTime()) / (1000 * 60 * 60));

    // Parse repository owner from "owner/repo" format
    const [repoOwner, repoName] = event.repository.split('/');

    if (!groups.has(groupKey)) {
      groups.set(groupKey, {
        id: groupKey,
        repo: event.repository,
        repoOwner: repoOwner || '',
        repoOwnerAvatar: `https://github.com/${repoOwner}.png`,
        repoOwnerType: event.ownerType,
        hour,
        hourBucket: hourBucket.toISOString(),
        hoursAgo,
        commits: [],
        commitCount: 0,
        totalAdditions: 0,
        totalDeletions: 0,
      });
    }

    const group = groups.get(groupKey)!;
    group.commitCount += event.metadata?.commitCount || 1;
    group.totalAdditions += event.metadata?.additions || 0;
    group.totalDeletions += event.metadata?.deletions || 0;
  }

  // Sort by timestamp descending (most recent first)
  return Array.from(groups.values()).sort((a, b) =>
    new Date(b.hourBucket).getTime() - new Date(a.hourBucket).getTime()
  );
}

export function UserProfileScreenContainer() {
  const { theme } = useTheme();
  const route = useRoute<UserProfileRouteProp>();
  const navigation = useNavigation<any>();
  const { username, isOrganization = false } = route.params;
  const { token } = useAuthContext();

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userData, setUserData] = useState<GitHubUserProfile | null>(null);
  const [activityData, setActivityData] = useState<UserActivityResponse | null>(null);
  const [repositories, setRepositories] = useState<GitHubRepository[]>([]);
  const [pinnedRepoNames, setPinnedRepoNames] = useState<string[]>([]);
  const [organizations, setOrganizations] = useState<GitHubOrganization[]>([]);

  // Feed preferences for watching users
  const { watchedUsers, addUser, removeUser } = useFeedPreferences();

  // Check if user is being watched
  const isWatching = useMemo(() => {
    return watchedUsers.some((u) => u.login.toLowerCase() === username.toLowerCase());
  }, [watchedUsers, username]);

  // Toggle watch state
  const handleToggleWatch = () => {
    if (isWatching) {
      removeUser(username);
    } else {
      addUser({
        login: username,
        watchedAt: new Date().toISOString(),
        avatarUrl: userData?.avatar_url,
      });
    }
  };

  // Navigate to repo screen
  const handleRepoPress = (owner: string, name: string, fullName: string) => {
    navigation.navigate('RepoFileCity', {
      owner,
      name,
      fullName,
    });
  };

  // Navigate to organization screen
  const handleOrgPress = (orgLogin: string) => {
    navigation.navigate('Organization', {
      orgLogin,
    });
  };

  // Navigate to owner profile (user or organization)
  const handleOwnerPress = (ownerLogin: string, ownerType?: 'User' | 'Organization') => {
    navigation.navigate('UserProfile', {
      username: ownerLogin,
      isOrganization: ownerType === 'Organization',
    });
  };

  useEffect(() => {
    async function fetchUserData() {
      setIsLoading(true);
      setError(null);

      try {
        // Fetch profile first to show UI immediately
        const profile = await getUserProfile(username);
        setUserData(profile);
        setIsLoading(false);

        // Then fetch activity data, repos, orgs, and pinned repos in parallel
        // Request 150 days (5 months) of contribution data for the heatmap
        // Request 1 day of activity events for recent activity section
        // Skip activity for organizations (they don't have personal contributions)
        const [activity, repos, orgs, pinnedRepoNames] = await Promise.allSettled([
          isOrganization ? Promise.resolve({ user: { login: username, name: null, avatarUrl: profile.avatar_url, followersCount: 0 }, activity: [], contributions: [], contributedRepos: [] }) : getUserActivity(username, 150, 1),
          token ? fetchUserRepositories(token, username) : Promise.resolve([]),
          token ? fetchOrganizationsForUser(token, username) : Promise.resolve([]),
          getPinnedRepositories(username),
        ]);

        if (activity.status === 'fulfilled') {
          setActivityData(activity.value);
        }
        if (repos.status === 'fulfilled') {
          const pinnedNames = pinnedRepoNames.status === 'fulfilled' ? pinnedRepoNames.value : [];
          setPinnedRepoNames(pinnedNames);

          // Separate pinned and non-pinned repos
          const pinned: GitHubRepository[] = [];
          const nonPinned: GitHubRepository[] = [];

          repos.value.forEach(repo => {
            if (pinnedNames.includes(repo.full_name)) {
              pinned.push(repo);
            } else {
              nonPinned.push(repo);
            }
          });

          // Sort non-pinned by updated_at (most recent first)
          const sortedNonPinned = nonPinned.sort((a, b) =>
            new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
          );

          // Sort pinned repos by the order they appear in pinnedNames
          const sortedPinned = pinned.sort((a, b) => {
            const aIndex = pinnedNames.indexOf(a.full_name);
            const bIndex = pinnedNames.indexOf(b.full_name);
            return aIndex - bIndex;
          });

          // Pinned repos first, then sorted repos
          setRepositories([...sortedPinned, ...sortedNonPinned]);
        }
        if (orgs.status === 'fulfilled') {
          setOrganizations(orgs.value);
        }
      } catch (err) {
        console.error('Error fetching user profile:', err);
        setError(err instanceof Error ? err.message : 'Failed to load user profile');
        setIsLoading(false);
      }
    }

    fetchUserData();
  }, [username, token, isOrganization]);

  if (error) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <Text style={[styles.errorText, { color: theme.colors.error }]}>{error}</Text>
        <TouchableOpacity
          style={[styles.retryButton, { backgroundColor: theme.colors.primary }]}
          onPress={async () => {
            setError(null);
            setIsLoading(true);
            try {
              const profile = await getUserProfile(username);
              setUserData(profile);
              setIsLoading(false);

              const [activity, repos, orgs, pinnedRepoNames] = await Promise.allSettled([
                isOrganization ? Promise.resolve({ user: { login: username, name: null, avatarUrl: profile.avatar_url, followersCount: 0 }, activity: [], contributions: [], contributedRepos: [] }) : getUserActivity(username, 150, 1),
                token ? fetchUserRepositories(token, username) : Promise.resolve([]),
                token ? fetchOrganizationsForUser(token, username) : Promise.resolve([]),
                getPinnedRepositories(username),
              ]);

              if (activity.status === 'fulfilled') {
                setActivityData(activity.value);
              }
              if (repos.status === 'fulfilled') {
                const pinnedNames = pinnedRepoNames.status === 'fulfilled' ? pinnedRepoNames.value : [];
                setPinnedRepoNames(pinnedNames);

                // Separate pinned and non-pinned repos
                const pinned: GitHubRepository[] = [];
                const nonPinned: GitHubRepository[] = [];

                repos.value.forEach(repo => {
                  if (pinnedNames.includes(repo.full_name)) {
                    pinned.push(repo);
                  } else {
                    nonPinned.push(repo);
                  }
                });

                // Sort non-pinned by updated_at (most recent first)
                const sortedNonPinned = nonPinned.sort((a, b) =>
                  new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
                );

                // Sort pinned repos by the order they appear in pinnedNames
                const sortedPinned = pinned.sort((a, b) => {
                  const aIndex = pinnedNames.indexOf(a.full_name);
                  const bIndex = pinnedNames.indexOf(b.full_name);
                  return aIndex - bIndex;
                });

                // Pinned repos first, then sorted repos
                setRepositories([...sortedPinned, ...sortedNonPinned]);
              }
              if (orgs.status === 'fulfilled') {
                setOrganizations(orgs.value);
              }
            } catch (err) {
              setError(err instanceof Error ? err.message : 'Failed to load');
              setIsLoading(false);
            }
          }}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <UserProfileScreen
      loading={!userData}
      avatarUrl={userData?.avatar_url}
      name={userData?.name || userData?.login}
      username={userData?.login}
      twitterHandle={userData?.twitter_username || undefined}
      bio={userData?.bio || undefined}
      contributions={activityData?.contributions || []}
      recentActivity={activityData ? transformActivityToHourlyGroups(activityData.activity) : []}
      contributedRepos={activityData?.contributedRepos || []}
      repositories={repositories}
      pinnedRepoNames={pinnedRepoNames}
      organizations={organizations}
      onClose={() => navigation.goBack()}
      onWatchPress={handleToggleWatch}
      onRepoPress={handleRepoPress}
      onOrgPress={handleOrgPress}
      onOwnerPress={handleOwnerPress}
      isWatching={isWatching}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    paddingHorizontal: 40,
    marginBottom: 20,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
