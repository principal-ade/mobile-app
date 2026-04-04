import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '@principal-ade/industry-theme';

interface FollowedUser {
  username: string;
  avatarUrl?: string;
}

interface FollowedRepo {
  owner: string;
  name: string;
}

export function FeedCustomizationScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  // Local state - will be replaced with API calls later
  const [followedUsers, setFollowedUsers] = useState<FollowedUser[]>([]);
  const [followedRepos, setFollowedRepos] = useState<FollowedRepo[]>([]);
  const [newUsername, setNewUsername] = useState('');
  const [newRepoInput, setNewRepoInput] = useState('');
  const [showAddUser, setShowAddUser] = useState(false);
  const [showAddRepo, setShowAddRepo] = useState(false);

  const handleAddUser = useCallback(() => {
    const username = newUsername.trim().replace(/^@/, '');
    if (!username) {
      Alert.alert('Invalid Username', 'Please enter a valid GitHub username.');
      return;
    }
    if (followedUsers.some((u) => u.username.toLowerCase() === username.toLowerCase())) {
      Alert.alert('Already Following', `You're already following @${username}.`);
      return;
    }
    setFollowedUsers((prev) => [...prev, { username }]);
    setNewUsername('');
    setShowAddUser(false);
  }, [newUsername, followedUsers]);

  const handleRemoveUser = useCallback((username: string) => {
    setFollowedUsers((prev) => prev.filter((u) => u.username !== username));
  }, []);

  const handleAddRepo = useCallback(() => {
    const input = newRepoInput.trim();
    const match = input.match(/^([a-zA-Z0-9_-]+)\/([a-zA-Z0-9_.-]+)$/);
    if (!match) {
      Alert.alert('Invalid Format', 'Please enter a repository in the format: owner/repo');
      return;
    }
    const [, owner, name] = match;
    if (followedRepos.some((r) => r.owner.toLowerCase() === owner.toLowerCase() && r.name.toLowerCase() === name.toLowerCase())) {
      Alert.alert('Already Following', `You're already following ${owner}/${name}.`);
      return;
    }
    setFollowedRepos((prev) => [...prev, { owner, name }]);
    setNewRepoInput('');
    setShowAddRepo(false);
  }, [newRepoInput, followedRepos]);

  const handleRemoveRepo = useCallback((owner: string, name: string) => {
    setFollowedRepos((prev) => prev.filter((r) => !(r.owner === owner && r.name === name)));
  }, []);

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
            {followedUsers.length === 0 && !showAddUser && (
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
            {showAddUser ? (
              <View style={styles.addInputContainer}>
                <TextInput
                  style={[
                    styles.addInput,
                    {
                      backgroundColor: theme.colors.background,
                      color: theme.colors.text,
                      borderColor: theme.colors.border,
                    },
                  ]}
                  placeholder="Enter GitHub username"
                  placeholderTextColor={theme.colors.textSecondary}
                  value={newUsername}
                  onChangeText={setNewUsername}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoFocus
                  onSubmitEditing={handleAddUser}
                />
                <View style={styles.addInputButtons}>
                  <TouchableOpacity
                    onPress={() => {
                      setShowAddUser(false);
                      setNewUsername('');
                    }}
                    style={[styles.inputButton, { backgroundColor: theme.colors.background }]}
                  >
                    <Text style={[styles.inputButtonText, { color: theme.colors.textSecondary }]}>
                      Cancel
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleAddUser}
                    style={[styles.inputButton, { backgroundColor: theme.colors.primary }]}
                  >
                    <Text style={[styles.inputButtonText, { color: '#FFFFFF' }]}>Add</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <TouchableOpacity
                onPress={() => setShowAddUser(true)}
                style={[styles.addButton, { borderTopColor: theme.colors.border }]}
              >
                <Text style={[styles.addButtonText, { color: theme.colors.primary }]}>
                  + Add User
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Repos Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>
            REPOSITORIES YOU FOLLOW
          </Text>
          <View style={[styles.sectionContent, { backgroundColor: theme.colors.surface }]}>
            {followedRepos.length === 0 && !showAddRepo && (
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
                  <View style={[styles.repoIcon, { backgroundColor: theme.colors.textSecondary }]}>
                    <Text style={styles.repoIconText}>R</Text>
                  </View>
                  <Text style={[styles.listItemText, { color: theme.colors.text }]}>
                    {repo.owner}/{repo.name}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => handleRemoveRepo(repo.owner, repo.name)}
                  style={styles.removeButton}
                >
                  <Text style={[styles.removeText, { color: theme.colors.error }]}>Remove</Text>
                </TouchableOpacity>
              </View>
            ))}
            {showAddRepo ? (
              <View style={styles.addInputContainer}>
                <TextInput
                  style={[
                    styles.addInput,
                    {
                      backgroundColor: theme.colors.background,
                      color: theme.colors.text,
                      borderColor: theme.colors.border,
                    },
                  ]}
                  placeholder="owner/repository"
                  placeholderTextColor={theme.colors.textSecondary}
                  value={newRepoInput}
                  onChangeText={setNewRepoInput}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoFocus
                  onSubmitEditing={handleAddRepo}
                />
                <View style={styles.addInputButtons}>
                  <TouchableOpacity
                    onPress={() => {
                      setShowAddRepo(false);
                      setNewRepoInput('');
                    }}
                    style={[styles.inputButton, { backgroundColor: theme.colors.background }]}
                  >
                    <Text style={[styles.inputButtonText, { color: theme.colors.textSecondary }]}>
                      Cancel
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleAddRepo}
                    style={[styles.inputButton, { backgroundColor: theme.colors.primary }]}
                  >
                    <Text style={[styles.inputButtonText, { color: '#FFFFFF' }]}>Add</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <TouchableOpacity
                onPress={() => setShowAddRepo(true)}
                style={[styles.addButton, { borderTopColor: theme.colors.border }]}
              >
                <Text style={[styles.addButtonText, { color: theme.colors.primary }]}>
                  + Add Repository
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Info text */}
        <Text style={[styles.infoText, { color: theme.colors.textSecondary }]}>
          Your feed will show activity from the users and repositories you follow. Changes are saved automatically.
        </Text>
      </ScrollView>
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
  listItemText: {
    fontSize: 15,
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
  addInputContainer: {
    padding: 16,
  },
  addInput: {
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 15,
    marginBottom: 12,
  },
  addInputButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  inputButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  inputButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  infoText: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
    paddingHorizontal: 16,
  },
});

export default FeedCustomizationScreen;
