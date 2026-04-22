import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Image,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Pressable,
} from 'react-native';
import { useTheme } from '@principal-ade/industry-theme';
import { LucideIcon, type LucideIconName } from '../LucideIcon';
import type { Collection } from '../../types/collections';
import type { OrgOption } from './CollectionSelector';

const ICON_OPTIONS = [
  'BookMarked',
  'Star',
  'Flame',
  'Briefcase',
  'Target',
  'Rocket',
  'Lightbulb',
  'Palette',
  'Package',
  'Sparkles',
  'Heart',
  'Code',
  'Users',
  'Folder',
] as const;

export interface CollectionsViewProps {
  collections: Collection[];
  isLoading?: boolean;
  userOrgs?: OrgOption[];
  onRefresh?: () => void;
  onCreateCollection?: (name: string, icon?: string, orgLogin?: string) => void;
  onUpdateCollection?: (collectionId: string, updates: { name?: string; icon?: string }) => void;
  onDeleteCollection?: (collectionId: string) => void;
}

interface CreateFormState {
  name: string;
  icon: string;
  orgLogin: string | undefined;
}

interface EditModalState {
  collection: Collection;
  name: string;
  icon: string;
}

export function CollectionsView({
  collections,
  isLoading = false,
  userOrgs = [],
  onRefresh,
  onCreateCollection,
  onUpdateCollection,
  onDeleteCollection,
}: CollectionsViewProps) {
  const { theme } = useTheme();
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [isCreating, setIsCreating] = useState(false);
  const [editModal, setEditModal] = useState<EditModalState | null>(null);
  const [filterOwner, setFilterOwner] = useState<'all' | 'personal' | string>('all');
  const [form, setForm] = useState<CreateFormState>({
    name: '',
    icon: ICON_OPTIONS[0],
    orgLogin: undefined,
  });

  const orgLoginsInCollections = [...new Set(
    collections
      .filter((c) => c.ownerType === 'org' && c.ownerLogin)
      .map((c) => c.ownerLogin!)
  )];

  const filteredCollections = collections.filter((c) => {
    if (filterOwner === 'all') return true;
    if (filterOwner === 'personal') return c.ownerType !== 'org';
    return c.ownerType === 'org' && c.ownerLogin === filterOwner;
  });

  const toggleExpanded = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleCreate = () => {
    if (!form.name.trim()) return;
    onCreateCollection?.(form.name.trim(), form.icon, form.orgLogin);
    setForm({ name: '', icon: ICON_OPTIONS[0], orgLogin: undefined });
    setIsCreating(false);
  };

  const handleCancelCreate = () => {
    setForm({ name: '', icon: ICON_OPTIONS[0], orgLogin: undefined });
    setIsCreating(false);
  };

  const openEditModal = (collection: Collection) => {
    setEditModal({
      collection,
      name: collection.name,
      icon: collection.icon ?? ICON_OPTIONS[0],
    });
  };

  const handleSaveEdit = () => {
    if (!editModal || !editModal.name.trim()) return;
    onUpdateCollection?.(editModal.collection.id, {
      name: editModal.name.trim(),
      icon: editModal.icon,
    });
    setEditModal(null);
  };

  const handleDeleteFromModal = () => {
    if (!editModal) return;
    onDeleteCollection?.(editModal.collection.id);
    setEditModal(null);
  };

  const renderHeader = () => (
    <View>
      <View style={styles.headerRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          {(['all', 'personal', ...orgLoginsInCollections] as const).map((option) => {
            const isActive = filterOwner === option;
            const label = option === 'all' ? 'All' : option === 'personal' ? 'Personal' : option;
            return (
              <TouchableOpacity
                key={option}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: isActive ? theme.colors.primary : theme.colors.backgroundSecondary,
                    borderColor: isActive ? theme.colors.primary : theme.colors.border,
                  },
                ]}
                onPress={() => setFilterOwner(option)}
              >
                <Text style={[styles.filterChipText, { color: isActive ? theme.colors.textOnPrimary : theme.colors.text }]}>
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
        {!isCreating && (
          <TouchableOpacity
            onPress={() => setIsCreating(true)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={styles.addButton}
          >
            <LucideIcon name="Plus" size={24} color={theme.colors.primary} />
          </TouchableOpacity>
        )}
      </View>

      {isCreating && (
        <View style={[styles.createForm, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <Text style={[styles.formTitle, { color: theme.colors.text }]}>New Collection</Text>

          <View style={styles.iconGrid}>
            {ICON_OPTIONS.map((iconName) => (
              <TouchableOpacity
                key={iconName}
                style={[
                  styles.iconButton,
                  form.icon === iconName
                    ? { backgroundColor: theme.colors.primary }
                    : { backgroundColor: theme.colors.backgroundSecondary },
                ]}
                onPress={() => setForm((f) => ({ ...f, icon: iconName }))}
              >
                <LucideIcon
                  name={iconName as LucideIconName}
                  size={20}
                  color={form.icon === iconName ? theme.colors.textOnPrimary : theme.colors.text}
                />
              </TouchableOpacity>
            ))}
          </View>

          {userOrgs.length > 0 && (
            <View style={styles.ownerSection}>
              <Text style={[styles.ownerLabel, { color: theme.colors.textSecondary }]}>Owner</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <TouchableOpacity
                  style={[
                    styles.ownerChip,
                    {
                      backgroundColor: form.orgLogin === undefined ? theme.colors.primary : theme.colors.backgroundSecondary,
                      borderColor: form.orgLogin === undefined ? theme.colors.primary : theme.colors.border,
                    },
                  ]}
                  onPress={() => setForm((f) => ({ ...f, orgLogin: undefined }))}
                >
                  <LucideIcon
                    name="User"
                    size={14}
                    color={form.orgLogin === undefined ? theme.colors.textOnPrimary : theme.colors.text}
                  />
                  <Text style={[styles.ownerChipText, { color: form.orgLogin === undefined ? theme.colors.textOnPrimary : theme.colors.text }]}>
                    Personal
                  </Text>
                </TouchableOpacity>
                {userOrgs.map((org) => (
                  <TouchableOpacity
                    key={org.login}
                    style={[
                      styles.ownerChip,
                      {
                        backgroundColor: form.orgLogin === org.login ? theme.colors.primary : theme.colors.backgroundSecondary,
                        borderColor: form.orgLogin === org.login ? theme.colors.primary : theme.colors.border,
                      },
                    ]}
                    onPress={() => setForm((f) => ({ ...f, orgLogin: org.login }))}
                  >
                    <Image source={{ uri: org.avatarUrl }} style={styles.orgAvatar} />
                    <Text style={[styles.ownerChipText, { color: form.orgLogin === org.login ? theme.colors.textOnPrimary : theme.colors.text }]}>
                      {org.login}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          <TextInput
            style={[
              styles.nameInput,
              {
                backgroundColor: theme.colors.backgroundSecondary,
                color: theme.colors.text,
                borderColor: theme.colors.border,
              },
            ]}
            placeholder="Collection name"
            placeholderTextColor={theme.colors.textSecondary}
            value={form.name}
            onChangeText={(name) => setForm((f) => ({ ...f, name }))}
            autoFocus
            maxLength={100}
          />

          <View style={styles.formActions}>
            <TouchableOpacity
              style={[styles.formButton, { backgroundColor: theme.colors.backgroundSecondary }]}
              onPress={handleCancelCreate}
            >
              <Text style={[styles.formButtonText, { color: theme.colors.text }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.formButton,
                styles.formButtonPrimary,
                { backgroundColor: form.name.trim() ? theme.colors.primary : theme.colors.border },
              ]}
              onPress={handleCreate}
              disabled={!form.name.trim()}
            >
              <Text style={[styles.formButtonText, { color: theme.colors.textOnPrimary }]}>Create</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );

  const renderEmpty = () => {
    if (isLoading) return null;
    return (
      <View style={styles.emptyState}>
        <LucideIcon name="BookMarked" size={48} color={theme.colors.textSecondary} />
        <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>No collections yet</Text>
        <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
          Create a collection to organize your starred repos and people you follow.
        </Text>
      </View>
    );
  };

  const renderCollection = ({ item }: { item: Collection }) => {
    const isExpanded = expandedIds.has(item.id);
    const totalItems = item.repos.length + item.users.length;

    return (
      <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
        <View style={styles.cardHeader}>
          <TouchableOpacity
            style={styles.cardHeaderMain}
            onPress={() => toggleExpanded(item.id)}
            activeOpacity={0.7}
          >
            <View style={[styles.iconContainer, { backgroundColor: theme.colors.backgroundSecondary }]}>
              <LucideIcon
                name={(item.icon || 'Folder') as LucideIconName}
                size={22}
                color={theme.colors.primary}
              />
            </View>

            <View style={styles.cardMeta}>
              <View style={styles.nameRow}>
                <Text style={[styles.cardName, { color: theme.colors.text }]} numberOfLines={1}>
                  {item.name}
                </Text>
                {item.ownerType === 'org' && item.ownerLogin && (
                  <View style={[styles.orgBadge, { backgroundColor: theme.colors.backgroundSecondary, borderColor: theme.colors.border }]}>
                    <LucideIcon name="Users" size={10} color={theme.colors.textSecondary} />
                    <Text style={[styles.orgBadgeText, { color: theme.colors.textSecondary }]}>
                      {item.ownerLogin}
                    </Text>
                  </View>
                )}
              </View>
              <Text style={[styles.cardCounts, { color: theme.colors.textSecondary }]}>
                {item.repos.length > 0 && `${item.repos.length} ${item.repos.length === 1 ? 'repo' : 'repos'}`}
                {item.repos.length > 0 && item.users.length > 0 && '  ·  '}
                {item.users.length > 0 && `${item.users.length} ${item.users.length === 1 ? 'person' : 'people'}`}
                {totalItems === 0 && 'Empty'}
              </Text>
            </View>

            <LucideIcon
              name={isExpanded ? 'ChevronUp' : 'ChevronDown'}
              size={18}
              color={theme.colors.textSecondary}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.moreButton}
            onPress={() => openEditModal(item)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <LucideIcon name="Ellipsis" size={18} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {isExpanded && (
          <View style={[styles.expandedContent, { borderTopColor: theme.colors.border }]}>
            {totalItems === 0 ? (
              <Text style={[styles.emptyCollectionText, { color: theme.colors.textSecondary }]}>
                No items yet. Add repos from the Repos tab.
              </Text>
            ) : (
              <>
                {item.repos.map((repo) => (
                  <View key={`${repo.owner}/${repo.repo}`} style={styles.itemRow}>
                    {repo.avatarUrl ? (
                      <Image source={{ uri: repo.avatarUrl }} style={styles.itemAvatar} />
                    ) : (
                      <View style={[styles.itemAvatarPlaceholder, { backgroundColor: theme.colors.backgroundSecondary }]}>
                        <LucideIcon name="GitFork" size={12} color={theme.colors.textSecondary} />
                      </View>
                    )}
                    <View style={styles.itemMeta}>
                      <Text style={[styles.itemName, { color: theme.colors.text }]} numberOfLines={1}>
                        {repo.owner}/{repo.repo}
                      </Text>
                      {repo.description && (
                        <Text style={[styles.itemDesc, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                          {repo.description}
                        </Text>
                      )}
                    </View>
                    {repo.stargazersCount !== undefined && (
                      <View style={styles.starCount}>
                        <LucideIcon name="Star" size={12} color={theme.colors.textSecondary} />
                        <Text style={[styles.starCountText, { color: theme.colors.textSecondary }]}>
                          {repo.stargazersCount >= 1000
                            ? `${(repo.stargazersCount / 1000).toFixed(1)}k`
                            : repo.stargazersCount}
                        </Text>
                      </View>
                    )}
                  </View>
                ))}
                {item.users.map((user) => (
                  <View key={user.login} style={styles.itemRow}>
                    {user.avatarUrl ? (
                      <Image source={{ uri: user.avatarUrl }} style={styles.itemAvatar} />
                    ) : (
                      <View style={[styles.itemAvatarPlaceholder, { backgroundColor: theme.colors.backgroundSecondary }]}>
                        <LucideIcon name="User" size={12} color={theme.colors.textSecondary} />
                      </View>
                    )}
                    <View style={styles.itemMeta}>
                      <Text style={[styles.itemName, { color: theme.colors.text }]} numberOfLines={1}>
                        {user.name || user.login}
                      </Text>
                      {user.name && (
                        <Text style={[styles.itemDesc, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                          @{user.login}
                        </Text>
                      )}
                    </View>
                  </View>
                ))}
              </>
            )}
          </View>
        )}
      </View>
    );
  };

  const errorColor = theme.colors.error ?? '#ef4444';

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <FlatList
        data={filteredCollections}
        keyExtractor={(item) => item.id}
        renderItem={renderCollection}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={[
          styles.listContent,
          filteredCollections.length === 0 && !isCreating && styles.emptyListContent,
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          onRefresh ? (
            <RefreshControl
              refreshing={isLoading}
              onRefresh={onRefresh}
              tintColor={theme.colors.primary}
            />
          ) : undefined
        }
      />

      {isLoading && collections.length === 0 && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      )}

      {/* Edit modal */}
      <Modal
        visible={editModal !== null}
        animationType="slide"
        transparent
        onRequestClose={() => setEditModal(null)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setEditModal(null)}>
          <Pressable
            style={[styles.modalSheet, { backgroundColor: theme.colors.surface }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={[styles.modalHandle, { backgroundColor: theme.colors.border }]} />

            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Edit Collection</Text>
              <TouchableOpacity onPress={() => setEditModal(null)}>
                <LucideIcon name="X" size={20} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {editModal && (
              <>
                <View style={styles.iconGrid}>
                  {ICON_OPTIONS.map((iconName) => (
                    <TouchableOpacity
                      key={iconName}
                      style={[
                        styles.iconButton,
                        editModal.icon === iconName
                          ? { backgroundColor: theme.colors.primary }
                          : { backgroundColor: theme.colors.backgroundSecondary },
                      ]}
                      onPress={() => setEditModal((m) => m ? { ...m, icon: iconName } : m)}
                    >
                      <LucideIcon
                        name={iconName as LucideIconName}
                        size={20}
                        color={editModal.icon === iconName ? theme.colors.textOnPrimary : theme.colors.text}
                      />
                    </TouchableOpacity>
                  ))}
                </View>

                <TextInput
                  style={[
                    styles.nameInput,
                    {
                      backgroundColor: theme.colors.backgroundSecondary,
                      color: theme.colors.text,
                      borderColor: theme.colors.border,
                    },
                  ]}
                  placeholder="Collection name"
                  placeholderTextColor={theme.colors.textSecondary}
                  value={editModal.name}
                  onChangeText={(name) => setEditModal((m) => m ? { ...m, name } : m)}
                  maxLength={100}
                />

                <View style={styles.formActions}>
                  <TouchableOpacity
                    style={[styles.formButton, { backgroundColor: theme.colors.backgroundSecondary }]}
                    onPress={() => setEditModal(null)}
                  >
                    <Text style={[styles.formButtonText, { color: theme.colors.text }]}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.formButton,
                      styles.formButtonPrimary,
                      { backgroundColor: editModal.name.trim() ? theme.colors.primary : theme.colors.border },
                    ]}
                    onPress={handleSaveEdit}
                    disabled={!editModal.name.trim()}
                  >
                    <Text style={[styles.formButtonText, { color: theme.colors.textOnPrimary }]}>Save</Text>
                  </TouchableOpacity>
                </View>

                {onDeleteCollection && (
                  <TouchableOpacity
                    style={[styles.deleteButton, { borderColor: errorColor }]}
                    onPress={handleDeleteFromModal}
                  >
                    <LucideIcon name="Trash2" size={14} color={errorColor} />
                    <Text style={[styles.deleteButtonText, { color: errorColor }]}>
                      Delete collection
                    </Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  emptyListContent: {
    flexGrow: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 16,
    gap: 8,
  },
  filterScroll: {
    flex: 1,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: '500',
  },
  addButton: {
    paddingLeft: 4,
  },
  createForm: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  formTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 12,
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ownerSection: {
    marginBottom: 14,
  },
  ownerLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  ownerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  ownerChipText: {
    fontSize: 13,
    fontWeight: '500',
  },
  orgAvatar: {
    width: 16,
    height: 16,
    borderRadius: 3,
  },
  nameInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    marginBottom: 12,
  },
  formActions: {
    flexDirection: 'row',
    gap: 8,
  },
  formButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  formButtonPrimary: {
    flex: 2,
  },
  formButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 8,
  },
  cardHeaderMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  moreButton: {
    padding: 8,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardMeta: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 3,
  },
  cardName: {
    fontSize: 16,
    fontWeight: '600',
  },
  orgBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: StyleSheet.hairlineWidth,
  },
  orgBadgeText: {
    fontSize: 11,
  },
  cardCounts: {
    fontSize: 13,
  },
  expandedContent: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 14,
    gap: 2,
  },
  emptyCollectionText: {
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 12,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    gap: 10,
  },
  itemAvatar: {
    width: 28,
    height: 28,
    borderRadius: 6,
  },
  itemAvatarPlaceholder: {
    width: 28,
    height: 28,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemMeta: {
    flex: 1,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '500',
  },
  itemDesc: {
    fontSize: 12,
    marginTop: 1,
  },
  starCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  starCountText: {
    fontSize: 12,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  deleteButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingVertical: 60,
    gap: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 36,
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
});
