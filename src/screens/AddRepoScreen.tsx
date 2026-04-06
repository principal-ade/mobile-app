import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Keyboard,
  SectionList,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '@principal-ade/industry-theme';
import {
  searchRepos,
  getSuggestedRepos,
  formatStars,
  type GitHubRepo,
  type SuggestedRepo,
} from '../services/GitHubSearchService';
import { followRepo } from '../services/FeedApiService';
import { getToken } from '../utils/authStorage';
import { saveFollowedRepos, getFollowedRepos, type FollowedRepo } from '../utils/feedStorage';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { RootStackParamList } from '../navigation/types';

type NavigationProp = StackNavigationProp<RootStackParamList, 'AddRepo'>;

interface SuggestionSection {
  title: string;
  data: SuggestedRepo[];
}

export function AddRepoScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GitHubRepo[]>([]);
  const [suggestions, setSuggestions] = useState<SuggestionSection[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  // Track repos added in this session and already-followed repos
  const [addedRepos, setAddedRepos] = useState<Set<string>>(new Set());
  const [alreadyFollowing, setAlreadyFollowing] = useState<Set<string>>(new Set());
  const tokenRef = useRef<string | null>(null);

  // Load suggestions and already-followed repos on mount
  useEffect(() => {
    async function loadData() {
      try {
        const token = await getToken();
        tokenRef.current = token;

        // Load already-followed repos
        const followedRepos = await getFollowedRepos();
        if (followedRepos) {
          setAlreadyFollowing(
            new Set(followedRepos.map((r) => `${r.owner}/${r.repo}`.toLowerCase()))
          );
        }

        // Load suggestions
        const { repos } = await getSuggestedRepos(token);

        // Group by source
        const starred = repos.filter((r) => r.source === 'starred');
        const orgRepos = repos.filter((r) => r.source === 'org');

        const sections: SuggestionSection[] = [];
        if (starred.length > 0) {
          sections.push({ title: 'Your Starred Repos', data: starred });
        }
        if (orgRepos.length > 0) {
          sections.push({ title: 'From Your Organizations', data: orgRepos });
        }
        setSuggestions(sections);
      } catch (err) {
        console.error('Failed to load data:', err);
      } finally {
        setIsLoadingSuggestions(false);
      }
    }
    loadData();
  }, []);

  // Debounced search
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setHasSearched(false);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setIsSearching(true);
      setError(null);
      try {
        const { repos } = await searchRepos(query, { perPage: 15 });
        setResults(repos);
        setHasSearched(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Search failed');
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [query]);

  const handleSelectRepo = useCallback(
    async (owner: string, name: string) => {
      // Don't add if already following or just added
      const repoKey = `${owner}/${name}`.toLowerCase();
      if (alreadyFollowing.has(repoKey) || addedRepos.has(repoKey)) {
        return;
      }

      Keyboard.dismiss();

      // Add to local state immediately for UI feedback
      setAddedRepos((prev) => new Set(prev).add(repoKey));

      // Sync to API and local storage
      try {
        // Add to local storage
        const currentRepos = (await getFollowedRepos()) ?? [];
        const newRepo: FollowedRepo = { owner, repo: name };
        await saveFollowedRepos([...currentRepos, newRepo]);

        // Sync to API if authenticated
        if (tokenRef.current) {
          await followRepo(tokenRef.current, owner, name);
        }
      } catch (err) {
        console.warn('Failed to sync follow:', err);
        // Still keep in addedRepos for UI - will sync later
      }
    },
    [alreadyFollowing, addedRepos]
  );

  const renderSearchResult = useCallback(
    ({ item }: { item: GitHubRepo }) => {
      const repoKey = `${item.owner}/${item.name}`.toLowerCase();
      const isFollowing = alreadyFollowing.has(repoKey);
      const isAdded = addedRepos.has(repoKey);
      const isDisabled = isFollowing || isAdded;

      return (
        <TouchableOpacity
          style={[styles.repoItem, { borderBottomColor: theme.colors.border }]}
          onPress={() => handleSelectRepo(item.owner, item.name)}
          activeOpacity={isDisabled ? 1 : 0.7}
          disabled={isDisabled}
        >
          <View style={styles.repoContent}>
            <View style={styles.repoHeader}>
              <Text
                style={[styles.repoName, { color: theme.colors.text }]}
                numberOfLines={1}
              >
                {item.full_name}
              </Text>
              <View style={styles.metaRow}>
                {item.language && (
                  <Text style={[styles.language, { color: theme.colors.textSecondary }]}>
                    {item.language}
                  </Text>
                )}
                <Text style={[styles.stars, { color: theme.colors.textSecondary }]}>
                  ★ {formatStars(item.stargazers_count)}
                </Text>
              </View>
            </View>
            {item.description && (
              <Text
                style={[styles.description, { color: theme.colors.textSecondary }]}
                numberOfLines={2}
              >
                {item.description}
              </Text>
            )}
          </View>
          <Text
            style={[
              styles.addText,
              { color: isDisabled ? theme.colors.textSecondary : theme.colors.primary },
            ]}
          >
            {isFollowing ? 'Following' : isAdded ? 'Added' : 'Add'}
          </Text>
        </TouchableOpacity>
      );
    },
    [theme, handleSelectRepo, alreadyFollowing, addedRepos]
  );

  const renderSuggestion = useCallback(
    ({ item }: { item: SuggestedRepo }) => {
      const repoKey = `${item.owner}/${item.name}`.toLowerCase();
      const isFollowing = alreadyFollowing.has(repoKey);
      const isAdded = addedRepos.has(repoKey);
      const isDisabled = isFollowing || isAdded;

      return (
        <TouchableOpacity
          style={[styles.repoItem, { borderBottomColor: theme.colors.border }]}
          onPress={() => handleSelectRepo(item.owner, item.name)}
          activeOpacity={isDisabled ? 1 : 0.7}
          disabled={isDisabled}
        >
          <View style={styles.repoContent}>
            <View style={styles.repoHeader}>
              <Text
                style={[styles.repoName, { color: theme.colors.text }]}
                numberOfLines={1}
              >
                {item.full_name}
              </Text>
              <View style={styles.metaRow}>
                {item.language && (
                  <Text style={[styles.language, { color: theme.colors.textSecondary }]}>
                    {item.language}
                  </Text>
                )}
                <Text style={[styles.stars, { color: theme.colors.textSecondary }]}>
                  ★ {formatStars(item.stargazers_count)}
                </Text>
              </View>
            </View>
            {item.description && (
              <Text
                style={[styles.description, { color: theme.colors.textSecondary }]}
                numberOfLines={2}
              >
                {item.description}
              </Text>
            )}
          </View>
          <Text
            style={[
              styles.addText,
              { color: isDisabled ? theme.colors.textSecondary : theme.colors.primary },
            ]}
          >
            {isFollowing ? 'Following' : isAdded ? 'Added' : 'Add'}
          </Text>
        </TouchableOpacity>
      );
    },
    [theme, handleSelectRepo, alreadyFollowing, addedRepos]
  );

  const renderSectionHeader = useCallback(
    ({ section }: { section: SuggestionSection }) => (
      <View style={[styles.sectionHeader, { backgroundColor: theme.colors.background }]}>
        <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>
          {section.title}
        </Text>
      </View>
    ),
    [theme]
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          { paddingTop: insets.top + 8, borderBottomColor: theme.colors.border },
        ]}
      >
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.cancelButton}>
          <Text
            style={[
              styles.cancelText,
              { color: addedRepos.size > 0 ? theme.colors.primary : theme.colors.textSecondary },
            ]}
          >
            {addedRepos.size > 0 ? 'Done' : 'Cancel'}
          </Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
          Add Repository
        </Text>
        <View style={styles.cancelButton} />
      </View>

      {/* Search Input */}
      <View style={[styles.searchContainer, { backgroundColor: theme.colors.surface }]}>
        <TextInput
          style={[
            styles.searchInput,
            {
              backgroundColor: theme.colors.background,
              color: theme.colors.text,
              borderColor: theme.colors.border,
            },
          ]}
          placeholder="Search GitHub repositories..."
          placeholderTextColor={theme.colors.textSecondary}
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
          autoCorrect={false}
          autoFocus
          returnKeyType="search"
        />
      </View>

      {/* Results or Suggestions */}
      {isSearching ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.centerContainer}>
          <Text style={[styles.errorText, { color: theme.colors.error }]}>{error}</Text>
        </View>
      ) : results.length > 0 ? (
        <FlatList
          data={results}
          keyExtractor={(item) => item.full_name}
          renderItem={renderSearchResult}
          contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
          keyboardShouldPersistTaps="handled"
        />
      ) : hasSearched ? (
        <View style={styles.centerContainer}>
          <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
            No repositories found for "{query}"
          </Text>
        </View>
      ) : isLoadingSuggestions ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : suggestions.length > 0 ? (
        <SectionList
          sections={suggestions}
          keyExtractor={(item) => item.full_name}
          renderItem={renderSuggestion}
          renderSectionHeader={renderSectionHeader}
          contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
          keyboardShouldPersistTaps="handled"
          stickySectionHeadersEnabled={false}
        />
      ) : (
        <View style={styles.centerContainer}>
          <Text style={[styles.hintText, { color: theme.colors.textSecondary }]}>
            Search for GitHub repositories to follow
          </Text>
        </View>
      )}
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
  cancelButton: {
    width: 60,
  },
  cancelText: {
    fontSize: 17,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  searchContainer: {
    padding: 16,
  },
  searchInput: {
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  repoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  repoContent: {
    flex: 1,
    marginRight: 12,
  },
  repoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  repoName: {
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  language: {
    fontSize: 12,
  },
  stars: {
    fontSize: 12,
  },
  description: {
    fontSize: 13,
    lineHeight: 18,
  },
  addText: {
    fontSize: 15,
    fontWeight: '600',
  },
  errorText: {
    fontSize: 15,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 15,
    textAlign: 'center',
  },
  hintText: {
    fontSize: 15,
    textAlign: 'center',
  },
  sectionHeader: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
});

export default AddRepoScreen;
