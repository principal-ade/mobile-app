import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { useTheme } from '@principal-ade/industry-theme';
import { useNavigation } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';
import type { WatchStackParamList } from '../../navigation/types';
import { LucideIcon } from '../LucideIcon';

export interface UserCardProps {
  login: string;
  avatarUrl?: string;
  commitCount: number;
  latestCommitTime?: string;
  reposContributedTo: string[];
}

export function UserCard({
  login,
  avatarUrl,
  commitCount,
  latestCommitTime,
  reposContributedTo,
}: UserCardProps) {
  const { theme } = useTheme();
  const navigation = useNavigation<NavigationProp<WatchStackParamList>>();
  const [isExpanded, setIsExpanded] = useState(false);

  const handleAvatarPress = () => {
    navigation.navigate('UserProfile', { username: login });
  };

  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) {
      return `${diffMins}m ago`;
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else {
      return `${diffDays}d ago`;
    }
  };

  return (
    <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
      <View style={styles.leftSection}>
        <TouchableOpacity onPress={handleAvatarPress}>
          <Image
            source={{ uri: avatarUrl || `https://github.com/${login}.png` }}
            style={styles.avatar}
          />
        </TouchableOpacity>
        <View style={styles.userInfo}>
          <Text style={[styles.username, { color: theme.colors.text }]}>
            {login}
          </Text>
          <Text style={[styles.commitCount, { color: theme.colors.textSecondary }]}>
            {commitCount === 0
              ? 'No recent activity'
              : `${commitCount} commit${commitCount !== 1 ? 's' : ''}`
            }
          </Text>
        </View>
      </View>

      <View style={styles.rightSection}>
        {latestCommitTime && (
          <Text style={[styles.time, { color: theme.colors.textSecondary }]}>
            {formatTime(latestCommitTime)}
          </Text>
        )}
        {reposContributedTo.length > 0 && (
          <TouchableOpacity
            style={styles.reposToggle}
            onPress={() => setIsExpanded(!isExpanded)}
            activeOpacity={0.7}
          >
            <Text style={[styles.reposCount, { color: theme.colors.textSecondary }]}>
              {reposContributedTo.length} {reposContributedTo.length === 1 ? 'repo' : 'repos'}
            </Text>
            <LucideIcon
              name={isExpanded ? 'ChevronUp' : 'ChevronDown'}
              size={16}
              color={theme.colors.textSecondary}
            />
          </TouchableOpacity>
        )}
      </View>
      {isExpanded && reposContributedTo.length > 0 && (
        <View style={styles.expandedRepos}>
          {reposContributedTo.map((repo) => {
            const [owner, name] = repo.split('/');
            return (
              <TouchableOpacity
                key={repo}
                style={[styles.repoCard, { backgroundColor: theme.colors.background }]}
                onPress={() => {
                  if (owner && name) {
                    navigation.navigate('RepoFileCity', {
                      owner,
                      name,
                      fullName: repo,
                    });
                  }
                }}
                activeOpacity={0.7}
              >
                <Image
                  source={{ uri: `https://github.com/${owner}.png` }}
                  style={styles.repoOwnerAvatar}
                />
                <Text
                  style={[styles.repoName, { color: theme.colors.text }]}
                  numberOfLines={1}
                >
                  {name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  userInfo: {
    flex: 1,
  },
  username: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  commitCount: {
    fontSize: 13,
  },
  rightSection: {
    alignItems: 'flex-end',
    marginLeft: 12,
  },
  time: {
    fontSize: 12,
    marginBottom: 6,
  },
  reposToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  reposCount: {
    fontSize: 12,
  },
  expandedRepos: {
    width: '100%',
    flexDirection: 'column',
    gap: 8,
    marginTop: 12,
  },
  repoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    gap: 10,
  },
  repoOwnerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 6,
  },
  repoName: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
});
