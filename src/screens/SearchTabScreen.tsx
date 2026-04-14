import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  SectionList,
  Pressable,
  Keyboard,
  Image,
} from 'react-native';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { useTheme } from '@principal-ade/industry-theme';
import { searchRepos, searchUsers, formatStars } from '../services/GitHubSearchService';
import type { GitHubRepo, GitHubUser } from '../services/GitHubSearchService';
import type { SearchStackParamList } from '../navigation/types';
import { LucideIcon } from '../components/LucideIcon';
import { saveSearchQuery, getSearchHistory, clearSearchHistory, type SearchHistoryEntry, saveClickedResult, getClickedResults, type ClickedResult } from '../utils/searchStorage';

type NavigationProp = StackNavigationProp<SearchStackParamList>;

// Custom icon components (no emojis)
function ClearIcon({ color, size = 14 }: { color: string; size?: number }) {
  return (
    <View style={[styles.iconWrapper, { width: size, height: size }]}>
      <View
        style={[
          styles.clearLine,
          {
            backgroundColor: color,
            width: size * 0.8,
            height: size * 0.15,
            transform: [{ rotate: '45deg' }],
          },
        ]}
      />
      <View
        style={[
          styles.clearLine,
          {
            backgroundColor: color,
            width: size * 0.8,
            height: size * 0.15,
            transform: [{ rotate: '-45deg' }],
          },
        ]}
      />
    </View>
  );
}

function CityIcon({ color, size = 64 }: { color: string; size?: number }) {
  return (
    <View style={[styles.cityIconContainer, { width: size, height: size }]}>
      {/* Buildings */}
      <View
        style={[
          styles.cityBuilding,
          {
            backgroundColor: color,
            width: size * 0.2,
            height: size * 0.5,
            left: size * 0.1,
            bottom: size * 0.15,
            opacity: 0.6,
          },
        ]}
      />
      <View
        style={[
          styles.cityBuilding,
          {
            backgroundColor: color,
            width: size * 0.25,
            height: size * 0.7,
            left: size * 0.35,
            bottom: size * 0.15,
            opacity: 0.8,
          },
        ]}
      />
      <View
        style={[
          styles.cityBuilding,
          {
            backgroundColor: color,
            width: size * 0.2,
            height: size * 0.4,
            right: size * 0.1,
            bottom: size * 0.15,
            opacity: 0.5,
          },
        ]}
      />
      {/* Ground */}
      <View
        style={[
          styles.cityGround,
          {
            backgroundColor: color,
            height: size * 0.08,
            bottom: size * 0.1,
            opacity: 0.3,
          },
        ]}
      />
    </View>
  );
}

function WarningIcon({ color, size = 48 }: { color: string; size?: number }) {
  return (
    <View style={[styles.iconWrapper, { width: size, height: size }]}>
      <View
        style={[
          styles.warningTriangle,
          {
            borderLeftWidth: size * 0.5,
            borderRightWidth: size * 0.5,
            borderBottomWidth: size * 0.85,
            borderLeftColor: 'transparent',
            borderRightColor: 'transparent',
            borderBottomColor: color,
          },
        ]}
      />
      <View
        style={[
          styles.warningExclamation,
          {
            backgroundColor: '#fff',
            width: size * 0.08,
            height: size * 0.3,
            top: size * 0.35,
          },
        ]}
      />
      <View
        style={[
          styles.warningDot,
          {
            backgroundColor: '#fff',
            width: size * 0.08,
            height: size * 0.08,
            borderRadius: size * 0.04,
            bottom: size * 0.2,
          },
        ]}
      />
    </View>
  );
}

function getLanguageColor(language: string): string {
  const colors: Record<string, string> = {
    JavaScript: '#f7df1e',
    TypeScript: '#3178c6',
    Python: '#3572A5',
    Java: '#b07219',
    Go: '#00ADD8',
    Rust: '#dea584',
    CSS: '#563d7c',
    HTML: '#e34c26',
    Ruby: '#701516',
    Swift: '#ffac45',
    Kotlin: '#A97BFF',
    C: '#555555',
    'C++': '#f34b7d',
    'C#': '#178600',
    PHP: '#4F5D95',
    Shell: '#89e051',
    Scala: '#c22d40',
    Vue: '#41b883',
    Dart: '#00B4AB',
  };
  return colors[language] || '#808080';
}

export function SearchTabScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();

  // Search state
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Results state
  const [repoResults, setRepoResults] = useState<GitHubRepo[]>([]);
  const [userResults, setUserResults] = useState<GitHubUser[]>([]);
  const [repoTotalCount, setRepoTotalCount] = useState(0);
  const [userTotalCount, setUserTotalCount] = useState(0);

  // UI state
  const [activeTab, setActiveTab] = useState<'all' | 'repos' | 'users'>('all');
  const [searchHistory, setSearchHistory] = useState<SearchHistoryEntry[]>([]);
  const [clickedResults, setClickedResults] = useState<ClickedResult[]>([]);

  // Error state (support partial failures)
  const [repoError, setRepoError] = useState<string | null>(null);
  const [userError, setUserError] = useState<string | null>(null);

  // Load search history and clicked results on mount
  useEffect(() => {
    async function loadHistory() {
      const [history, clicked] = await Promise.all([
        getSearchHistory(),
        getClickedResults()
      ]);
      setSearchHistory(history);
      setClickedResults(clicked);
    }
    loadHistory();
  }, []);

  // Debounced search (300ms) - searches both repos and users in parallel
  useEffect(() => {
    const trimmedQuery = query.trim();

    if (!trimmedQuery) {
      setRepoResults([]);
      setUserResults([]);
      setRepoTotalCount(0);
      setUserTotalCount(0);
      setHasSearched(false);
      setRepoError(null);
      setUserError(null);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setIsSearching(true);
      setRepoError(null);
      setUserError(null);

      // Parallel API calls with Promise.allSettled for partial failure support
      const [repoResponse, userResponse] = await Promise.allSettled([
        searchRepos(trimmedQuery, { perPage: 20 }),
        searchUsers(trimmedQuery, { perPage: 20 })
      ]);

      // Handle repo results
      if (repoResponse.status === 'fulfilled') {
        setRepoResults(repoResponse.value.repos);
        setRepoTotalCount(repoResponse.value.totalCount);
      } else {
        setRepoError(repoResponse.reason?.message || 'Failed to search repos');
        setRepoResults([]);
        setRepoTotalCount(0);
      }

      // Handle user results
      if (userResponse.status === 'fulfilled') {
        setUserResults(userResponse.value.users);
        setUserTotalCount(userResponse.value.totalCount);
      } else {
        setUserError(userResponse.reason?.message || 'Failed to search users');
        setUserResults([]);
        setUserTotalCount(0);
      }

      setHasSearched(true);
      setIsSearching(false);

      // Save to history (don't await) - use trimmed query
      saveSearchQuery(trimmedQuery);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [query]);

  const handleRepoPress = useCallback(
    async (repo: GitHubRepo) => {
      // Save clicked result
      await saveClickedResult({
        type: 'repo',
        id: `${repo.owner}/${repo.name}`,
        name: repo.name,
        owner: repo.owner,
        avatarUrl: repo.owner_avatar_url,
      });

      // Update local state
      const updated = await getClickedResults();
      setClickedResults(updated);

      navigation.navigate('RepoFileCity', {
        owner: repo.owner,
        name: repo.name,
        fullName: repo.full_name,
      });
    },
    [navigation]
  );

  const handleUserPress = useCallback(
    async (user: GitHubUser) => {
      // Save clicked result
      await saveClickedResult({
        type: 'user',
        id: user.login,
        name: user.name || user.login,
        login: user.login,
        avatarUrl: user.avatar_url,
        githubType: user.type, // Store whether it's User or Organization
      });

      // Update local state
      const updated = await getClickedResults();
      setClickedResults(updated);

      // Navigate to Organization or UserProfile based on type
      if (user.type === 'Organization') {
        navigation.navigate('Organization', {
          orgLogin: user.login,
        });
      } else {
        navigation.navigate('UserProfile', {
          username: user.login,
        });
      }
    },
    [navigation]
  );



  const renderRepoItem = useCallback(
    ({ item }: { item: GitHubRepo }) => (
      <TouchableOpacity
        style={[styles.repoItem, { backgroundColor: theme.colors.surface }]}
        onPress={() => handleRepoPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.repoHeaderWithAvatar}>
          <Image
            source={{ uri: item.owner_avatar_url }}
            style={styles.ownerAvatar}
          />
          <View style={styles.repoInfo}>
            <Text style={[styles.repoName, { color: theme.colors.primary }]}>
              {item.name}
            </Text>
            <Text style={[styles.ownerName, { color: theme.colors.textSecondary }]}>
              {item.owner}
            </Text>
          </View>
          <View style={styles.repoStats}>
            <LucideIcon name="Star" color={theme.colors.textSecondary} size={12} />
            <Text style={[styles.starCount, { color: theme.colors.textSecondary }]}>
              {formatStars(item.stargazers_count)}
            </Text>
          </View>
        </View>
        {item.description && (
          <Text
            style={[styles.repoDescription, { color: theme.colors.textSecondary }]}
            numberOfLines={2}
          >
            {item.description}
          </Text>
        )}
        {item.language && (
          <View style={styles.languageContainer}>
            <View
              style={[
                styles.languageDot,
                { backgroundColor: getLanguageColor(item.language) },
              ]}
            />
            <Text style={[styles.languageText, { color: theme.colors.textSecondary }]}>
              {item.language}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    ),
    [theme, handleRepoPress]
  );

  const renderUserItem = useCallback(
    ({ item }: { item: GitHubUser }) => (
      <TouchableOpacity
        style={[styles.repoItem, { backgroundColor: theme.colors.surface }]}
        onPress={() => handleUserPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.repoHeaderWithAvatar}>
          <Image
            source={{ uri: item.avatar_url }}
            style={item.type === 'Organization' ? styles.orgAvatar : styles.ownerAvatar}
          />
          <View style={styles.repoInfo}>
            <Text style={[styles.repoName, { color: theme.colors.primary }]}>
              {item.name || item.login}
            </Text>
            {(item.name || item.type === 'Organization') && (
              <Text style={[styles.ownerName, { color: theme.colors.textSecondary }]}>
                {item.name ? `@${item.login}` : 'Organization'}
              </Text>
            )}
          </View>
        </View>
      </TouchableOpacity>
    ),
    [theme, handleUserPress]
  );


  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerContent}>
          <Text style={[styles.title, { color: theme.colors.text }]}>
            Search
          </Text>
          <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
            Search for repositories and users
          </Text>
        </View>
      </View>

      {/* Search Input */}
      <View style={styles.searchContainer}>
        <View
          style={[
            styles.searchInputContainer,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
            },
          ]}
        >
          <View style={styles.searchIconWrapper}>
            <LucideIcon name="Search" color={theme.colors.textSecondary} size={16} />
          </View>
          <TextInput
            style={[styles.searchInput, { color: theme.colors.text }]}
            placeholder="Search repositories and users..."
            placeholderTextColor={theme.colors.textSecondary}
            value={query}
            onChangeText={setQuery}
            returnKeyType="search"
            autoCapitalize="none"
            autoCorrect={false}
          />
          {query.length > 0 && (
            <TouchableOpacity
              onPress={() => {
                setQuery('');
                setRepoResults([]);
                setUserResults([]);
                setRepoTotalCount(0);
                setUserTotalCount(0);
                setHasSearched(false);
                setRepoError(null);
                setUserError(null);
              }}
              style={styles.clearButton}
            >
              <ClearIcon color={theme.colors.textSecondary} size={14} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Search History and Clicked Results - shown when input is empty and not searching */}
      {!query && (searchHistory.length > 0 || clickedResults.length > 0) && !hasSearched && (
        <View style={styles.historyContainer}>
          {/* Recent Searches */}
          {searchHistory.length > 0 && (
            <>
              <View style={styles.historyHeader}>
                <Text style={[styles.historyTitle, { color: theme.colors.textSecondary }]}>
                  RECENT SEARCHES
                </Text>
                <TouchableOpacity onPress={async () => {
                  await clearSearchHistory();
                  setSearchHistory([]);
                }}>
                  <Text style={[styles.clearHistory, { color: theme.colors.primary }]}>
                    Clear
                  </Text>
                </TouchableOpacity>
              </View>
              <View style={styles.historyChips}>
                {searchHistory.map((entry) => (
                  <TouchableOpacity
                    key={entry.timestamp}
                    style={[styles.historyChip, {
                      backgroundColor: theme.colors.surface,
                      borderColor: theme.colors.border
                    }]}
                    onPress={() => setQuery(entry.query)}
                  >
                    <LucideIcon name="Clock" size={14} color={theme.colors.textSecondary} />
                    <Text style={[styles.historyChipText, { color: theme.colors.text }]}>
                      {entry.query}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          {/* Clicked Results */}
          {clickedResults.length > 0 && (
            <>
              <View style={[styles.historyHeader, searchHistory.length > 0 && { marginTop: 16 }]}>
                <Text style={[styles.historyTitle, { color: theme.colors.textSecondary }]}>
                  RECENTLY VIEWED
                </Text>
              </View>
              <View style={styles.clickedResultsList}>
                {clickedResults.map((result) => (
                  <TouchableOpacity
                    key={result.id}
                    style={[styles.clickedResultItem, {
                      backgroundColor: theme.colors.surface,
                      borderColor: theme.colors.border
                    }]}
                    onPress={async () => {
                      if (result.type === 'repo') {
                        navigation.navigate('RepoFileCity', {
                          owner: result.owner!,
                          name: result.name,
                          fullName: result.id,
                        });
                      } else if (result.githubType === 'Organization') {
                        navigation.navigate('Organization', {
                          orgLogin: result.login!,
                        });
                      } else {
                        navigation.navigate('UserProfile', {
                          username: result.login!,
                        });
                      }
                    }}
                  >
                    <Image
                      source={{ uri: result.avatarUrl }}
                      style={result.githubType === 'Organization' ? styles.clickedResultOrgAvatar : styles.clickedResultAvatar}
                    />
                    <View style={styles.clickedResultInfo}>
                      <Text style={[styles.clickedResultName, { color: theme.colors.text }]}>
                        {result.name}
                      </Text>
                      {result.owner && (
                        <Text style={[styles.clickedResultOwner, { color: theme.colors.textSecondary }]}>
                          {result.owner}
                        </Text>
                      )}
                    </View>
                    <LucideIcon
                      name={result.type === 'repo' ? 'FileCode2' : 'User'}
                      size={16}
                      color={theme.colors.textSecondary}
                    />
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}
        </View>
      )}

      {/* Tabs - Only show after search */}
      {hasSearched && (
        <View style={[styles.tabsContainer, { borderBottomColor: theme.colors.border }]}>
          <Pressable
            style={[
              styles.tab,
              activeTab === 'all' && [
                styles.activeTab,
                { borderBottomColor: theme.colors.primary },
              ],
            ]}
            onPress={() => setActiveTab('all')}
          >
            <Text style={[
              styles.tabText,
              { color: activeTab === 'all' ? theme.colors.text : theme.colors.textSecondary },
              activeTab === 'all' && styles.activeTabText
            ]}>
              All
            </Text>
          </Pressable>

          <Pressable
            style={[
              styles.tab,
              activeTab === 'repos' && [
                styles.activeTab,
                { borderBottomColor: theme.colors.primary },
              ],
            ]}
            onPress={() => setActiveTab('repos')}
          >
            <Text style={[
              styles.tabText,
              { color: activeTab === 'repos' ? theme.colors.text : theme.colors.textSecondary },
              activeTab === 'repos' && styles.activeTabText
            ]}>
              Repos
            </Text>
          </Pressable>

          <Pressable
            style={[
              styles.tab,
              activeTab === 'users' && [
                styles.activeTab,
                { borderBottomColor: theme.colors.primary },
              ],
            ]}
            onPress={() => setActiveTab('users')}
          >
            <Text style={[
              styles.tabText,
              { color: activeTab === 'users' ? theme.colors.text : theme.colors.textSecondary },
              activeTab === 'users' && styles.activeTabText
            ]}>
              Users
            </Text>
          </Pressable>
        </View>
      )}

      {/* Results */}
      {isSearching && !hasSearched ? (
        <View style={styles.loadingContainer}>
          <LoadingSpinner size="large" color={theme.colors.primary} />
          <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
            Searching...
          </Text>
        </View>
      ) : hasSearched ? (
        <>
          {/* All Tab - Combined results */}
          {activeTab === 'all' && (
            <SectionList
              sections={[
                repoResults.length > 0 && {
                  title: 'Repositories',
                  data: repoResults,
                  type: 'repo' as const
                },
                userResults.length > 0 && {
                  title: 'Users',
                  data: userResults,
                  type: 'user' as const
                }
              ].filter(Boolean) as Array<{
                title: string;
                data: (GitHubRepo | GitHubUser)[];
                type: 'repo' | 'user';
              }>}
              renderSectionHeader={({ section }) => (
                <View style={[styles.sectionHeader, { backgroundColor: theme.colors.background }]}>
                  <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>
                    {section.title}
                  </Text>
                </View>
              )}
              renderItem={({ item, section }) =>
                section.type === 'repo'
                  ? renderRepoItem({ item: item as GitHubRepo })
                  : renderUserItem({ item: item as GitHubUser })
              }
              keyExtractor={(item) =>
                'login' in item ? item.login : `${(item as GitHubRepo).owner}/${(item as GitHubRepo).name}`
              }
              contentContainerStyle={styles.resultsList}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  {repoError && <Text style={[styles.partialError, { color: theme.colors.error }]}>
                    Repos: {repoError}
                  </Text>}
                  {userError && <Text style={[styles.partialError, { color: theme.colors.error }]}>
                    Users: {userError}
                  </Text>}
                  {!repoError && !userError && (
                    <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
                      No results found for "{query}"
                    </Text>
                  )}
                </View>
              }
            />
          )}

          {/* Repos Tab */}
          {activeTab === 'repos' && (
            <FlatList
              data={repoResults}
              keyExtractor={(item) => `${item.owner}/${item.name}`}
              renderItem={renderRepoItem}
              contentContainerStyle={styles.resultsList}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  {repoError ? (
                    <Text style={[styles.emptyText, { color: theme.colors.error }]}>
                      {repoError}
                    </Text>
                  ) : (
                    <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
                      No repositories found for "{query}"
                    </Text>
                  )}
                </View>
              }
            />
          )}

          {/* Users Tab */}
          {activeTab === 'users' && (
            <FlatList
              data={userResults}
              keyExtractor={(item) => item.login}
              renderItem={renderUserItem}
              contentContainerStyle={styles.resultsList}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  {userError ? (
                    <Text style={[styles.emptyText, { color: theme.colors.error }]}>
                      {userError}
                    </Text>
                  ) : (
                    <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
                      No users found for "{query}"
                    </Text>
                  )}
                </View>
              }
            />
          )}
        </>
      ) : (searchHistory.length === 0 && clickedResults.length === 0) ? (
        <View style={styles.emptyStateContainer}>
          <CityIcon color={theme.colors.textSecondary} size={80} />
          <Text style={[styles.emptyStateTitle, { color: theme.colors.text }]}>
            Search Repositories & Users
          </Text>
          <Text style={[styles.emptyStateText, { color: theme.colors.textSecondary }]}>
            Search for repositories and users on GitHub. Results will appear as you type.
          </Text>
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
    paddingBottom: 16,
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 15,
    marginTop: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 12,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 48,
  },
  searchIconWrapper: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    height: '100%',
  },
  clearButton: {
    padding: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  errorText: {
    fontSize: 15,
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 20,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  resultsList: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 20,
  },
  resultsCount: {
    fontSize: 13,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  repoItem: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  repoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  repoHeaderWithAvatar: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  ownerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  orgAvatar: {
    width: 40,
    height: 40,
    borderRadius: 8,
  },
  repoInfo: {
    flex: 1,
  },
  repoName: {
    fontSize: 16,
    fontWeight: '600',
  },
  ownerName: {
    fontSize: 13,
    marginTop: 2,
  },
  repoStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 12,
    gap: 4,
  },
  starCount: {
    fontSize: 13,
  },
  repoDescription: {
    fontSize: 14,
    marginTop: 6,
    lineHeight: 20,
  },
  languageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  languageDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 6,
  },
  languageText: {
    fontSize: 12,
  },
  emptyContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 15,
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 20,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  // Icon styles
  iconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  clearLine: {
    position: 'absolute',
    borderRadius: 2,
  },
  cityIconContainer: {
    position: 'relative',
  },
  cityBuilding: {
    position: 'absolute',
    borderRadius: 2,
  },
  cityGround: {
    position: 'absolute',
    left: 0,
    right: 0,
    borderRadius: 1,
  },
  warningTriangle: {
    width: 0,
    height: 0,
  },
  warningExclamation: {
    position: 'absolute',
    borderRadius: 1,
  },
  warningDot: {
    position: 'absolute',
  },
  // Search History
  historyContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  historyTitle: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  clearHistory: {
    fontSize: 14,
    fontWeight: '500',
  },
  historyChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  historyChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
  },
  historyChipText: {
    fontSize: 14,
  },
  // Clicked Results
  clickedResultsList: {
    gap: 8,
  },
  clickedResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  clickedResultAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  clickedResultOrgAvatar: {
    width: 36,
    height: 36,
    borderRadius: 8,
  },
  clickedResultInfo: {
    flex: 1,
  },
  clickedResultName: {
    fontSize: 14,
    fontWeight: '600',
  },
  clickedResultOwner: {
    fontSize: 12,
    marginTop: 2,
  },
  // Tabs
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 8,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    // borderBottomColor set dynamically
  },
  tabText: {
    fontSize: 15,
    fontWeight: '500',
  },
  activeTabText: {
    fontWeight: '600',
  },
  countBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 24,
    alignItems: 'center',
  },
  countText: {
    fontSize: 12,
    fontWeight: '600',
  },
  // Section headers (for "All" tab)
  sectionHeader: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  // Partial error styling
  partialError: {
    fontSize: 13,
    marginBottom: 8,
    paddingHorizontal: 16,
  },
});

export default SearchTabScreen;
