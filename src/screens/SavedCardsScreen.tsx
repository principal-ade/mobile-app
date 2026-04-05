import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  FlatList,
  Image,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { useTheme } from '@principal-ade/industry-theme';
import {
  getSavedCards,
  unsaveCard,
  type SavedCard,
} from '../services/FeedApiService';
import { getToken } from '../utils/authStorage';
import type { RootStackParamList } from '../navigation/types';

type NavigationProp = StackNavigationProp<RootStackParamList, 'SavedCards'>;

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function SavedCardsScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savedCards, setSavedCards] = useState<SavedCard[]>([]);
  const [token, setToken] = useState<string | null>(null);

  // Load saved cards on mount
  useEffect(() => {
    async function loadCards() {
      try {
        const authToken = await getToken();
        if (!authToken) {
          setError('Please sign in to view saved cards');
          setIsLoading(false);
          return;
        }
        setToken(authToken);

        const result = await getSavedCards(authToken);
        setSavedCards(result.savedCards);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load saved cards');
      } finally {
        setIsLoading(false);
      }
    }
    loadCards();
  }, []);

  const handleUnsave = useCallback(
    (card: SavedCard) => {
      Alert.alert(
        'Remove Card',
        `Remove ${card.repo.owner}/${card.repo.name} from saved?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Remove',
            style: 'destructive',
            onPress: async () => {
              // Optimistically remove
              setSavedCards((prev) => prev.filter((c) => c.itemId !== card.itemId));

              // Sync with API
              if (token) {
                try {
                  await unsaveCard(token, card.itemId);
                } catch (err) {
                  console.warn('Failed to unsave card:', err);
                  // Re-add on failure
                  setSavedCards((prev) => [card, ...prev]);
                }
              }
            },
          },
        ]
      );
    },
    [token]
  );

  const handleCardPress = useCallback(
    (card: SavedCard) => {
      navigation.navigate('CardDetail', {
        owner: card.repo.owner,
        repo: card.repo.name,
        commits: card.commits.map((c) => ({
          sha: c.sha,
          message: c.message,
          author: c.author.login,
          authorLogin: c.author.login,
          authorAvatarUrl: c.author.avatarUrl || null,
          date: c.committedAt,
        })),
      });
    },
    [navigation]
  );

  const renderCard = useCallback(
    ({ item: card }: { item: SavedCard }) => {
      const authors = [...new Set(card.commits.map((c) => c.author.login))];

      return (
        <TouchableOpacity
          style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
          onPress={() => handleCardPress(card)}
          activeOpacity={0.7}
        >
          <View style={styles.cardHeader}>
            <Image
              source={{ uri: `https://github.com/${card.repo.owner}.png?size=64` }}
              style={styles.cardAvatar}
            />
            <View style={styles.cardInfo}>
              <Text style={[styles.cardRepo, { color: theme.colors.text }]} numberOfLines={1}>
                {card.repo.name}
              </Text>
              <Text style={[styles.cardOwner, { color: theme.colors.textSecondary }]}>
                {card.repo.owner}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.removeButton}
              onPress={() => handleUnsave(card)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={[styles.removeText, { color: theme.colors.error }]}>Remove</Text>
            </TouchableOpacity>
          </View>

          <Text style={[styles.cardMessage, { color: theme.colors.text }]} numberOfLines={2}>
            {card.commits[0]?.message || 'No commit message'}
          </Text>

          <View style={styles.cardFooter}>
            <Text style={[styles.cardMeta, { color: theme.colors.textSecondary }]}>
              {card.commitCount} commit{card.commitCount !== 1 ? 's' : ''} by{' '}
              {authors.length === 1 ? authors[0] : `${authors[0]} +${authors.length - 1}`}
            </Text>
            <Text style={[styles.cardTime, { color: theme.colors.textSecondary }]}>
              Saved {formatRelativeTime(new Date(card.savedAt))}
            </Text>
          </View>
        </TouchableOpacity>
      );
    },
    [theme, handleCardPress, handleUnsave]
  );

  // Loading state
  if (isLoading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: theme.colors.background, paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
          Loading saved cards...
        </Text>
      </View>
    );
  }

  // Error state
  if (error) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: theme.colors.background, paddingTop: insets.top }]}>
        <Text style={[styles.errorText, { color: theme.colors.error }]}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8, borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={[styles.backText, { color: theme.colors.primary }]}>Back</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Saved Cards</Text>
        <View style={styles.backButton} />
      </View>

      {savedCards.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>📚</Text>
          <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>No saved cards</Text>
          <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
            Swipe right on cards in your feed to save them here
          </Text>
        </View>
      ) : (
        <FlatList
          data={savedCards}
          renderItem={renderCard}
          keyExtractor={(item) => item.itemId}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 16 }]}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
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
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 15,
    textAlign: 'center',
  },
  list: {
    padding: 16,
  },
  card: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardAvatar: {
    width: 40,
    height: 40,
    borderRadius: 8,
  },
  cardInfo: {
    flex: 1,
    marginLeft: 12,
  },
  cardRepo: {
    fontSize: 16,
    fontWeight: '600',
  },
  cardOwner: {
    fontSize: 13,
    marginTop: 2,
  },
  removeButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  removeText: {
    fontSize: 14,
  },
  cardMessage: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardMeta: {
    fontSize: 12,
    flex: 1,
  },
  cardTime: {
    fontSize: 12,
  },
});

export default SavedCardsScreen;
