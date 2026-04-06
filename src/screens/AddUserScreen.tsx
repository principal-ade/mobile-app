import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Image,
  Keyboard,
  SectionList,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTheme } from '@principal-ade/industry-theme';
import {
  searchUsers,
  getSuggestedUsers,
  type GitHubUser,
  type SuggestedUser,
} from '../services/GitHubSearchService';
import { followUser } from '../services/FeedApiService';
import { getToken } from '../utils/authStorage';
import { saveFollowedUsers, getFollowedUsers, type FollowedUser } from '../utils/feedStorage';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { RootStackParamList } from '../navigation/types';

type NavigationProp = StackNavigationProp<RootStackParamList, 'AddUser'>;

interface SuggestionSection {
  title: string;
  data: SuggestedUser[];
}

export function AddUserScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GitHubUser[]>([]);
  const [suggestions, setSuggestions] = useState<SuggestionSection[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  // Track users added in this session and already-followed users
  const [addedUsers, setAddedUsers] = useState<Set<string>>(new Set());
  const [alreadyFollowing, setAlreadyFollowing] = useState<Set<string>>(new Set());
  const tokenRef = useRef<string | null>(null);

  // Load suggestions and already-followed users on mount
  useEffect(() => {
    async function loadData() {
      try {
        const token = await getToken();
        tokenRef.current = token;

        // Load already-followed users
        const followedUsers = await getFollowedUsers();
        if (followedUsers) {
          setAlreadyFollowing(new Set(followedUsers.map((u) => u.login.toLowerCase())));
        }

        // Load suggestions
        const { users } = await getSuggestedUsers(token);

        // Group by source
        const following = users.filter((u) => u.source === 'following');
        const orgMembers = users.filter((u) => u.source === 'org');

        const sections: SuggestionSection[] = [];
        if (following.length > 0) {
          sections.push({ title: 'People You Follow', data: following });
        }
        if (orgMembers.length > 0) {
          sections.push({ title: 'From Your Organizations', data: orgMembers });
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
        const { users } = await searchUsers(query, { perPage: 15 });
        setResults(users);
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

  const handleSelectUser = useCallback(
    async (login: string, avatarUrl: string) => {
      // Don't add if already following or just added
      const loginLower = login.toLowerCase();
      if (alreadyFollowing.has(loginLower) || addedUsers.has(loginLower)) {
        return;
      }

      Keyboard.dismiss();

      // Add to local state immediately for UI feedback
      setAddedUsers((prev) => new Set(prev).add(loginLower));

      // Sync to API and local storage
      try {
        // Add to local storage
        const currentUsers = (await getFollowedUsers()) ?? [];
        const newUser: FollowedUser = { login, avatarUrl };
        await saveFollowedUsers([...currentUsers, newUser]);

        // Sync to API if authenticated
        if (tokenRef.current) {
          await followUser(tokenRef.current, login);
        }
      } catch (err) {
        console.warn('Failed to sync follow:', err);
        // Still keep in addedUsers for UI - will sync later
      }
    },
    [alreadyFollowing, addedUsers]
  );

  const renderSearchResult = useCallback(
    ({ item }: { item: GitHubUser }) => {
      const loginLower = item.login.toLowerCase();
      const isFollowing = alreadyFollowing.has(loginLower);
      const isAdded = addedUsers.has(loginLower);
      const isDisabled = isFollowing || isAdded;

      return (
        <TouchableOpacity
          style={[styles.userItem, { borderBottomColor: theme.colors.border }]}
          onPress={() => handleSelectUser(item.login, item.avatar_url)}
          activeOpacity={isDisabled ? 1 : 0.7}
          disabled={isDisabled}
        >
          <Image source={{ uri: item.avatar_url }} style={styles.avatar} />
          <View style={styles.userInfo}>
            <Text style={[styles.username, { color: theme.colors.text }]}>
              @{item.login}
            </Text>
            {item.type && (
              <Text style={[styles.userType, { color: theme.colors.textSecondary }]}>
                {item.type}
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
    [theme, handleSelectUser, alreadyFollowing, addedUsers]
  );

  const renderSuggestion = useCallback(
    ({ item }: { item: SuggestedUser }) => {
      const loginLower = item.login.toLowerCase();
      const isFollowing = alreadyFollowing.has(loginLower);
      const isAdded = addedUsers.has(loginLower);
      const isDisabled = isFollowing || isAdded;

      return (
        <TouchableOpacity
          style={[styles.userItem, { borderBottomColor: theme.colors.border }]}
          onPress={() => handleSelectUser(item.login, item.avatar_url)}
          activeOpacity={isDisabled ? 1 : 0.7}
          disabled={isDisabled}
        >
          <Image source={{ uri: item.avatar_url }} style={styles.avatar} />
          <View style={styles.userInfo}>
            <Text style={[styles.username, { color: theme.colors.text }]}>
              @{item.login}
            </Text>
            {item.name && (
              <Text style={[styles.userType, { color: theme.colors.textSecondary }]}>
                {item.name}
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
    [theme, handleSelectUser, alreadyFollowing, addedUsers]
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
              { color: addedUsers.size > 0 ? theme.colors.primary : theme.colors.textSecondary },
            ]}
          >
            {addedUsers.size > 0 ? 'Done' : 'Cancel'}
          </Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Add User</Text>
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
          placeholder="Search GitHub users..."
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
          keyExtractor={(item) => item.login}
          renderItem={renderSearchResult}
          contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
          keyboardShouldPersistTaps="handled"
        />
      ) : hasSearched ? (
        <View style={styles.centerContainer}>
          <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
            No users found for "{query}"
          </Text>
        </View>
      ) : isLoadingSuggestions ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : suggestions.length > 0 ? (
        <SectionList
          sections={suggestions}
          keyExtractor={(item) => item.login}
          renderItem={renderSuggestion}
          renderSectionHeader={renderSectionHeader}
          contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
          keyboardShouldPersistTaps="handled"
          stickySectionHeadersEnabled={false}
        />
      ) : (
        <View style={styles.centerContainer}>
          <Text style={[styles.hintText, { color: theme.colors.textSecondary }]}>
            Search for GitHub users to follow
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
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 12,
  },
  userInfo: {
    flex: 1,
  },
  username: {
    fontSize: 16,
    fontWeight: '500',
  },
  userType: {
    fontSize: 13,
    marginTop: 2,
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

export default AddUserScreen;
