import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/types';
import { useTheme } from '@principal-ade/industry-theme';
import { useAuth } from '../hooks/useAuth';
import { GitHubContentItem, GitHubRepository } from '../types/github';
import {
  fetchRepositories,
  fetchRepositoryContents,
} from '../services/GithubService';

const MARKDOWN_EXTENSIONS = ['.md', '.markdown'];

type RepositoryListScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'RepositoryList'
>;

interface Props {
  navigation: RepositoryListScreenNavigationProp;
}

export default function RepositoryListScreen({ navigation }: Props) {
  const { theme } = useTheme();
  const { token, user, signOut } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [repositories, setRepositories] = useState<GitHubRepository[]>([]);
  const [repoError, setRepoError] = useState<string | null>(null);
  const [selectedRepo, setSelectedRepo] = useState<GitHubRepository | null>(null);
  const [currentPath, setCurrentPath] = useState<string[]>([]);
  const [contents, setContents] = useState<GitHubContentItem[]>([]);
  const [isLoadingContents, setIsLoadingContents] = useState(false);
  const [contentsError, setContentsError] = useState<string | null>(null);

  const username = user?.name ?? user?.login ?? 'there';

  const breadcrumb = useMemo(() => {
    if (!selectedRepo) {
      return null;
    }
    const base = `${selectedRepo.owner.login}/${selectedRepo.name}`;
    if (currentPath.length === 0) {
      return base;
    }
    return `${base}/${currentPath.join('/')}`;
  }, [currentPath, selectedRepo]);

  const loadRepositories = useCallback(
    async (withSpinner: boolean) => {
      if (!token) {
        setRepoError('Missing authentication token. Please sign in again.');
        setIsLoading(false);
        setIsRefreshing(false);
        return;
      }

      if (withSpinner) {
        setIsLoading(true);
      } else {
        setIsRefreshing(true);
      }
      setRepoError(null);

      try {
        const data = await fetchRepositories(token);
        const sorted = [...data].sort((a, b) =>
          a.full_name.localeCompare(b.full_name),
        );
        setRepositories(sorted);
      } catch (error) {
        console.error('Failed to load repositories', error);
        setRepoError('Unable to load repositories. Pull to retry.');
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [token],
  );

  useEffect(() => {
    loadRepositories(true);
  }, [loadRepositories]);

  const filterMarkdownItems = useCallback((items: GitHubContentItem[]) => {
    return items.filter((item) => {
      if (item.type === 'dir') {
        return true;
      }
      const lower = item.name.toLowerCase();
      return MARKDOWN_EXTENSIONS.some((ext) => lower.endsWith(ext));
    });
  }, []);

  const loadRepositoryContents = useCallback(
    async (repo: GitHubRepository, pathSegments: string[]) => {
      if (!token) {
        setContentsError('Missing authentication token. Please sign in again.');
        setIsLoadingContents(false);
        return;
      }

      setIsLoadingContents(true);
      setContentsError(null);

      try {
        const path = pathSegments.join('/');
        const data = await fetchRepositoryContents(
          token,
          repo.owner.login,
          repo.name,
          path,
        );
        const filtered = filterMarkdownItems(data).sort((a, b) => {
          if (a.type !== b.type) {
            return a.type === 'dir' ? -1 : 1;
          }
          return a.name.localeCompare(b.name);
        });
        setContents(filtered);
      } catch (error) {
        console.error('Failed to load repository contents', error);
        setContentsError('Unable to load repository contents.');
      } finally {
        setIsLoadingContents(false);
      }
    },
    [filterMarkdownItems, token],
  );

  const handleSelectRepository = useCallback(
    (repo: GitHubRepository) => {
      setSelectedRepo(repo);
      setCurrentPath([]);
      loadRepositoryContents(repo, []);
    },
    [loadRepositoryContents],
  );

  const handleSelectItem = useCallback(
    (item: GitHubContentItem) => {
      if (!selectedRepo) {
        return;
      }

      if (item.type === 'dir') {
        const nextPath = [...currentPath, item.name];
        setCurrentPath(nextPath);
        loadRepositoryContents(selectedRepo, nextPath);
        return;
      }

      const fullPath = [...currentPath, item.name].join('/');
      navigation.navigate('Document', {
        owner: selectedRepo.owner.login,
        repo: selectedRepo.name,
        path: fullPath,
        fileName: item.name,
      });
    },
    [currentPath, loadRepositoryContents, navigation, selectedRepo],
  );

  const handleNavigateUp = useCallback(() => {
    if (!selectedRepo || currentPath.length === 0) {
      return;
    }

    const nextPath = currentPath.slice(0, -1);
    setCurrentPath(nextPath);
    loadRepositoryContents(selectedRepo, nextPath);
  }, [currentPath, loadRepositoryContents, selectedRepo]);

  const handleCloseBrowser = useCallback(() => {
    setSelectedRepo(null);
    setCurrentPath([]);
    setContents([]);
    setContentsError(null);
    setIsLoadingContents(false);
  }, []);

  const renderRepositoryItem = useCallback(
    ({ item }: { item: GitHubRepository }) => (
      <TouchableOpacity
        style={[styles.repoCard, { backgroundColor: theme.colors.surface }]}
        onPress={() => handleSelectRepository(item)}
        activeOpacity={0.7}
      >
        <Text style={[styles.repoTitle, { color: theme.colors.text }]}>
          {item.name}
        </Text>
        {item.description ? (
          <Text
            style={[styles.repoDescription, { color: theme.colors.textSecondary }]}
            numberOfLines={2}
          >
            {item.description}
          </Text>
        ) : null}
        <Text style={[styles.repoMeta, { color: theme.colors.textSecondary }]}> 
          ⭐ {item.stargazers_count} • Updated {new Date(item.updated_at).toLocaleDateString()}
        </Text>
      </TouchableOpacity>
    ),
    [handleSelectRepository, theme],
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}> 
      <View style={styles.header}> 
        <Text style={[styles.greeting, { color: theme.colors.text }]}>Hello, {username}</Text>
        <TouchableOpacity onPress={signOut}>
          <Text style={[styles.signOut, { color: theme.colors.primary }]}>Sign out</Text>
        </TouchableOpacity>
      </View>

      {repoError ? (
        <Text style={[styles.errorText, { color: theme.colors.error }]}>{repoError}</Text>
      ) : null}

      {isLoading ? (
        <View style={styles.loaderContainer}>
          <LoadingSpinner size="large" color={theme.colors.primary} />
        </View>
      ) : (
        <FlatList
          data={repositories}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderRepositoryItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => loadRepositories(false)}
              tintColor={theme.colors.primary}
            />
          }
          ListEmptyComponent={
            <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
              No repositories found.
            </Text>
          }
        />
      )}

      {selectedRepo ? (
        <View
          style={[styles.browserContainer, { backgroundColor: theme.colors.surface }]}
        >
          <View style={styles.browserHeader}>
            <View style={styles.browserHeaderText}>
              <Text style={[styles.browserTitle, { color: theme.colors.text }]}>
                Markdown files
              </Text>
              {breadcrumb ? (
                <Text
                  style={[styles.breadcrumb, { color: theme.colors.textSecondary }]}
                  numberOfLines={1}
                >
                  {breadcrumb}
                </Text>
              ) : null}
            </View>
            <View style={styles.browserActions}>
              {currentPath.length > 0 ? (
                <TouchableOpacity onPress={handleNavigateUp}>
                  <Text style={[styles.browserActionText, { color: theme.colors.primary }]}>Up</Text>
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity onPress={handleCloseBrowser}>
                <Text style={[styles.browserActionText, { color: theme.colors.primary }]}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>

          {contentsError ? (
            <Text style={[styles.errorText, { color: theme.colors.error }]}>
              {contentsError}
            </Text>
          ) : null}

          {isLoadingContents ? (
            <View style={styles.loaderContainer}>
              <LoadingSpinner size="small" color={theme.colors.primary} />
            </View>
          ) : (
            <FlatList
              data={contents}
              keyExtractor={(item) => item.sha}
              renderItem={({ item }) => {
                const borderColor =
                  theme.colors.border ??
                  (theme.colors as Record<string, string>).outline ??
                  theme.colors.textSecondary;

                return (
                  <TouchableOpacity
                    style={[styles.contentItem, { borderBottomColor: borderColor }]}
                    onPress={() => handleSelectItem(item)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.contentName, { color: theme.colors.text }]}>
                      {item.name}
                    </Text>
                    <Text
                      style={[styles.contentType, { color: theme.colors.textSecondary }]}
                    >
                      {item.type === 'dir' ? 'Directory' : 'Markdown file'}
                    </Text>
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={
                <Text
                  style={[styles.emptyText, { color: theme.colors.textSecondary }]}
                >
                  No Markdown files in this location.
                </Text>
              }
            />
          )}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  greeting: {
    fontSize: 18,
    fontWeight: '600',
  },
  signOut: {
    fontSize: 16,
    fontWeight: '500',
  },
  errorText: {
    marginHorizontal: 20,
    marginBottom: 8,
  },
  loaderContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 160,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 40,
  },
  repoCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  repoTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  repoDescription: {
    fontSize: 14,
    marginBottom: 8,
  },
  repoMeta: {
    fontSize: 12,
  },
  browserContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: '45%',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 6,
  },
  browserHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  browserHeaderText: {
    flex: 1,
    marginRight: 12,
  },
  browserTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  breadcrumb: {
    fontSize: 12,
    marginTop: 4,
  },
  browserActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  browserActionText: {
    fontSize: 14,
    fontWeight: '500',
  },
  contentItem: {
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  contentName: {
    fontSize: 14,
    fontWeight: '500',
  },
  contentType: {
    fontSize: 12,
    marginTop: 2,
  },
});
