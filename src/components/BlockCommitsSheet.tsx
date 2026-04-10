/**
 * BlockCommitsSheet
 *
 * A modal/sheet that displays commits for a specific time block
 * from the activity heatmap.
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  FlatList,
  Image,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@principal-ade/industry-theme';
import { getBlockCommits } from '../services/CommitCacheService';
import { LoadingSpinner } from './LoadingSpinner';
import type { ActivityCommit } from '../types/activity';

interface BlockCommitsSheetProps {
  visible: boolean;
  onClose: () => void;
  startTime: Date | null;
  endTime: Date | null;
  githubToken: string | null;
  /** Expected commit count from heatmap (helps show better empty state) */
  expectedCount?: number;
}

export function BlockCommitsSheet({
  visible,
  onClose,
  startTime,
  endTime,
  githubToken,
  expectedCount = 0,
}: BlockCommitsSheetProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [commits, setCommits] = useState<ActivityCommit[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible || !startTime || !endTime || !githubToken) {
      return;
    }

    const fetchCommits = async () => {
      setLoading(true);
      setError(null);

      try {
        const result = await getBlockCommits(githubToken, startTime, endTime);
        setCommits(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load commits');
      } finally {
        setLoading(false);
      }
    };

    fetchCommits();
  }, [visible, startTime, endTime, githubToken]);

  const formatTimeRange = useCallback(() => {
    if (!startTime || !endTime) return '';

    const timeFormatter = new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });

    return `${timeFormatter.format(startTime)} - ${timeFormatter.format(endTime)}`;
  }, [startTime, endTime]);

  const handleCommitPress = useCallback((commit: ActivityCommit) => {
    const url = `https://github.com/${commit.repoOwner}/${commit.repoName}/commit/${commit.sha}`;
    Linking.openURL(url);
  }, []);

  const renderCommit = useCallback(
    ({ item }: { item: ActivityCommit }) => (
      <TouchableOpacity
        style={[styles.commitRow, { borderBottomColor: theme.colors.border }]}
        onPress={() => handleCommitPress(item)}
        activeOpacity={0.7}
      >
        {/* Author avatar */}
        {item.authorAvatarUrl ? (
          <Image
            source={{ uri: item.authorAvatarUrl }}
            style={styles.avatar}
          />
        ) : (
          <View
            style={[styles.avatarFallback, { backgroundColor: theme.colors.surface }]}
          >
            <Text style={[styles.avatarFallbackText, { color: theme.colors.textSecondary }]}>
              {(item.authorLogin ?? item.author ?? '?').charAt(0).toUpperCase()}
            </Text>
          </View>
        )}

        {/* Commit info */}
        <View style={styles.commitInfo}>
          <Text
            style={[styles.commitMessage, { color: theme.colors.text }]}
            numberOfLines={2}
          >
            {item.message.split('\n')[0]}
          </Text>
          <View style={styles.commitMeta}>
            <Text style={[styles.repoName, { color: theme.colors.primary }]}>
              {item.repoOwner}/{item.repoName}
            </Text>
            <Text style={[styles.authorName, { color: theme.colors.textSecondary }]}>
              {item.authorLogin ?? item.author}
            </Text>
          </View>
        </View>

        {/* SHA badge */}
        <View style={[styles.shaBadge, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.shaText, { color: theme.colors.textSecondary }]}>
            {item.sha.slice(0, 7)}
          </Text>
        </View>
      </TouchableOpacity>
    ),
    [theme, handleCommitPress]
  );

  const renderEmpty = useCallback(() => {
    if (loading) return null;

    // If we expected commits but found none, it's likely a private repo
    const isPrivateRepo = expectedCount > 0 && commits.length === 0;

    return (
      <View style={styles.emptyContainer}>
        {isPrivateRepo ? (
          <>
            <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
              {expectedCount} commit{expectedCount !== 1 ? 's' : ''} from private repos
            </Text>
            <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
              Commit details aren't available for private repositories
            </Text>
          </>
        ) : (
          <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
            No commits in this time block
          </Text>
        )}
      </View>
    );
  }, [loading, expectedCount, commits.length, theme.colors.text, theme.colors.textSecondary]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        {/* Header */}
        <View
          style={[
            styles.header,
            {
              paddingTop: insets.top + 12,
              borderBottomColor: theme.colors.border,
            },
          ]}
        >
          <View style={styles.headerContent}>
            <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
              {formatTimeRange()}
            </Text>
            <Text style={[styles.headerSubtitle, { color: theme.colors.textSecondary }]}>
              {commits.length} commit{commits.length !== 1 ? 's' : ''}
            </Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={[styles.closeButtonText, { color: theme.colors.primary }]}>
              Done
            </Text>
          </TouchableOpacity>
        </View>

        {/* Content */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <LoadingSpinner size="large" color={theme.colors.primary} />
            <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
              Loading commits...
            </Text>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <Text style={[styles.errorText, { color: theme.colors.error }]}>
              {error}
            </Text>
            <TouchableOpacity
              style={[styles.retryButton, { borderColor: theme.colors.primary }]}
              onPress={() => {
                if (startTime && endTime && githubToken) {
                  setLoading(true);
                  setError(null);
                  getBlockCommits(githubToken, startTime, endTime, { skipCache: true })
                    .then(setCommits)
                    .catch((err) =>
                      setError(err instanceof Error ? err.message : 'Failed')
                    )
                    .finally(() => setLoading(false));
                }
              }}
            >
              <Text style={[styles.retryButtonText, { color: theme.colors.primary }]}>
                Retry
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={commits}
            renderItem={renderCommit}
            keyExtractor={(item) => item.sha}
            ListEmptyComponent={renderEmpty}
            contentContainerStyle={[
              styles.listContent,
              { paddingBottom: insets.bottom + 16 },
            ]}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  headerSubtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  closeButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  listContent: {
    paddingTop: 8,
  },
  commitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  avatarFallback: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarFallbackText: {
    fontSize: 14,
    fontWeight: '600',
  },
  commitInfo: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  commitMessage: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 18,
  },
  commitMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 8,
  },
  repoName: {
    fontSize: 12,
    fontWeight: '500',
  },
  authorName: {
    fontSize: 12,
  },
  shaBadge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  shaText: {
    fontSize: 11,
    fontFamily: 'monospace',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
  },
});

export default BlockCommitsSheet;
