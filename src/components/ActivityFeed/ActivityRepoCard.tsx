import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { useTheme } from '@principal-ade/industry-theme';

export interface ActivityRepoCardProps {
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

export function ActivityRepoCard({
  repoId: _repoId,
  owner,
  name,
  commitCount,
  latestCommitTime,
  latestCommitAuthor,
  latestCommitMessage,
}: ActivityRepoCardProps) {
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
      <View style={styles.header}>
        <Image
          source={{ uri: `https://github.com/${owner}.png` }}
          style={styles.ownerAvatar}
        />
        <View style={styles.repoInfo}>
          <Text style={[styles.repoName, { color: theme.colors.text }]}>
            {name}
          </Text>
          <Text style={[styles.repoOwner, { color: theme.colors.textSecondary }]}>
            {owner}
          </Text>
        </View>
        <View style={styles.statsContainer}>
          <Text style={[styles.time, { color: theme.colors.textSecondary }]}>
            {formatTime(latestCommitTime)}
          </Text>
          <Text style={[styles.commitCount, { color: theme.colors.textSecondary }]}>
            {commitCount} commit{commitCount !== 1 ? 's' : ''}
          </Text>
        </View>
      </View>

      {latestCommitAuthor && latestCommitMessage && (
        <View style={styles.commitInfo}>
          <Image
            source={{ uri: latestCommitAuthor.avatarUrl || `https://github.com/${latestCommitAuthor.login}.png` }}
            style={styles.avatar}
          />
          <View style={styles.commitDetails}>
            <Text style={[styles.authorName, { color: theme.colors.text }]}>
              {latestCommitAuthor.login}
            </Text>
            <Text
              style={[styles.commitMessage, { color: theme.colors.textSecondary }]}
              numberOfLines={2}
            >
              {latestCommitMessage}
            </Text>
          </View>
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
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  ownerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  repoInfo: {
    flex: 1,
  },
  repoName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  repoOwner: {
    fontSize: 13,
  },
  statsContainer: {
    alignItems: 'flex-end',
    marginLeft: 12,
  },
  time: {
    fontSize: 12,
    marginBottom: 4,
  },
  commitCount: {
    fontSize: 13,
  },
  commitInfo: {
    flexDirection: 'row',
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 10,
  },
  commitDetails: {
    flex: 1,
  },
  authorName: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 4,
  },
  commitMessage: {
    fontSize: 13,
    lineHeight: 18,
  },
});
