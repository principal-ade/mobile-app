import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Pressable,
} from 'react-native';
import { useTheme } from '@principal-ade/industry-theme';
import { LucideIcon } from '../LucideIcon';
import type { Collection, CollectionItemType } from '../../types/collections';

export interface CollectionSelectorProps {
  visible: boolean;
  collections: Collection[];
  selectedCollectionIds: string[];
  itemType: CollectionItemType;
  itemName: string; // Display name of the item being added
  onClose: () => void;
  onSelectCollection: (collectionId: string) => void;
  onDeselectCollection: (collectionId: string) => void;
  onCreateCollection: (name: string, icon?: string) => void;
  onDone: () => void;
}

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
];

export function CollectionSelector({
  visible,
  collections,
  selectedCollectionIds,
  itemType,
  itemName,
  onClose,
  onSelectCollection,
  onDeselectCollection,
  onCreateCollection,
  onDone,
}: CollectionSelectorProps) {
  const { theme } = useTheme();
  const [isCreating, setIsCreating] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');
  const [selectedIcon, setSelectedIcon] = useState(ICON_OPTIONS[0]);

  const handleCreate = () => {
    if (newCollectionName.trim()) {
      onCreateCollection(newCollectionName.trim(), selectedIcon);
      setNewCollectionName('');
      setSelectedIcon(ICON_OPTIONS[0]);
      setIsCreating(false);
    }
  };

  const handleToggleCollection = (collectionId: string) => {
    if (selectedCollectionIds.includes(collectionId)) {
      onDeselectCollection(collectionId);
    } else {
      onSelectCollection(collectionId);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={styles.header}>
            <View style={styles.titleContainer}>
              <Text style={[styles.title, { color: theme.colors.text }]}>
                Add to Collections
              </Text>
              <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
                {itemName}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={[styles.closeText, { color: theme.colors.textSecondary }]}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
            {!isCreating && (
              <TouchableOpacity
                style={[styles.createButton, { borderColor: theme.colors.primary }]}
                onPress={() => setIsCreating(true)}
              >
                <Text style={[styles.createButtonText, { color: theme.colors.primary }]}>
                  + Create New Collection
                </Text>
              </TouchableOpacity>
            )}

            {isCreating && (
              <View style={[styles.createForm, { backgroundColor: theme.colors.surfaceVariant }]}>
                <Text style={[styles.formLabel, { color: theme.colors.text }]}>
                  New Collection
                </Text>

                <View style={styles.iconSelector}>
                  {ICON_OPTIONS.map((iconName) => (
                    <TouchableOpacity
                      key={iconName}
                      style={[
                        styles.iconButton,
                        selectedIcon === iconName && {
                          backgroundColor: theme.colors.primary,
                        },
                      ]}
                      onPress={() => setSelectedIcon(iconName)}
                    >
                      <LucideIcon
                        name={iconName as any}
                        size={20}
                        color={selectedIcon === iconName ? theme.colors.onPrimary : theme.colors.text}
                      />
                    </TouchableOpacity>
                  ))}
                </View>

                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: theme.colors.surface,
                      color: theme.colors.text,
                      borderColor: theme.colors.border,
                    },
                  ]}
                  placeholder="Collection name"
                  placeholderTextColor={theme.colors.textSecondary}
                  value={newCollectionName}
                  onChangeText={setNewCollectionName}
                  autoFocus
                />

                <View style={styles.formActions}>
                  <TouchableOpacity
                    style={[styles.formButton, { backgroundColor: theme.colors.surface }]}
                    onPress={() => {
                      setIsCreating(false);
                      setNewCollectionName('');
                    }}
                  >
                    <Text style={[styles.formButtonText, { color: theme.colors.text }]}>
                      Cancel
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.formButton,
                      styles.formButtonPrimary,
                      { backgroundColor: theme.colors.primary },
                    ]}
                    onPress={handleCreate}
                    disabled={!newCollectionName.trim()}
                  >
                    <Text style={[styles.formButtonText, { color: theme.colors.onPrimary }]}>
                      Create
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            <View style={styles.collectionsContainer}>
              {collections.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
                    No collections yet. Create your first one!
                  </Text>
                </View>
              ) : (
                collections.map((collection) => {
                  const isSelected = selectedCollectionIds.includes(collection.id);
                  const itemCount =
                    itemType === 'repo' ? collection.repos.length : collection.users.length;

                  return (
                    <TouchableOpacity
                      key={collection.id}
                      style={[
                        styles.collectionItem,
                        {
                          backgroundColor: isSelected
                            ? theme.colors.primaryContainer
                            : theme.colors.surfaceVariant,
                        },
                      ]}
                      onPress={() => handleToggleCollection(collection.id)}
                    >
                      <View style={styles.collectionInfo}>
                        <View style={styles.collectionIconContainer}>
                          <LucideIcon
                            name={(collection.icon || 'Folder') as any}
                            size={20}
                            color={theme.colors.primary}
                          />
                        </View>
                        <View style={styles.collectionText}>
                          <Text style={[styles.collectionName, { color: theme.colors.text }]}>
                            {collection.name}
                          </Text>
                          <Text style={[styles.collectionCount, { color: theme.colors.textSecondary }]}>
                            {itemCount} {itemType === 'repo' ? 'repos' : 'users'}
                          </Text>
                        </View>
                      </View>
                      <View
                        style={[
                          styles.checkbox,
                          {
                            borderColor: isSelected
                              ? theme.colors.primary
                              : theme.colors.border,
                            backgroundColor: isSelected
                              ? theme.colors.primary
                              : 'transparent',
                          },
                        ]}
                      >
                        {isSelected && <Text style={styles.checkmark}>✓</Text>}
                      </View>
                    </TouchableOpacity>
                  );
                })
              )}
            </View>
          </ScrollView>

          <View style={[styles.footer, { borderTopColor: theme.colors.border }]}>
            <TouchableOpacity
              style={[styles.doneButton, { backgroundColor: theme.colors.primary }]}
              onPress={onDone}
            >
              <Text style={[styles.doneButtonText, { color: theme.colors.onPrimary }]}>
                Done ({selectedCollectionIds.length})
              </Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingTop: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
  },
  closeButton: {
    padding: 4,
  },
  closeText: {
    fontSize: 24,
    fontWeight: '300',
  },
  scrollView: {
    maxHeight: 400,
  },
  createButton: {
    marginHorizontal: 20,
    marginBottom: 16,
    paddingVertical: 12,
    borderWidth: 2,
    borderRadius: 10,
    borderStyle: 'dashed',
    alignItems: 'center',
  },
  createButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  createForm: {
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  iconSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
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
  collectionsContainer: {
    paddingHorizontal: 20,
  },
  emptyState: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
  },
  collectionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 10,
    marginBottom: 8,
  },
  collectionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  collectionIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  collectionText: {
    flex: 1,
  },
  collectionName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  collectionCount: {
    fontSize: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmark: {
    color: 'white',
    fontSize: 14,
    fontWeight: '700',
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  doneButton: {
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  doneButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },
});
