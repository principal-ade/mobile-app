import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { useTheme } from '@principal-ade/industry-theme';
import {
  useFeedPreferences,
  DEFAULT_REPOS,
} from '../context/FeedPreferencesContext';
import {
  unfollowUser as apiUnfollowUser,
  unfollowRepo as apiUnfollowRepo,
} from '../services/FeedApiService';
import { useAuthContext } from '../context/AuthContext';
import type { RootStackParamList } from '../navigation/types';

type NavigationProp = StackNavigationProp<RootStackParamList, 'FeedCustomization'>;

export function FeedCustomizationScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const { token } = useAuthContext();
  const {
    followedUsers,
    followedRepos,
    isLoading,
    removeUser,
    removeRepo,
    resetToDefaults,
  } = useFeedPreferences();

  const [isSyncing, setIsSyncing] = useState(false);
  const tokenRef = useRef<string | null>(token);
  tokenRef.current = token;

  const handleRemoveUser = useCallback((login: string) => {
    removeUser(login);

    // Sync to API
    if (tokenRef.current) {
      setIsSyncing(true);
      apiUnfollowUser(tokenRef.current, login)
        .catch((err) => console.warn('Failed to sync unfollow user:', err))
        .finally(() => setIsSyncing(false));
    }
  }, [removeUser]);

  const handleRemoveRepo = useCallback((owner: string, repo: string) => {
    removeRepo(owner, repo);

    // Sync to API
    if (tokenRef.current) {
      setIsSyncing(true);
      apiUnfollowRepo(tokenRef.current, owner, repo)
        .catch((err) => console.warn('Failed to sync unfollow repo:', err))
        .finally(() => setIsSyncing(false));
    }
  }, [removeRepo]);

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
            resetToDefaults();
          },
        },
      ]
    );
  }, [resetToDefaults]);

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
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Customize Feed</Text>
          {isSyncing && (
            <Text style={[styles.syncingText, { color: theme.colors.textSecondary }]}>Syncing...</Text>
          )}
        </View>
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
                key={user.login}
                style={[styles.listItem, { borderBottomColor: theme.colors.border }]}
              >
                <View style={styles.listItemContent}>
                  <Image
                    source={{ uri: user.avatarUrl || `https://github.com/${user.login}.png` }}
                    style={styles.avatarImage}
                  />
                  <Text style={[styles.listItemText, { color: theme.colors.text }]}>
                    @{user.login}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => handleRemoveUser(user.login)}
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
                key={`${repo.owner}/${repo.repo}`}
                style={[styles.listItem, { borderBottomColor: theme.colors.border }]}
              >
                <View style={styles.listItemContent}>
                  <Image
                    source={{ uri: `https://github.com/${repo.owner}.png` }}
                    style={styles.repoAvatarImage}
                  />
                  <View style={styles.repoTextContainer}>
                    <Text style={[styles.listItemText, { color: theme.colors.text }]}>
                      {repo.owner}/{repo.repo}
                    </Text>
                    {repo.isFeatured && (
                      <Text style={[styles.featuredBadge, { color: theme.colors.textSecondary }]}>
                        Featured
                      </Text>
                    )}
                  </View>
                </View>
                <TouchableOpacity
                  onPress={() => handleRemoveRepo(repo.owner, repo.repo)}
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
  headerCenter: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  syncingText: {
    fontSize: 11,
    marginTop: 2,
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
  avatarImage: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 12,
  },
  repoAvatarImage: {
    width: 32,
    height: 32,
    borderRadius: 6,
    marginRight: 12,
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
