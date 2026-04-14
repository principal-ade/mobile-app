import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { useTheme } from '@principal-ade/industry-theme';
import { useNavigation } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';
import type { WatchStackParamList } from '../../navigation/types';
import { LucideIcon } from '../LucideIcon';

interface RepoContribution {
  repoId: string;
  commitCount: number;
  latestCommitTime: string;
}

export interface UserCardProps {
  login: string;
  avatarUrl?: string;
  commitCount: number;
  latestCommitTime?: string;
  reposContributedTo: RepoContribution[];
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
    <TouchableOpacity
      style={[styles.card, { backgroundColor: theme.colors.surface }]}
      onPress={() => reposContributedTo.length > 0 && setIsExpanded(!isExpanded)}
      activeOpacity={1}
      disabled={reposContributedTo.length === 0}
    >
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
          <View style={styles.reposToggle}>
            <Text style={[styles.reposCount, { color: theme.colors.textSecondary }]}>
              {reposContributedTo.length} {reposContributedTo.length === 1 ? 'repo' : 'repos'}
            </Text>
            <LucideIcon
              name={isExpanded ? 'ChevronUp' : 'ChevronDown'}
              size={16}
              color={theme.colors.textSecondary}
            />
          </View>
        )}
      </View>
      {isExpanded && reposContributedTo.length > 0 && (
        <View style={styles.expandedRepos}>
          {reposContributedTo.map((repoContribution) => {
            const [owner, name] = repoContribution.repoId.split('/');
            return (
              <View key={repoContribution.repoId}>
                <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />
                <TouchableOpacity
                  style={[styles.repoItem, { backgroundColor: theme.colors.background }]}
                  onPress={() => {
                    if (owner && name) {
                      navigation.navigate('RepoFileCity', {
                        owner,
                        name,
                        fullName: repoContribution.repoId,
                      });
                    }
                  }}
                  activeOpacity={0.7}
                >
                  <Image
                    source={{ uri: `https://github.com/${owner}.png` }}
                    style={styles.repoOwnerAvatar}
                  />
                  <View style={styles.repoDetails}>
                    <Text
                      style={[styles.repoName, { color: theme.colors.text }]}
                      numberOfLines={1}
                    >
                      {name}
                    </Text>
                    <Text style={[styles.repoStats, { color: theme.colors.textSecondary }]}>
                      {repoContribution.commitCount} commit{repoContribution.commitCount !== 1 ? 's' : ''} · {formatTime(repoContribution.latestCommitTime)}
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>
            );
          })}
        </View>
      )}
    </TouchableOpacity>
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
    marginTop: 16,
  },
  divider: {
    height: 1,
    marginVertical: 12,
  },
  repoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 8,
  },
  repoOwnerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 8,
  },
  repoDetails: {
    flex: 1,
  },
  repoName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  repoStats: {
    fontSize: 13,
  },
});
