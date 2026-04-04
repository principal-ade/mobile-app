import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { RouteProp } from '@react-navigation/native';
import { useTheme } from '@principal-ade/industry-theme';
import { FEATURED_REPOS } from '../services/ActivityFeedService';
import {
  type FollowedUser,
  type FollowedRepo,
  getFollowedUsers,
  getFollowedRepos,
  saveFollowedUsers,
  saveFollowedRepos,
} from '../utils/feedStorage';
import type { RootStackParamList } from '../navigation/types';

type NavigationProp = StackNavigationProp<RootStackParamList, 'FeedCustomization'>;
type ScreenRouteProp = RouteProp<RootStackParamList, 'FeedCustomization'>;

// Parse featured repos into structured format
const DEFAULT_REPOS: FollowedRepo[] = FEATURED_REPOS.map((fullName) => {
  const [owner, name] = fullName.split('/') as [string, string];
  return { owner, name, isFeatured: true };
});

export function FeedCustomizationScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<ScreenRouteProp>();

  const [isLoading, setIsLoading] = useState(true);
  const [followedUsers, setFollowedUsers] = useState<FollowedUser[]>([]);
  const [followedRepos, setFollowedRepos] = useState<FollowedRepo[]>([]);

  // Load saved data on mount
  useEffect(() => {
    async function loadData() {
      try {
        const [savedUsers, savedRepos] = await Promise.all([
          getFollowedUsers(),
          getFollowedRepos(),
        ]);
        setFollowedUsers(savedUsers ?? []);
        // Use saved repos if available, otherwise use defaults
        setFollowedRepos(savedRepos ?? DEFAULT_REPOS);
      } catch (error) {
        console.error('Failed to load feed settings:', error);
        setFollowedRepos(DEFAULT_REPOS);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  // Handle added user from AddUserScreen
  useEffect(() => {
    const addedUser = route.params?.addedUser;
    if (addedUser && !isLoading) {
      const alreadyFollowing = followedUsers.some(
        (u) => u.username.toLowerCase() === addedUser.toLowerCase()
      );
      if (!alreadyFollowing) {
        setFollowedUsers((prev) => [...prev, { username: addedUser }]);
      }
      // Clear the param to prevent re-adding on re-render
      navigation.setParams({ addedUser: undefined });
    }
  }, [route.params?.addedUser, isLoading, followedUsers, navigation]);

  // Handle added repo from AddRepoScreen
  useEffect(() => {
    const addedRepo = route.params?.addedRepo;
    if (addedRepo && !isLoading) {
      const alreadyFollowing = followedRepos.some(
        (r) =>
          r.owner.toLowerCase() === addedRepo.owner.toLowerCase() &&
          r.name.toLowerCase() === addedRepo.name.toLowerCase()
      );
      if (!alreadyFollowing) {
        setFollowedRepos((prev) => [...prev, { owner: addedRepo.owner, name: addedRepo.name }]);
      }
      // Clear the param to prevent re-adding on re-render
      navigation.setParams({ addedRepo: undefined });
    }
  }, [route.params?.addedRepo, isLoading, followedRepos, navigation]);

  // Save users when they change
  useEffect(() => {
    if (!isLoading) {
      saveFollowedUsers(followedUsers).catch(console.error);
    }
  }, [followedUsers, isLoading]);

  // Save repos when they change
  useEffect(() => {
    if (!isLoading) {
      saveFollowedRepos(followedRepos).catch(console.error);
    }
  }, [followedRepos, isLoading]);

  const handleRemoveUser = useCallback((username: string) => {
    setFollowedUsers((prev) => prev.filter((u) => u.username !== username));
  }, []);

  const handleRemoveRepo = useCallback((owner: string, name: string) => {
    setFollowedRepos((prev) => prev.filter((r) => !(r.owner === owner && r.name === name)));
  }, []);

  const handleResetToDefaults = useCallback(() => {
    Alert.alert(
      'Reset to Defaults',
      'This will remove all your customizations and restore the default featured repositories. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            setFollowedUsers([]);
            setFollowedRepos(DEFAULT_REPOS);
          },
        },
      ]
    );
  }, []);

  const hasCustomizations =
    followedUsers.length > 0 ||
    followedRepos.length !== DEFAULT_REPOS.length ||
    followedRepos.some((r) => !r.isFeatured);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8, borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={[styles.backText, { color: theme.colors.primary }]}>Back</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Customize Feed</Text>
        <View style={styles.backButton} />
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : (
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 24 }]}
      >
        {/* Users Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>
            USERS YOU FOLLOW
          </Text>
          <View style={[styles.sectionContent, { backgroundColor: theme.colors.surface }]}>
            {followedUsers.length === 0 && (
              <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
                No users followed yet
              </Text>
            )}
            {followedUsers.map((user) => (
              <View
                key={user.username}
                style={[styles.listItem, { borderBottomColor: theme.colors.border }]}
              >
                <View style={styles.listItemContent}>
                  <View style={[styles.avatar, { backgroundColor: theme.colors.primary }]}>
                    <Text style={styles.avatarText}>
                      {user.username.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <Text style={[styles.listItemText, { color: theme.colors.text }]}>
                    @{user.username}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => handleRemoveUser(user.username)}
                  style={styles.removeButton}
                >
                  <Text style={[styles.removeText, { color: theme.colors.error }]}>Remove</Text>
                </TouchableOpacity>
              </View>
            ))}
            <TouchableOpacity
              onPress={() => navigation.navigate('AddUser')}
              style={[styles.addButton, { borderTopColor: theme.colors.border }]}
            >
              <Text style={[styles.addButtonText, { color: theme.colors.primary }]}>
                + Add User
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Repos Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>
            REPOSITORIES YOU FOLLOW
          </Text>
          <View style={[styles.sectionContent, { backgroundColor: theme.colors.surface }]}>
            {followedRepos.length === 0 && (
              <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
                No repositories followed yet
              </Text>
            )}
            {followedRepos.map((repo) => (
              <View
                key={`${repo.owner}/${repo.name}`}
                style={[styles.listItem, { borderBottomColor: theme.colors.border }]}
              >
                <View style={styles.listItemContent}>
                  <View style={[styles.repoIcon, { backgroundColor: repo.isFeatured ? theme.colors.primary : theme.colors.textSecondary }]}>
                    <Text style={styles.repoIconText}>{repo.isFeatured ? '★' : 'R'}</Text>
                  </View>
                  <View style={styles.repoTextContainer}>
                    <Text style={[styles.listItemText, { color: theme.colors.text }]}>
                      {repo.owner}/{repo.name}
                    </Text>
                    {repo.isFeatured && (
                      <Text style={[styles.featuredBadge, { color: theme.colors.textSecondary }]}>
                        Featured
                      </Text>
                    )}
                  </View>
                </View>
                <TouchableOpacity
                  onPress={() => handleRemoveRepo(repo.owner, repo.name)}
                  style={styles.removeButton}
                >
                  <Text style={[styles.removeText, { color: theme.colors.error }]}>Remove</Text>
                </TouchableOpacity>
              </View>
            ))}
            <TouchableOpacity
              onPress={() => navigation.navigate('AddRepo')}
              style={[styles.addButton, { borderTopColor: theme.colors.border }]}
            >
              <Text style={[styles.addButtonText, { color: theme.colors.primary }]}>
                + Add Repository
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Info text */}
        <Text style={[styles.infoText, { color: theme.colors.textSecondary }]}>
          Your feed will show activity from the users and repositories you follow. Featured repositories (★) are popular projects included by default — remove any you're not interested in.
        </Text>

        {/* Reset button */}
        {hasCustomizations && (
          <TouchableOpacity
            onPress={handleResetToDefaults}
            style={[styles.resetButton, { borderColor: theme.colors.border }]}
          >
            <Text style={[styles.resetButtonText, { color: theme.colors.textSecondary }]}>
              Reset to Defaults
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 60,
  },
  backText: {
    fontSize: 17,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    marginLeft: 4,
    letterSpacing: 0.5,
  },
  sectionContent: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  emptyText: {
    padding: 16,
    fontSize: 14,
    textAlign: 'center',
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  listItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  repoIcon: {
    width: 32,
    height: 32,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  repoIconText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  repoTextContainer: {
    flex: 1,
  },
  listItemText: {
    fontSize: 15,
  },
  featuredBadge: {
    fontSize: 11,
    marginTop: 2,
  },
  removeButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  removeText: {
    fontSize: 14,
  },
  addButton: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderTopWidth: 1,
  },
  addButtonText: {
    fontSize: 15,
    fontWeight: '500',
  },
  infoText: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  resetButton: {
    marginTop: 24,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    alignSelf: 'center',
  },
  resetButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
});

export default FeedCustomizationScreen;
