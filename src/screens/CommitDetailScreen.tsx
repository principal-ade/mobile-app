import React, { useMemo, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { RouteProp } from '@react-navigation/native';
import { useTheme } from '@principal-ade/industry-theme';
import { IndustryMarkdown } from '../components/IndustryMarkdown';
import type { FeedStackParamList } from '../navigation/types';
import { apiConfig } from '../utils/config';

type NavigationProp = StackNavigationProp<FeedStackParamList, 'CommitDetail'>;
type ScreenRouteProp = RouteProp<FeedStackParamList, 'CommitDetail'>;

interface CommitFile {
  filename: string;
  status?: string;
  additions?: number;
  deletions?: number;
  changes?: number;
}

interface CommitDetailsResponse {
  stats?: {
    additions: number;
    deletions: number;
  };
  files?: CommitFile[];
}

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function CommitDetailScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<ScreenRouteProp>();

  const { commit, fullName } = route.params;

  const [files, setFiles] = useState<CommitFile[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(true);
  const [filesError, setFilesError] = useState<string | null>(null);

  const commitDate = new Date(commit.date);
  const githubUrl = `https://github.com/${commit.repoOwner}/${commit.repoName}/commit/${commit.sha}`;

  const hasStats = commit.filesChanged !== undefined ||
                   commit.additions !== undefined ||
                   commit.deletions !== undefined;

  const ownerAvatarUrl = `https://github.com/${commit.repoOwner}.png`;

  useEffect(() => {
    const fetchCommitFiles = async () => {
      setLoadingFiles(true);
      setFilesError(null);

      try {
        const url = `${apiConfig.baseUrl}/github/repo/${commit.repoOwner}/${commit.repoName}/commits/${commit.sha}`;
        const response = await fetch(url);

        if (!response.ok) {
          throw new Error('Failed to fetch commit details');
        }

        const data: CommitDetailsResponse = await response.json();
        setFiles(data.files || []);
      } catch (error) {
        setFilesError(error instanceof Error ? error.message : 'Failed to load files');
      } finally {
        setLoadingFiles(false);
      }
    };

    fetchCommitFiles();
  }, [commit.repoOwner, commit.repoName, commit.sha]);

  const renderHeader = useMemo(() => (
    <View style={[styles.content, { paddingTop: insets.top + 16 }]}>
      {/* Author and Owner row */}
      <View style={styles.authorRow}>
        {/* Left side: Author avatar */}
        {commit.authorAvatarUrl ? (
          <Image
            source={{ uri: commit.authorAvatarUrl }}
            style={styles.avatar}
          />
        ) : (
          <View style={[styles.avatarFallback, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.avatarFallbackText, { color: theme.colors.textSecondary }]}>
              {(commit.authorLogin ?? commit.author ?? '?').charAt(0).toUpperCase()}
            </Text>
          </View>
        )}

        {/* Center: Author info and repo name */}
        <View style={styles.centerInfo}>
          <View style={styles.topRow}>
            <Text style={[styles.authorName, { color: theme.colors.text }]} numberOfLines={1}>
              {commit.author}
            </Text>
            <Text style={[styles.repoName, { color: theme.colors.primary }]} numberOfLines={1}>
              {commit.repoName}
            </Text>
          </View>
          <View style={styles.bottomRow}>
            <Text style={[styles.commitTime, { color: theme.colors.textSecondary }]}>
              {formatRelativeTime(commitDate)}
            </Text>
            <Text style={[styles.shaText, { color: theme.colors.textSecondary }]}>
              {commit.sha.slice(0, 7)}
            </Text>
          </View>
        </View>

        {/* Right side: Owner avatar */}
        <Image
          source={{ uri: ownerAvatarUrl }}
          style={styles.ownerAvatar}
        />
      </View>

      {/* Commit message */}
      <View style={styles.messageSection}>
        {commit.message ? (
          <IndustryMarkdown>{commit.message}</IndustryMarkdown>
        ) : (
          <Text style={[styles.noMessage, { color: theme.colors.textSecondary }]}>
            No commit message
          </Text>
        )}
      </View>

      {/* Stats */}
      {hasStats && (
        <View style={styles.statsSection}>
          <Text style={[styles.metadataLabel, { color: theme.colors.textSecondary }]}>
            Changes
          </Text>
          <View style={styles.statsRow}>
            {commit.filesChanged !== undefined && (
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: theme.colors.text }]}>
                  {commit.filesChanged}
                </Text>
                <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
                  {commit.filesChanged === 1 ? 'file' : 'files'}
                </Text>
              </View>
            )}
            {commit.additions !== undefined && (
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: theme.colors.success }]}>
                  +{commit.additions}
                </Text>
                <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
                  additions
                </Text>
              </View>
            )}
            {commit.deletions !== undefined && (
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: theme.colors.error }]}>
                  -{commit.deletions}
                </Text>
                <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
                  deletions
                </Text>
              </View>
            )}
          </View>
        </View>
      )}

      {/* Files */}
      {loadingFiles ? (
        <View style={styles.filesSection}>
          <Text style={[styles.metadataLabel, { color: theme.colors.textSecondary }]}>
            Files Changed
          </Text>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={theme.colors.primary} />
          </View>
        </View>
      ) : filesError ? (
        <View style={styles.filesSection}>
          <Text style={[styles.metadataLabel, { color: theme.colors.textSecondary }]}>
            Files Changed
          </Text>
          <Text style={[styles.errorText, { color: theme.colors.error }]}>
            {filesError}
          </Text>
        </View>
      ) : files.length > 0 ? (
        <View style={styles.filesSection}>
          <Text style={[styles.metadataLabel, { color: theme.colors.textSecondary }]}>
            Files Changed ({files.length})
          </Text>
          {files.map((file, index) => (
            <View
              key={file.filename}
              style={[
                styles.fileItem,
                {
                  borderBottomColor: theme.colors.border,
                  borderBottomWidth: index < files.length - 1 ? 1 : 0,
                },
              ]}
            >
              <Text style={[styles.fileName, { color: theme.colors.text }]} numberOfLines={1}>
                {file.filename}
              </Text>
              {(file.additions !== undefined || file.deletions !== undefined) && (
                <View style={styles.fileStats}>
                  {file.additions !== undefined && file.additions > 0 && (
                    <Text style={[styles.fileStatText, { color: theme.colors.success }]}>
                      +{file.additions}
                    </Text>
                  )}
                  {file.deletions !== undefined && file.deletions > 0 && (
                    <Text style={[styles.fileStatText, { color: theme.colors.error }]}>
                      -{file.deletions}
                    </Text>
                  )}
                </View>
              )}
            </View>
          ))}
        </View>
      ) : null}

      {/* View on GitHub button */}
      <TouchableOpacity
        style={[styles.githubButton, { borderColor: theme.colors.border }]}
        onPress={() => Linking.openURL(githubUrl)}
      >
        <Text style={[styles.githubButtonText, { color: theme.colors.primary }]}>
          View on GitHub
        </Text>
      </TouchableOpacity>
    </View>
  ), [commit, fullName, theme, commitDate, githubUrl, hasStats, ownerAvatarUrl, files, loadingFiles, filesError, insets.top]);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background, overflow: 'hidden' }]}>
      <FlatList
        data={[]}
        renderItem={null}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={{ paddingBottom: 80 }}
        showsVerticalScrollIndicator={false}
      />

      {/* Close button at bottom */}
      <TouchableOpacity
        onPress={() => navigation.goBack()}
        style={[
          styles.closeButton,
          {
            backgroundColor: theme.colors.surface,
            borderTopColor: theme.colors.border,
          },
        ]}
      >
        <Text style={[styles.closeText, { color: theme.colors.text }]}>Close</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  ownerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 8,
  },
  avatarFallback: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarFallbackText: {
    fontSize: 16,
    fontWeight: '600',
  },
  centerInfo: {
    flex: 1,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 8,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 2,
  },
  authorName: {
    fontSize: 16,
    fontWeight: '600',
    flexShrink: 1,
  },
  repoName: {
    fontSize: 14,
    fontWeight: '500',
    flexShrink: 1,
    textAlign: 'right',
  },
  commitTime: {
    fontSize: 14,
  },
  messageSection: {
    marginBottom: 24,
  },
  noMessage: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  metadataLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  shaText: {
    fontSize: 12,
    fontFamily: 'monospace',
  },
  statsSection: {
    marginBottom: 20,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 24,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'monospace',
  },
  statLabel: {
    fontSize: 12,
  },
  filesSection: {
    marginBottom: 20,
  },
  loadingContainer: {
    paddingVertical: 12,
  },
  errorText: {
    fontSize: 14,
  },
  fileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    gap: 12,
  },
  fileName: {
    fontSize: 13,
    fontFamily: 'monospace',
    flex: 1,
  },
  fileStats: {
    flexDirection: 'row',
    gap: 8,
  },
  fileStatText: {
    fontSize: 12,
    fontFamily: 'monospace',
  },
  githubButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    marginTop: 8,
  },
  githubButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  closeButton: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingVertical: 12,
    alignItems: 'center',
    borderTopWidth: 1,
  },
  closeText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

export default CommitDetailScreen;
