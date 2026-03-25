import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { useTheme } from '@principal-ade/industry-theme';

export interface Commit {
  sha: string;
  message: string;
  author: {
    login: string;
    avatarUrl: string;
  };
  date: string;
}

export interface RepoCardProps {
  repoFullName: string;
  description?: string;
  commits: Commit[];
  fileCityUrl?: string;
}

export function RepoCard({ repoFullName, description, commits, fileCityUrl }: RepoCardProps) {
  const { theme } = useTheme();
  const latestCommit = commits[0];

  return (
    <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
      <View style={styles.header}>
        <Text style={[styles.repoName, { color: theme.colors.text }]}>
          {repoFullName}
        </Text>
        {description && (
          <Text style={[styles.description, { color: theme.colors.textSecondary }]} numberOfLines={2}>
            {description}
          </Text>
        )}
      </View>

      {fileCityUrl && (
        <View style={styles.fileCityContainer}>
          <Image
            source={{ uri: fileCityUrl }}
            style={styles.fileCityImage}
            resizeMode="cover"
          />
        </View>
      )}

      {latestCommit && (
        <View style={styles.commitSection}>
          <View style={styles.authorRow}>
            <Image
              source={{ uri: latestCommit.author.avatarUrl }}
              style={styles.avatar}
            />
            <Text style={[styles.authorName, { color: theme.colors.text }]}>
              {latestCommit.author.login}
            </Text>
            <Text style={[styles.commitDate, { color: theme.colors.textSecondary }]}>
              {latestCommit.date}
            </Text>
          </View>
          <Text style={[styles.commitMessage, { color: theme.colors.text }]} numberOfLines={2}>
            {latestCommit.message}
          </Text>
          <Text style={[styles.commitCount, { color: theme.colors.textSecondary }]}>
            {commits.length} commit{commits.length !== 1 ? 's' : ''} in last 24h
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  header: {
    marginBottom: 12,
  },
  repoName: {
    fontSize: 18,
    fontWeight: '700',
  },
  description: {
    fontSize: 14,
    marginTop: 4,
  },
  fileCityContainer: {
    height: 200,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
  },
  fileCityImage: {
    width: '100%',
    height: '100%',
  },
  commitSection: {
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  avatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 8,
  },
  authorName: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  commitDate: {
    fontSize: 12,
  },
  commitMessage: {
    fontSize: 14,
    lineHeight: 20,
  },
  commitCount: {
    fontSize: 12,
    marginTop: 8,
  },
});
