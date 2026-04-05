import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { RouteProp } from '@react-navigation/native';
import { useTheme } from '@principal-ade/industry-theme';
import { Logo } from '../components/Logo';
import type { RootStackParamList } from '../navigation/types';

type NavigationProp = StackNavigationProp<RootStackParamList, 'CardDetail'>;
type ScreenRouteProp = RouteProp<RootStackParamList, 'CardDetail'>;

interface CommitParam {
  sha: string;
  message: string;
  author: string;
  authorLogin: string | null;
  authorAvatarUrl: string | null;
  date: string;
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

export function CardDetailScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<ScreenRouteProp>();

  const { owner, repo, commits } = route.params;

  const [avatarError, setAvatarError] = useState(false);
  const [fileCityLoaded, setFileCityLoaded] = useState(false);
  const [fileCityError, setFileCityError] = useState(false);

  // File City image URL
  const fileCityImageUrl = `https://app.principal-ade.com/api/file-city/${owner}/${repo}?width=800&height=800`;

  const renderCommit = useCallback(
    ({ item: commit }: { item: CommitParam }) => (
      <View style={[styles.commitCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
        <View style={styles.commitHeader}>
          {commit.authorAvatarUrl ? (
            <Image source={{ uri: commit.authorAvatarUrl }} style={styles.commitAvatar} />
          ) : (
            <View style={[styles.commitAvatarFallback, { backgroundColor: theme.colors.border }]}>
              <Text style={[styles.commitAvatarText, { color: theme.colors.textSecondary }]}>
                {commit.author.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          <View style={styles.commitMeta}>
            <Text style={[styles.commitAuthor, { color: theme.colors.text }]}>
              {commit.authorLogin || commit.author}
            </Text>
            <Text style={[styles.commitTime, { color: theme.colors.textSecondary }]}>
              {formatRelativeTime(new Date(commit.date))}
            </Text>
          </View>
          <Text style={[styles.commitSha, { color: theme.colors.textSecondary }]}>
            {commit.sha.slice(0, 7)}
          </Text>
        </View>
        <Text style={[styles.commitMessage, { color: theme.colors.text }]} numberOfLines={4}>
          {commit.message}
        </Text>
      </View>
    ),
    [theme]
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8, borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeButton}>
          <Text style={[styles.closeText, { color: theme.colors.primary }]}>Close</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]} numberOfLines={1}>
            {repo}
          </Text>
          <Text style={[styles.headerSubtitle, { color: theme.colors.textSecondary }]}>
            {commits.length} commit{commits.length !== 1 ? 's' : ''}
          </Text>
        </View>
        <View style={styles.closeButton} />
      </View>

      {/* Repo Header */}
      <View style={styles.repoHeader}>
        <View
          style={[
            styles.avatarContainer,
            { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
          ]}
        >
          {!avatarError ? (
            <Image
              source={{ uri: `https://github.com/${owner}.png?size=128` }}
              style={styles.avatar}
              onError={() => setAvatarError(true)}
            />
          ) : (
            <Text style={[styles.avatarFallback, { color: theme.colors.textSecondary }]}>
              {owner.charAt(0).toUpperCase()}
            </Text>
          )}
        </View>
        <View style={styles.repoInfo}>
          <Text style={[styles.repoName, { color: theme.colors.text }]}>{repo}</Text>
          <Text style={[styles.repoOwner, { color: theme.colors.textSecondary }]}>{owner}</Text>
        </View>
      </View>

      {/* File City Image */}
      <View
        style={[
          styles.fileCityContainer,
          { backgroundColor: theme.colors.background, borderColor: theme.colors.border },
        ]}
      >
        {!fileCityLoaded && !fileCityError && (
          <View style={styles.fileCityPlaceholder}>
            <Logo width={80} height={80} color={theme.colors.textSecondary} opacity={0.6} />
          </View>
        )}
        {fileCityError ? (
          <View style={styles.fileCityPlaceholder}>
            <Logo width={60} height={60} color={theme.colors.textSecondary} opacity={0.4} />
          </View>
        ) : (
          <Image
            source={{ uri: fileCityImageUrl }}
            style={styles.fileCityImage}
            resizeMode="contain"
            onLoad={() => setFileCityLoaded(true)}
            onError={() => setFileCityError(true)}
          />
        )}
      </View>

      {/* Commits List */}
      <FlatList
        data={commits}
        renderItem={renderCommit}
        keyExtractor={(item) => item.sha}
        contentContainerStyle={[styles.commitsList, { paddingBottom: insets.bottom + 16 }]}
        showsVerticalScrollIndicator={false}
      />
    </View>
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
  closeButton: {
    width: 60,
  },
  closeText: {
    fontSize: 17,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  repoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  avatarContainer: {
    width: 48,
    height: 48,
    borderRadius: 10,
    borderWidth: 1,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  avatarFallback: {
    fontSize: 20,
    fontWeight: '600',
  },
  repoInfo: {
    flex: 1,
  },
  repoName: {
    fontSize: 18,
    fontWeight: '700',
  },
  repoOwner: {
    fontSize: 14,
    marginTop: 2,
  },
  fileCityContainer: {
    width: '100%',
    aspectRatio: 2,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  fileCityPlaceholder: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fileCityImage: {
    width: '100%',
    height: '100%',
  },
  commitsList: {
    padding: 16,
    gap: 12,
  },
  commitCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  commitHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  commitAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  commitAvatarFallback: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  commitAvatarText: {
    fontSize: 14,
    fontWeight: '600',
  },
  commitMeta: {
    flex: 1,
    marginLeft: 10,
  },
  commitAuthor: {
    fontSize: 14,
    fontWeight: '600',
  },
  commitTime: {
    fontSize: 12,
    marginTop: 1,
  },
  commitSha: {
    fontFamily: 'monospace',
    fontSize: 12,
  },
  commitMessage: {
    fontSize: 15,
    lineHeight: 22,
  },
});

export default CardDetailScreen;
