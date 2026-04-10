import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  Image,
} from 'react-native';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { useTheme } from '@principal-ade/industry-theme';
import { formatStars } from '../services/GitHubSearchService';
import type { RootStackParamList } from '../navigation/types';
import { getReposWithTours, type RepoWithTour } from '../services/FeedApiService';
import { getCompletedTours } from './TourFileCityScreen';
import { LucideIcon } from '../components/LucideIcon';

type NavigationProp = StackNavigationProp<RootStackParamList>;

// Custom icon components
function ClearIcon({ color, size = 14 }: { color: string; size?: number }) {
  return (
    <View style={[styles.iconWrapper, { width: size, height: size }]}>
      <View
        style={[
          styles.clearLine,
          {
            backgroundColor: color,
            width: size * 0.8,
            height: size * 0.15,
            transform: [{ rotate: '45deg' }],
          },
        ]}
      />
      <View
        style={[
          styles.clearLine,
          {
            backgroundColor: color,
            width: size * 0.8,
            height: size * 0.15,
            transform: [{ rotate: '-45deg' }],
          },
        ]}
      />
    </View>
  );
}

function CityIcon({ color, size = 80 }: { color: string; size?: number }) {
  return (
    <View style={[styles.cityIconContainer, { width: size, height: size }]}>
      {/* Buildings */}
      <View
        style={[
          styles.cityBuilding,
          {
            backgroundColor: color,
            width: size * 0.2,
            height: size * 0.5,
            left: size * 0.1,
            bottom: size * 0.15,
            opacity: 0.6,
          },
        ]}
      />
      <View
        style={[
          styles.cityBuilding,
          {
            backgroundColor: color,
            width: size * 0.25,
            height: size * 0.7,
            left: size * 0.35,
            bottom: size * 0.15,
            opacity: 0.8,
          },
        ]}
      />
      <View
        style={[
          styles.cityBuilding,
          {
            backgroundColor: color,
            width: size * 0.2,
            height: size * 0.4,
            right: size * 0.1,
            bottom: size * 0.15,
            opacity: 0.5,
          },
        ]}
      />
      {/* Ground */}
      <View
        style={[
          styles.cityGround,
          {
            backgroundColor: color,
            height: size * 0.08,
            bottom: size * 0.1,
            opacity: 0.3,
          },
        ]}
      />
    </View>
  );
}

function WarningIcon({ color, size = 48 }: { color: string; size?: number }) {
  return (
    <View style={[styles.iconWrapper, { width: size, height: size }]}>
      <View
        style={[
          styles.warningTriangle,
          {
            borderLeftWidth: size * 0.5,
            borderRightWidth: size * 0.5,
            borderBottomWidth: size * 0.85,
            borderLeftColor: 'transparent',
            borderRightColor: 'transparent',
            borderBottomColor: color,
          },
        ]}
      />
      <View
        style={[
          styles.warningExclamation,
          {
            backgroundColor: '#fff',
            width: size * 0.08,
            height: size * 0.3,
            top: size * 0.35,
          },
        ]}
      />
      <View
        style={[
          styles.warningDot,
          {
            backgroundColor: '#fff',
            width: size * 0.08,
            height: size * 0.08,
            borderRadius: size * 0.04,
            bottom: size * 0.2,
          },
        ]}
      />
    </View>
  );
}

function getLanguageColor(language: string): string {
  const colors: Record<string, string> = {
    JavaScript: '#f7df1e',
    TypeScript: '#3178c6',
    Python: '#3572A5',
    Java: '#b07219',
    Go: '#00ADD8',
    Rust: '#dea584',
    CSS: '#563d7c',
    HTML: '#e34c26',
    Ruby: '#701516',
    Swift: '#ffac45',
    Kotlin: '#A97BFF',
    C: '#555555',
    'C++': '#f34b7d',
    'C#': '#178600',
    PHP: '#4F5D95',
    Shell: '#89e051',
    Scala: '#c22d40',
    Vue: '#41b883',
    Dart: '#00B4AB',
  };
  return colors[language] || '#808080';
}

export function ToursTabScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();

  const [toursRepos, setToursRepos] = useState<RepoWithTour[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState('');
  const [completedTours, setCompletedTours] = useState<Set<string>>(new Set());

  // Load tours once on mount
  useEffect(() => {
    async function loadTours() {
      setIsLoading(true);
      setError(null);

      try {
        const { repos } = await getReposWithTours();
        setToursRepos(repos);
      } catch (err) {
        console.error('Error fetching tours:', err);
        setError(err instanceof Error ? err.message : 'Failed to load tours');
      } finally {
        setIsLoading(false);
      }
    }

    loadTours();
  }, []);

  // Refresh completed tours status when screen is focused
  useFocusEffect(
    useCallback(() => {
      async function loadCompletedTours() {
        const completed = await getCompletedTours();
        setCompletedTours(completed);
      }
      loadCompletedTours();
    }, [])
  );

  const filteredToursRepos = React.useMemo(() => {
    if (!filter.trim()) return toursRepos;

    const lowerQuery = filter.toLowerCase();
    return toursRepos.filter(repo =>
      repo.full_name.toLowerCase().includes(lowerQuery) ||
      repo.description?.toLowerCase().includes(lowerQuery) ||
      repo.language?.toLowerCase().includes(lowerQuery)
    );
  }, [toursRepos, filter]);

  const handleTourRepoPress = useCallback(
    (repo: RepoWithTour) => {
      navigation.navigate('TourFileCity', {
        owner: repo.owner,
        name: repo.name,
        fullName: repo.full_name,
        forkOwner: repo.forkOwner,
        forkRepo: repo.forkRepo,
        tourPath: repo.tourPath,
      });
    },
    [navigation]
  );

  const handleRetry = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { repos } = await getReposWithTours();
      setToursRepos(repos);
    } catch (err) {
      console.error('Error fetching tours:', err);
      setError(err instanceof Error ? err.message : 'Failed to load tours');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const renderTourRepoItem = useCallback(
    ({ item }: { item: RepoWithTour }) => {
      const tourId = `${item.owner}/${item.name}/${item.tourPath}`;
      const isCompleted = completedTours.has(tourId);

      return (
        <TouchableOpacity
          style={[styles.repoItem, { backgroundColor: theme.colors.surface }]}
          onPress={() => handleTourRepoPress(item)}
          activeOpacity={0.7}
        >
          <View style={styles.repoHeaderWithAvatar}>
            <Image
              source={{ uri: item.owner_avatar_url }}
              style={styles.ownerAvatar}
            />
            <View style={styles.repoInfo}>
              <Text style={[styles.repoName, { color: theme.colors.primary }]}>
                {item.name}
              </Text>
              <Text style={[styles.ownerName, { color: theme.colors.textSecondary }]}>
                {item.owner}
              </Text>
            </View>
            <View style={styles.repoStats}>
              <LucideIcon name="Star" color={theme.colors.textSecondary} size={12} />
              <Text style={[styles.starCount, { color: theme.colors.textSecondary }]}>
                {formatStars(item.stargazers_count)}
              </Text>
            </View>
          </View>
          {item.description && (
            <Text
              style={[styles.repoDescription, { color: theme.colors.textSecondary }]}
              numberOfLines={2}
            >
              {item.description}
            </Text>
          )}
          <View style={styles.languageContainer}>
            {item.language && (
              <>
                <View
                  style={[
                    styles.languageDot,
                    { backgroundColor: getLanguageColor(item.language) },
                  ]}
                />
                <Text style={[styles.languageText, { color: theme.colors.textSecondary }]}>
                  {item.language}
                </Text>
              </>
            )}
            <Text style={[
              styles.tourBadgeInline,
              {
                color: isCompleted ? theme.colors.success : theme.colors.primary,
                borderColor: isCompleted ? theme.colors.success : theme.colors.primary,
                marginLeft: item.language ? 8 : 0,
              }
            ]}>
              {isCompleted ? 'Tour Completed' : 'Tour Available'}
            </Text>
          </View>
        </TouchableOpacity>
      );
    },
    [theme, handleTourRepoPress, completedTours]
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerContent}>
          <Text style={[styles.title, { color: theme.colors.text }]}>
            Tours
          </Text>
          <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
            Guided tours of repositories
          </Text>
        </View>
      </View>

      {/* Filter Input */}
      {!isLoading && toursRepos.length > 0 && (
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
              placeholder="Filter tours..."
              placeholderTextColor={theme.colors.textSecondary}
              value={filter}
              onChangeText={setFilter}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {filter.length > 0 && (
              <TouchableOpacity
                onPress={() => setFilter('')}
                style={styles.clearButton}
              >
                <ClearIcon color={theme.colors.textSecondary} size={14} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {/* Content */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <LoadingSpinner size="large" color={theme.colors.primary} />
          <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
            Loading tours...
          </Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <WarningIcon color={theme.colors.error} size={48} />
          <Text style={[styles.errorText, { color: theme.colors.error }]}>
            {error}
          </Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: theme.colors.primary }]}
            onPress={handleRetry}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : toursRepos.length === 0 ? (
        <View style={styles.emptyStateContainer}>
          <CityIcon color={theme.colors.textSecondary} size={80} />
          <Text style={[styles.emptyStateTitle, { color: theme.colors.text }]}>
            No Tours Available
          </Text>
          <Text style={[styles.emptyStateText, { color: theme.colors.textSecondary }]}>
            Check back later for guided tours of popular repositories
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredToursRepos}
          keyExtractor={(item) => `${item.owner}/${item.name}`}
          renderItem={renderTourRepoItem}
          contentContainerStyle={styles.resultsList}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <Text style={[styles.resultsCount, { color: theme.colors.textSecondary }]}>
              {filteredToursRepos.length} of {toursRepos.length} {toursRepos.length === 1 ? 'tour' : 'tours'}
              {filter.trim() && ` matching "${filter}"`}
            </Text>
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
                {filter.trim()
                  ? `No tours matching "${filter}"`
                  : 'No tours available'
                }
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 15,
    marginTop: 4,
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  errorText: {
    fontSize: 15,
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 20,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  resultsList: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  resultsCount: {
    fontSize: 13,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  repoItem: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  repoHeaderWithAvatar: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  ownerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  repoInfo: {
    flex: 1,
  },
  repoName: {
    fontSize: 16,
    fontWeight: '600',
  },
  ownerName: {
    fontSize: 13,
    marginTop: 2,
  },
  repoStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 12,
    gap: 4,
  },
  starCount: {
    fontSize: 13,
  },
  repoDescription: {
    fontSize: 14,
    marginTop: 6,
    lineHeight: 20,
  },
  languageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  languageDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 6,
  },
  languageText: {
    fontSize: 12,
  },
  tourBadgeInline: {
    fontSize: 11,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
  },
  emptyContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 15,
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 20,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  // Icon styles
  iconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  clearLine: {
    position: 'absolute',
    borderRadius: 2,
  },
  cityIconContainer: {
    position: 'relative',
  },
  cityBuilding: {
    position: 'absolute',
    borderRadius: 2,
  },
  cityGround: {
    position: 'absolute',
    left: 0,
    right: 0,
    borderRadius: 1,
  },
  warningTriangle: {
    width: 0,
    height: 0,
  },
  warningExclamation: {
    position: 'absolute',
    borderRadius: 1,
  },
  warningDot: {
    position: 'absolute',
  },
});

export default ToursTabScreen;
