import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  Keyboard,
} from 'react-native';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@principal-ade/industry-theme';
import {
  getSuggestedUsers,
  getSuggestedRepos,
  searchUsers,
  searchRepos,
  formatStars,
  type SuggestedUser,
  type SuggestedRepo,
  type GitHubUser,
  type GitHubRepo,
} from '../services/GitHubSearchService';
import { FEATURED_REPOS } from '../services/ActivityFeedService';
import { watchUser, watchRepo } from '../services/FeedApiService';
import { useAuthContext } from '../context/AuthContext';
import { useFeedPreferences } from '../context/FeedPreferencesContext';

interface FeedOnboardingScreenProps {
  onComplete: () => void;
}

interface SelectedUser {
  login: string;
  avatarUrl: string;
}

interface SelectedRepo {
  owner: string;
  repo: string;
}

export default function FeedOnboardingScreen({ onComplete }: FeedOnboardingScreenProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { token } = useAuthContext();
  const { addUser, addRepo } = useFeedPreferences();

  // Step state
  const [step, setStep] = useState<1 | 2>(1);

  // Selection state
  const [selectedUsers, setSelectedUsers] = useState<SelectedUser[]>([]);
  const [selectedRepos, setSelectedRepos] = useState<SelectedRepo[]>([]);

  // Users step state
  const [suggestedUsers, setSuggestedUsers] = useState<SuggestedUser[]>([]);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userSearchResults, setUserSearchResults] = useState<GitHubUser[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [isSearchingUsers, setIsSearchingUsers] = useState(false);

  // Repos step state
  const [suggestedRepos, setSuggestedRepos] = useState<SuggestedRepo[]>([]);
  const [repoSearchQuery, setRepoSearchQuery] = useState('');
  const [repoSearchResults, setRepoSearchResults] = useState<GitHubRepo[]>([]);
  const [isLoadingRepos, setIsLoadingRepos] = useState(true);
  const [isSearchingRepos, setIsSearchingRepos] = useState(false);

  // Saving state
  const [isSaving, setIsSaving] = useState(false);

  // Load suggested users on mount
  useEffect(() => {
    async function loadSuggestedUsers() {
      try {
        const { users } = await getSuggestedUsers(token);
        setSuggestedUsers(users);
      } catch (err) {
        console.warn('Failed to load suggested users:', err);
      } finally {
        setIsLoadingUsers(false);
      }
    }
    loadSuggestedUsers();
  }, [token]);

  // Load suggested repos when entering step 2
  useEffect(() => {
    if (step !== 2) return;

    async function loadSuggestedRepos() {
      try {
        const { repos } = await getSuggestedRepos(token);

        // Combine with featured repos
        const featuredAsRepos: SuggestedRepo[] = FEATURED_REPOS.map((fullName, index) => {
          const [owner, name] = fullName.split('/') as [string, string];
          return {
            id: index + 1,
            owner,
            name,
            full_name: fullName,
            description: null,
            stargazers_count: 0,
            language: null,
            owner_avatar_url: `https://github.com/${owner}.png`,
            source: 'starred' as const,
          };
        });

        // Dedupe: prefer API repos over featured
        const repoMap = new Map<string, SuggestedRepo>();
        featuredAsRepos.forEach((r) => repoMap.set(r.full_name, r));
        repos.forEach((r) => repoMap.set(r.full_name, r));

        setSuggestedRepos(Array.from(repoMap.values()));
      } catch (err) {
        console.warn('Failed to load suggested repos:', err);
        // Fallback to featured repos only
        const featuredAsRepos: SuggestedRepo[] = FEATURED_REPOS.map((fullName, index) => {
          const [owner, name] = fullName.split('/') as [string, string];
          return {
            id: index + 1,
            owner,
            name,
            full_name: fullName,
            description: null,
            stargazers_count: 0,
            language: null,
            owner_avatar_url: `https://github.com/${owner}.png`,
            source: 'starred' as const,
          };
        });
        setSuggestedRepos(featuredAsRepos);
      } finally {
        setIsLoadingRepos(false);
      }
    }
    loadSuggestedRepos();
  }, [step, token]);

  // Debounced user search
  useEffect(() => {
    if (!userSearchQuery.trim()) {
      setUserSearchResults([]);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setIsSearchingUsers(true);
      try {
        const { users } = await searchUsers(userSearchQuery, { perPage: 10 });
        setUserSearchResults(users);
      } catch (err) {
        console.warn('User search failed:', err);
      } finally {
        setIsSearchingUsers(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [userSearchQuery]);

  // Debounced repo search
  useEffect(() => {
    if (!repoSearchQuery.trim()) {
      setRepoSearchResults([]);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setIsSearchingRepos(true);
      try {
        const { repos } = await searchRepos(repoSearchQuery, { perPage: 10 });
        setRepoSearchResults(repos);
      } catch (err) {
        console.warn('Repo search failed:', err);
      } finally {
        setIsSearchingRepos(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [repoSearchQuery]);

  const toggleUser = useCallback((login: string, avatarUrl: string) => {
    setSelectedUsers((prev) => {
      const exists = prev.some((u) => u.login === login);
      if (exists) {
        return prev.filter((u) => u.login !== login);
      }
      return [...prev, { login, avatarUrl }];
    });
  }, []);

  const toggleRepo = useCallback((owner: string, repo: string) => {
    setSelectedRepos((prev) => {
      const exists = prev.some((r) => r.owner === owner && r.repo === repo);
      if (exists) {
        return prev.filter((r) => !(r.owner === owner && r.repo === repo));
      }
      return [...prev, { owner, repo }];
    });
  }, []);

  const isRepoSelected = useCallback(
    (owner: string, repo: string) => {
      return selectedRepos.some((r) => r.owner === owner && r.repo === repo);
    },
    [selectedRepos]
  );

  const handleNext = useCallback(() => {
    Keyboard.dismiss();
    setStep(2);
  }, []);

  const handleComplete = useCallback(async () => {
    Keyboard.dismiss();
    setIsSaving(true);

    try {
      // Add all selected users - update context AND backend
      for (const user of selectedUsers) {
        try {
          // Update local context immediately (for UI responsiveness)
          addUser({
            login: user.login,
            avatarUrl: user.avatarUrl,
            watchedAt: new Date().toISOString(),
          });

          // Also update backend
          if (token) {
            await watchUser(token, user.login);
          }
        } catch (err) {
          console.warn(`Failed to follow user ${user.login}:`, err);
        }
      }

      // Add all selected repos - update context AND backend
      for (const { owner, repo } of selectedRepos) {
        try {
          // Update local context immediately (for UI responsiveness)
          addRepo({
            owner,
            repo,
            watchedAt: new Date().toISOString(),
            isFeatured: false,
          });

          // Also update backend
          if (token) {
            await watchRepo(token, owner, repo);
          }
        } catch (err) {
          console.warn(`Failed to follow repo ${owner}/${repo}:`, err);
        }
      }
    } catch (err) {
      console.warn('Error during onboarding completion:', err);
    } finally {
      setIsSaving(false);
      onComplete();
    }
  }, [selectedUsers, selectedRepos, onComplete, addUser, addRepo, token]);

  const handleSkip = useCallback(() => {
    Keyboard.dismiss();
    if (step === 1) {
      setStep(2);
    } else {
      handleComplete();
    }
  }, [step, handleComplete]);

  // Render user chip
  const renderUserChip = useCallback(
    (user: { login: string; avatar_url: string; name?: string | null }) => {
      const isSelected = selectedUsers.some((u) => u.login === user.login);
      return (
        <TouchableOpacity
          key={user.login}
          style={[
            styles.chip,
            {
              backgroundColor: isSelected ? theme.colors.primary : theme.colors.surface,
              borderColor: isSelected ? theme.colors.primary : theme.colors.border,
            },
          ]}
          onPress={() => toggleUser(user.login, user.avatar_url)}
          activeOpacity={0.7}
        >
          <Image source={{ uri: user.avatar_url }} style={styles.chipAvatar} />
          <Text
            style={[
              styles.chipText,
              { color: isSelected ? '#fff' : theme.colors.text },
            ]}
            numberOfLines={1}
          >
            {user.name || user.login}
          </Text>
        </TouchableOpacity>
      );
    },
    [selectedUsers, theme, toggleUser]
  );

  // Render repo chip
  const renderRepoChip = useCallback(
    (repo: { owner: string; name: string; full_name: string; stargazers_count: number }) => {
      const isSelected = isRepoSelected(repo.owner, repo.name);
      return (
        <TouchableOpacity
          key={repo.full_name}
          style={[
            styles.chip,
            {
              backgroundColor: isSelected ? theme.colors.primary : theme.colors.surface,
              borderColor: isSelected ? theme.colors.primary : theme.colors.border,
            },
          ]}
          onPress={() => toggleRepo(repo.owner, repo.name)}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.chipText,
              { color: isSelected ? '#fff' : theme.colors.text },
            ]}
            numberOfLines={1}
          >
            {repo.full_name}
          </Text>
          {repo.stargazers_count > 0 && (
            <Text
              style={[
                styles.chipMeta,
                { color: isSelected ? 'rgba(255,255,255,0.8)' : theme.colors.textSecondary },
              ]}
            >
              {formatStars(repo.stargazers_count)}
            </Text>
          )}
        </TouchableOpacity>
      );
    },
    [isRepoSelected, theme, toggleRepo]
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
        <TouchableOpacity onPress={handleSkip} style={styles.skipButton}>
          <Text style={[styles.skipText, { color: theme.colors.textSecondary }]}>
            Skip
          </Text>
        </TouchableOpacity>
        <Text style={[styles.stepIndicator, { color: theme.colors.textSecondary }]}>
          Step {step} of 2
        </Text>
        <View style={styles.skipButton} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        {step === 1 ? (
          <>
            {/* Step 1: Follow Users */}
            <Text style={[styles.title, { color: theme.colors.text }]}>
              Follow developers you care about
            </Text>
            <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
              Get updates on commits and contributions from people you follow
            </Text>

            {/* Search Input */}
            <TextInput
              style={[
                styles.searchInput,
                {
                  backgroundColor: theme.colors.surface,
                  color: theme.colors.text,
                  borderColor: theme.colors.border,
                },
              ]}
              placeholder="Find developers..."
              placeholderTextColor={theme.colors.textSecondary}
              value={userSearchQuery}
              onChangeText={setUserSearchQuery}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
              blurOnSubmit={true}
              onSubmitEditing={() => Keyboard.dismiss()}
            />

            {/* Search Results */}
            {isSearchingUsers && (
              <View style={styles.loader}>
                <LoadingSpinner size="small" color={theme.colors.primary} />
              </View>
            )}

            {userSearchResults.length > 0 && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>
                  Search Results
                </Text>
                <View style={styles.chipGrid}>
                  {userSearchResults.map((user) => renderUserChip(user))}
                </View>
              </View>
            )}

            {/* Suggestions */}
            {isLoadingUsers ? (
              <View style={styles.loader}>
                <LoadingSpinner size="large" color={theme.colors.primary} />
              </View>
            ) : suggestedUsers.length > 0 ? (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>
                  Suggested Users
                </Text>
                <View style={styles.chipGrid}>
                  {suggestedUsers.map((user) => renderUserChip(user))}
                </View>
              </View>
            ) : (
              <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
                No suggestions yet. Search for developers or teammates to follow
              </Text>
            )}
          </>
        ) : (
          <>
            {/* Step 2: Follow Repos */}
            <Text style={[styles.title, { color: theme.colors.text }]}>
              Watch repositories that matter
            </Text>
            <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
              Stay updated on commits and activity from projects you care about
            </Text>

            {/* Search Input */}
            <TextInput
              style={[
                styles.searchInput,
                {
                  backgroundColor: theme.colors.surface,
                  color: theme.colors.text,
                  borderColor: theme.colors.border,
                },
              ]}
              placeholder="Find repositories..."
              placeholderTextColor={theme.colors.textSecondary}
              value={repoSearchQuery}
              onChangeText={setRepoSearchQuery}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
              blurOnSubmit={true}
              onSubmitEditing={() => Keyboard.dismiss()}
            />

            {/* Search Results */}
            {isSearchingRepos && (
              <View style={styles.loader}>
                <LoadingSpinner size="small" color={theme.colors.primary} />
              </View>
            )}

            {repoSearchResults.length > 0 && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>
                  Search Results
                </Text>
                <View style={styles.chipGrid}>
                  {repoSearchResults.map((repo) => renderRepoChip(repo))}
                </View>
              </View>
            )}

            {/* Suggestions */}
            {isLoadingRepos ? (
              <View style={styles.loader}>
                <LoadingSpinner size="large" color={theme.colors.primary} />
              </View>
            ) : suggestedRepos.length > 0 ? (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>
                  Featured & Recommended
                </Text>
                <View style={styles.chipGrid}>
                  {suggestedRepos.map((repo) => renderRepoChip(repo))}
                </View>
              </View>
            ) : (
              <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
                No suggestions available. Search for your favorite projects
              </Text>
            )}
          </>
        )}
      </ScrollView>

      {/* Footer with action button */}
      <View
        style={[
          styles.footer,
          {
            paddingBottom: insets.bottom + 16,
            backgroundColor: theme.colors.background,
            borderTopColor: theme.colors.border,
          },
        ]}
      >
        {step === 1 ? (
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: theme.colors.primary }]}
            onPress={handleNext}
            activeOpacity={0.8}
          >
            <Text style={styles.actionButtonText}>
              Continue{selectedUsers.length > 0 ? ` (${selectedUsers.length} ${selectedUsers.length === 1 ? 'user' : 'users'})` : ''}
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[
              styles.actionButton,
              { backgroundColor: isSaving ? theme.colors.border : theme.colors.primary },
            ]}
            onPress={handleComplete}
            activeOpacity={0.8}
            disabled={isSaving}
          >
            {isSaving ? (
              <LoadingSpinner size="small" color="#fff" />
            ) : (
              <Text style={styles.actionButtonText}>
                Complete Setup{selectedRepos.length > 0 ? ` (${selectedRepos.length} ${selectedRepos.length === 1 ? 'repo' : 'repos'})` : ''}
              </Text>
            )}
          </TouchableOpacity>
        )}
      </View>
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
  skipButton: {
    width: 60,
  },
  skipText: {
    fontSize: 17,
  },
  stepIndicator: {
    fontSize: 15,
    fontWeight: '500',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginTop: 24,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 24,
  },
  searchInput: {
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontSize: 16,
    marginBottom: 16,
  },
  loader: {
    marginVertical: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    maxWidth: '100%',
  },
  chipAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 8,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '500',
    flexShrink: 1,
  },
  chipMeta: {
    fontSize: 12,
    marginLeft: 6,
  },
  emptyText: {
    fontSize: 15,
    textAlign: 'center',
    marginTop: 32,
  },
  footer: {
    paddingTop: 16,
    paddingHorizontal: 16,
    borderTopWidth: 1,
  },
  actionButton: {
    height: 50,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },
});
