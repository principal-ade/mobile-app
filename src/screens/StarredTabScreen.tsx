import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { useTheme } from '@principal-ade/industry-theme';
import { ToursTabScreen } from './ToursTabScreen';
import { StarredReposView } from '../components/Collections/StarredReposView';
import { CollectionsView } from '../components/Collections/CollectionsView';
import { getSuggestedRepos } from '../services/GitHubSearchService';
import { fetchUserOrganizations } from '../services/GithubService';
import { useAuthContext } from '../context/AuthContext';
import { useCollections } from '../context/CollectionsContext';
import type { StarredRepo } from '../types/collections';
import type { OrgOption } from '../components/Collections/CollectionSelector';
import type { StarredStackParamList } from '../navigation/types';

type TabType = 'starred' | 'collections' | 'tours';
type NavigationProp = StackNavigationProp<StarredStackParamList>;

export function StarredTabScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const { token } = useAuthContext();
  const { collections, createCollection, updateCollection, deleteCollection, addRepoToCollection, removeRepoFromCollection, syncWithServer } = useCollections();
  const [activeTab, setActiveTab] = useState<TabType>('collections');
  const [starredRepos, setStarredRepos] = useState<StarredRepo[]>([]);
  const [userOrgs, setUserOrgs] = useState<OrgOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Sync collections from server when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      if (token) {
        syncWithServer().catch((error) => {
          console.warn('Failed to sync collections on focus:', error);
        });
      }
    }, [token, syncWithServer])
  );

  // Fetch starred repos and user orgs on mount
  useEffect(() => {
    async function loadData() {
      if (!token) {
        setStarredRepos([]);
        setUserOrgs([]);
        return;
      }

      setIsLoading(true);
      try {
        const [{ repos }, orgs] = await Promise.all([
          getSuggestedRepos(token),
          fetchUserOrganizations(token).catch(() => []),
        ]);

        const starred = repos
          .filter((r) => r.source === 'starred')
          .map((repo) => ({
            ...repo,
            owner_avatar_url: repo.owner_avatar_url || `https://github.com/${repo.owner}.png`,
          }));
        setStarredRepos(starred);
        setUserOrgs(orgs.map((org) => ({ login: org.login, avatarUrl: org.avatar_url })));
      } catch (error) {
        console.error('Failed to load starred repos:', error);
        setStarredRepos([]);
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, [token]);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Segmented Control */}
      <View style={[styles.segmentContainer, { paddingTop: insets.top + 12 }]}>
        <View
          style={[
            styles.segmentedControl,
            {
              backgroundColor: theme.colors.backgroundSecondary,
              borderColor: theme.colors.border,
            },
          ]}
        >
          {(['starred', 'collections', 'tours'] as const).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[
                styles.segmentButton,
                activeTab === tab && { backgroundColor: theme.colors.surface },
              ]}
              onPress={() => setActiveTab(tab)}
            >
              <Text
                style={[
                  styles.segmentText,
                  {
                    color: activeTab === tab ? theme.colors.primary : theme.colors.textSecondary,
                    fontWeight: activeTab === tab ? '600' : '500',
                  },
                ]}
              >
                {tab === 'starred' ? 'Starred' : tab === 'collections' ? 'Collections' : 'Tours'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Content */}
      {activeTab === 'collections' ? (
        <CollectionsView
          collections={collections}
          isLoading={isLoading}
          userOrgs={userOrgs}
          onRefresh={async () => {
            if (!token) return;
            setIsLoading(true);
            try {
              await syncWithServer().catch((error) => {
                console.warn('Failed to sync collections on refresh:', error);
              });
            } finally {
              setIsLoading(false);
            }
          }}
          onCreateCollection={(name, icon, orgLogin) => {
            createCollection(name, icon, orgLogin);
          }}
          onUpdateCollection={(collectionId, updates) => {
            updateCollection(collectionId, updates);
          }}
          onDeleteCollection={(collectionId) => {
            deleteCollection(collectionId);
          }}
        />
      ) : activeTab === 'starred' ? (
        <StarredReposView
          repos={starredRepos}
          collections={collections}
          showHeader={false}
          isLoading={isLoading}
          userOrgs={userOrgs}
          onRefresh={async () => {
            if (!token) return;
            setIsLoading(true);
            try {
              await Promise.all([
                syncWithServer().catch((error) => {
                  console.warn('Failed to sync collections on refresh:', error);
                }),
                (async () => {
                  const { repos } = await getSuggestedRepos(token);
                  const starred = repos
                    .filter((r) => r.source === 'starred')
                    .map((repo) => ({
                      ...repo,
                      owner_avatar_url: repo.owner_avatar_url || `https://github.com/${repo.owner}.png`,
                    }));
                  setStarredRepos(starred);
                })(),
                fetchUserOrganizations(token)
                  .then((orgs) => setUserOrgs(orgs.map((org) => ({ login: org.login, avatarUrl: org.avatar_url }))))
                  .catch(() => {}),
              ]);
            } catch (error) {
              console.error('Failed to refresh:', error);
            } finally {
              setIsLoading(false);
            }
          }}
          onRepoPress={(repo) => {
            navigation.navigate('RepoFileCity', {
              owner: repo.owner,
              name: repo.name,
              fullName: repo.full_name,
            });
          }}
          onAddRepoToCollection={(repoFullName, collectionIds) => {
            const [owner, repo] = repoFullName.split('/');
            // Add to new collections
            collectionIds.forEach((collectionId) => {
              addRepoToCollection(collectionId, owner, repo);
            });
            // Remove from collections not in the list
            collections.forEach((collection) => {
              const isInCollection = collection.repos.some(
                (r) => r.owner === owner && r.repo === repo
              );
              if (isInCollection && !collectionIds.includes(collection.id)) {
                removeRepoFromCollection(collection.id, owner, repo);
              }
            });
          }}
          onRemoveRepoFromCollection={(repoFullName, collectionId) => {
            const [owner, repo] = repoFullName.split('/');
            removeRepoFromCollection(collectionId, owner, repo);
          }}
          onCreateCollection={(name, icon, orgLogin) => {
            createCollection(name, icon, orgLogin);
          }}
        />
      ) : (
        <ToursTabScreen hideHeader />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  segmentContainer: {
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  segmentedControl: {
    flexDirection: 'row',
    borderRadius: 10,
    padding: 3,
    borderWidth: 1,
  },
  segmentButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 7,
    alignItems: 'center',
  },
  segmentText: {
    fontSize: 15,
  },
});

export default StarredTabScreen;
