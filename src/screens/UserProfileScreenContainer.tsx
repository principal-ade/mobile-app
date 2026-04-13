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
  type GitHubUserProfile,
  type UserActivityResponse,
  type ActivityEvent,
} from '../services/GitHubSearchService';
import { useFeedPreferences } from '../context/FeedPreferencesContext';

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
  const navigation = useNavigation();
  const { username } = route.params;

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userData, setUserData] = useState<GitHubUserProfile | null>(null);
  const [activityData, setActivityData] = useState<UserActivityResponse | null>(null);

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

  useEffect(() => {
    async function fetchUserData() {
      setIsLoading(true);
      setError(null);

      try {
        // Fetch profile first to show UI immediately
        const profile = await getUserProfile(username);
        setUserData(profile);
        setIsLoading(false);

        // Then fetch activity data in the background
        // Request 150 days (5 months) of contribution data for the heatmap
        // Request 1 day of activity events for recent activity section
        const activity = await getUserActivity(username, 150, 1);
        setActivityData(activity);
      } catch (err) {
        console.error('Error fetching user profile:', err);
        setError(err instanceof Error ? err.message : 'Failed to load user profile');
        setIsLoading(false);
      }
    }

    fetchUserData();
  }, [username]);

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

              const activity = await getUserActivity(username, 150, 1);
              setActivityData(activity);
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
      onClose={() => navigation.goBack()}
      onWatchPress={handleToggleWatch}
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
