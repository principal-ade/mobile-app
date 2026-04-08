import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { useTheme } from '@principal-ade/industry-theme';

export interface UserCardProps {
  login: string;
  avatarUrl?: string;
  commitCount: number;
  latestCommitTime: string;
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
        <Image
          source={{ uri: avatarUrl || `https://github.com/${login}.png` }}
          style={styles.avatar}
        />
        <View style={styles.userInfo}>
          <Text style={[styles.username, { color: theme.colors.text }]}>
            {login}
          </Text>
          <Text style={[styles.commitCount, { color: theme.colors.textSecondary }]}>
            {commitCount} commit{commitCount !== 1 ? 's' : ''}
          </Text>
        </View>
      </View>

      <View style={styles.rightSection}>
        <Text style={[styles.time, { color: theme.colors.textSecondary }]}>
          {formatTime(latestCommitTime)}
        </Text>
        {reposContributedTo.length > 0 && (
          <View style={styles.reposContainer}>
            {reposContributedTo.slice(0, 3).map((repo, idx) => (
              <Text
                key={repo}
                style={[styles.repoTag, {
                  color: theme.colors.primary,
                  backgroundColor: `${theme.colors.primary}20`
                }]}
                numberOfLines={1}
              >
                {repo}
              </Text>
            ))}
            {reposContributedTo.length > 3 && (
              <Text style={[styles.moreRepos, { color: theme.colors.textSecondary }]}>
                +{reposContributedTo.length - 3} more
              </Text>
            )}
          </View>
        )}
      </View>
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
    justifyContent: 'space-between',
    alignItems: 'flex-start',
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
  reposContainer: {
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: 4,
  },
  repoTag: {
    fontSize: 11,
    fontWeight: '500',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    overflow: 'hidden',
  },
  moreRepos: {
    fontSize: 11,
    marginTop: 2,
  },
});
