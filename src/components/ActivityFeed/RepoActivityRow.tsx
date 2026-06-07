import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { useTheme } from '@principal-ade/industry-theme';
import { useNavigation } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';
import type { WatchStackParamList } from '../../navigation/types';

export interface RepoActivityRowProps {
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

export function RepoActivityRow({
  repoId: _repoId,
  owner,
  name,
  commitCount,
  latestCommitTime,
  latestCommitAuthor,
  latestCommitMessage,
}: RepoActivityRowProps) {
  const { theme } = useTheme();
  const navigation = useNavigation<NavigationProp<WatchStackParamList>>();

  const handleRepoPress = () => {
    navigation.navigate('RepoFileCity', {
      owner,
      name,
      fullName: `${owner}/${name}`,
    });
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

  const hasCommitInfo = latestCommitAuthor && latestCommitMessage;

  return (
    <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
      <View style={[styles.header, hasCommitInfo && styles.headerWithMargin]}>
        <TouchableOpacity onPress={handleRepoPress}>
          <Image
            source={{ uri: `https://github.com/${owner}.png` }}
            style={styles.ownerAvatar}
          />
        </TouchableOpacity>
        <View style={styles.repoInfo}>
          <Text style={[styles.repoName, { color: theme.colors.text }]}>
            {name}
          </Text>
          <Text style={[styles.repoOwner, { color: theme.colors.textSecondary }]}>
            {owner}
          </Text>
        </View>
        <View style={styles.statsContainer}>
          {latestCommitTime && (
            <Text style={[styles.time, { color: theme.colors.textSecondary }]}>
              {formatTime(latestCommitTime)}
            </Text>
          )}
          <Text style={[styles.commitCount, { color: theme.colors.textSecondary }]}>
            {commitCount === 0
              ? 'No recent activity'
              : `${commitCount} commit${commitCount !== 1 ? 's' : ''}`
            }
          </Text>
        </View>
      </View>

      {hasCommitInfo && (
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
    alignItems: 'center',
  },
  headerWithMargin: {
    marginBottom: 12,
  },
  ownerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 8,
    marginRight: 12,
  },
  repoInfo: {
    flex: 1,
  },
  repoName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
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
    marginBottom: 6,
  },
  commitCount: {
    fontSize: 13,
  },
  commitInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingTop: 8,
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
    marginBottom: 2,
  },
  commitMessage: {
    fontSize: 13,
    lineHeight: 18,
  },
});
