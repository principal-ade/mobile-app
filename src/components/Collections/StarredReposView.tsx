import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { useTheme } from '@principal-ade/industry-theme';
import { LucideIcon } from '../LucideIcon';
import { StarredRepoCard } from './StarredRepoCard';
import { CollectionSelector } from './CollectionSelector';
import type { StarredRepo, Collection } from '../../types/collections';

export interface StarredReposViewProps {
  repos: StarredRepo[];
  collections: Collection[];
  isLoading?: boolean;
  showHeader?: boolean;
  title?: string;
  onRefresh?: () => void;
  onRepoPress?: (repo: StarredRepo) => void;
  onAddRepoToCollection?: (repoFullName: string, collectionIds: string[]) => void;
  onRemoveRepoFromCollection?: (repoFullName: string, collectionId: string) => void;
  onCreateCollection?: (name: string, icon?: string) => void;
}

export function StarredReposView({
  repos,
  collections,
  isLoading = false,
  showHeader = true,
  title = 'Starred Repos',
  onRefresh,
  onRepoPress,
  onAddRepoToCollection,
  onRemoveRepoFromCollection,
  onCreateCollection,
}: StarredReposViewProps) {
  const { theme } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRepo, setSelectedRepo] = useState<StarredRepo | null>(null);
  const [selectedCollectionIds, setSelectedCollectionIds] = useState<string[]>([]);

  const filteredRepos = repos
    .filter((repo) => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        repo.full_name.toLowerCase().includes(query) ||
        repo.description?.toLowerCase().includes(query) ||
        repo.language?.toLowerCase().includes(query) ||
        repo.topics?.some((topic) => topic.toLowerCase().includes(query))
      );
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  const getRepoCollections = (fullName: string): string[] => {
    const repo = repos.find((r) => r.full_name === fullName);
    if (!repo) return [];

    return collections
      .filter((collection) =>
        collection.repos.some(
          (r) => r.owner === repo.owner && r.repo === repo.name
        )
      )
      .map((c) => c.id);
  };

  const handleAddToCollection = (repo: StarredRepo) => {
    setSelectedRepo(repo);
    setSelectedCollectionIds(getRepoCollections(repo.full_name));
  };

  const handleCloseSelector = () => {
    setSelectedRepo(null);
    setSelectedCollectionIds([]);
  };

  const handleDone = () => {
    if (selectedRepo && onAddRepoToCollection) {
      onAddRepoToCollection(selectedRepo.full_name, selectedCollectionIds);
    }
    handleCloseSelector();
  };

  const handleSelectCollection = (collectionId: string) => {
    setSelectedCollectionIds((prev) => [...prev, collectionId]);
  };

  const handleDeselectCollection = (collectionId: string) => {
    setSelectedCollectionIds((prev) => prev.filter((id) => id !== collectionId));
  };

  const handleCreateCollection = (name: string, emoji?: string) => {
    if (onCreateCollection) {
      onCreateCollection(name, emoji);
    }
  };

  const renderHeader = () => (
    <>
      {showHeader && (
        <View style={styles.headerTop}>
          <Text style={[styles.title, { color: theme.colors.text }]}>{title}</Text>
          <Text style={[styles.count, { color: theme.colors.textSecondary }]}>
            {repos.length} {repos.length === 1 ? 'repo' : 'repos'}
          </Text>
        </View>
      )}

      <View style={styles.filterContainer}>
        <View
          style={[
            styles.filterInputContainer,
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
            placeholder="Filter Projects"
            placeholderTextColor={theme.colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchQuery('')}
              style={styles.clearButton}
            >
              <LucideIcon name="X" color={theme.colors.textSecondary} size={14} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {repos.length > 0 && searchQuery.trim() && (
        <View style={styles.resultsHeader}>
          <Text style={[styles.resultsCount, { color: theme.colors.textSecondary }]}>
            {filteredRepos.length} of {repos.length} {repos.length === 1 ? 'repo' : 'repos'} matching "{searchQuery}"
          </Text>
        </View>
      )}
    </>
  );

  const renderEmpty = () => (
    <View style={styles.emptyState}>
      <Text style={[styles.emptyIcon, { color: theme.colors.textSecondary }]}>⭐</Text>
      <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>No starred repos</Text>
      <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
        {searchQuery
          ? 'No repos match your search'
          : 'Star some repos on GitHub to see them here'}
      </Text>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <FlatList
        data={filteredRepos}
        keyExtractor={(item) => item.full_name}
        renderItem={({ item }) => {
          const repoCollections = getRepoCollections(item.full_name);
          return (
            <StarredRepoCard
              repo={item}
              collectionCount={repoCollections.length}
              onAddToCollection={() => handleAddToCollection(item)}
              onPress={() => onRepoPress?.(item)}
            />
          );
        }}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={!isLoading ? renderEmpty : null}
        contentContainerStyle={filteredRepos.length === 0 ? styles.emptyContainer : undefined}
        refreshing={isLoading}
        onRefresh={onRefresh}
        showsVerticalScrollIndicator={false}
      />

      {selectedRepo && (
        <CollectionSelector
          visible={!!selectedRepo}
          collections={collections}
          selectedCollectionIds={selectedCollectionIds}
          itemType="repo"
          itemName={selectedRepo.full_name}
          onClose={handleCloseSelector}
          onSelectCollection={handleSelectCollection}
          onDeselectCollection={handleDeselectCollection}
          onCreateCollection={handleCreateCollection}
          onDone={handleDone}
        />
      )}

      {isLoading && repos.length === 0 && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerTop: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
  },
  count: {
    fontSize: 14,
  },
  filterContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  filterInputContainer: {
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
  resultsHeader: {
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  resultsCount: {
    fontSize: 13,
  },
  emptyContainer: {
    flexGrow: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
