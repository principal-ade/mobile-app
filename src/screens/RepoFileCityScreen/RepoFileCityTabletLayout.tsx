/**
 * RepoFileCityTabletLayout
 *
 * Tablet-optimized layout for repository profile with desktop-inspired design:
 * - Activity heatmap banner at top
 * - Owner avatar overlapping banner
 * - Stats row with key metrics
 * - File City 3D visualization at bottom
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp, NavigationProp } from '@react-navigation/native';
import { useTheme } from '@principal-ade/industry-theme';
import { FileCityCanvas } from '../../components/FileCity';
import type { CityData, HighlightLayer, FileTypeIconConfig } from '../../components/FileCity';
import { getFileCityForRepo, type RepoInfo } from '../../services/FileCityService';
import { useAuthContext } from '../../context/AuthContext';
import type { FeedStackParamList } from '../../navigation/types';
import { ContributionGrid, type DailyContribution } from '../../components/ContributionGrid';
import { getRepoContributions } from '../../services/GitHubSearchService';
import { useFeedPreferences } from '../../context/FeedPreferencesContext';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { LucideIcon } from '../../components/LucideIcon';
import { isBotLogin, cleanBotLogin } from '../../utils/githubHelpers';

type RouteProps = RouteProp<FeedStackParamList, 'RepoFileCity'>;

/**
 * Format number with k/m suffix
 */
function formatNumber(num: number): string {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1).replace(/\.0$/, '')}m`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1).replace(/\.0$/, '')}k`;
  }
  return String(num);
}

/**
 * Calculate repository age in human-readable format
 */
function getRepositoryAge(createdAt: string): string {
  const created = new Date(createdAt);
  const now = new Date();
  const diffMs = now.getTime() - created.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 30) {
    return `${diffDays} day${diffDays !== 1 ? 's' : ''}`;
  }

  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths < 12) {
    return `${diffMonths} month${diffMonths !== 1 ? 's' : ''}`;
  }

  const diffYears = Math.floor(diffMonths / 12);
  return `${diffYears} year${diffYears !== 1 ? 's' : ''}`;
}

export function RepoFileCityTabletLayout() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp<FeedStackParamList>>();
  const route = useRoute<RouteProps>();
  const { isAuthenticated, token } = useAuthContext();

  const { owner, name } = route.params;
  const { watchedRepos, addRepo, removeRepo } = useFeedPreferences();

  const [isLoading, setIsLoading] = useState(true);
  const [isStarred, setIsStarred] = useState(false);
  const [starToggling, setStarToggling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cityData, setCityData] = useState<CityData | null>(null);
  const [highlightLayers, setHighlightLayers] = useState<HighlightLayer[]>([]);
  const [iconMap, setIconMap] = useState<Map<string, FileTypeIconConfig>>(new Map());
  const [repoInfo, setRepoInfo] = useState<RepoInfo | null>(null);
  const [contributions, setContributions] = useState<DailyContribution[]>([]);
  const [contributionsLoading, setContributionsLoading] = useState(true);

  // Check if repo is being watched
  const isRepoWatching = React.useMemo(() => {
    return watchedRepos.some((r) =>
      r.owner.toLowerCase() === owner.toLowerCase() &&
      r.repo.toLowerCase() === name.toLowerCase()
    );
  }, [watchedRepos, owner, name]);

  // Fetch contribution data for header background
  useEffect(() => {
    async function fetchContributions() {
      try {
        setContributionsLoading(true);
        const response = await getRepoContributions(owner, name);
        setContributions(response.contributions);
      } catch (error) {
        console.error('Error fetching repo contributions:', error);
        setContributions([]);
      } finally {
        setContributionsLoading(false);
      }
    }

    fetchContributions();
  }, [owner, name]);

  // Fetch file city data
  useEffect(() => {
    let cancelled = false;

    async function fetchFileCity() {
      setIsLoading(true);
      setError(null);

      try {
        const result = await getFileCityForRepo(owner, name);

        if (cancelled) return;

        setCityData(result.cityData);
        setHighlightLayers(result.highlightLayers);
        setIconMap(result.iconMap);
        setRepoInfo(result.repoInfo);
      } catch (err) {
        if (cancelled) return;

        console.error('Error fetching file city:', err);
        setError(
          err instanceof Error
            ? err.message
            : 'Failed to load repository structure'
        );
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    fetchFileCity();

    return () => {
      cancelled = true;
    };
  }, [owner, name]);

  // Check if user has starred when authenticated
  useEffect(() => {
    if (!isAuthenticated || !token) return;

    let cancelled = false;

    async function checkStarred() {
      try {
        const starRes = await fetch(`https://api.github.com/user/starred/${owner}/${name}`, {
          headers: { Authorization: `token ${token}` },
        });
        if (!cancelled) {
          setIsStarred(starRes.status === 204);
        }
      } catch (err) {
        console.error('Error checking star status:', err);
      }
    }

    checkStarred();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, token, owner, name]);

  const handleToggleStar = async () => {
    if (!token || starToggling) return;

    const previousState = isStarred;
    setIsStarred(!isStarred);
    setStarToggling(true);

    try {
      const method = isStarred ? 'DELETE' : 'PUT';
      const res = await fetch(`https://api.github.com/user/starred/${owner}/${name}`, {
        method,
        headers: { Authorization: `token ${token}` },
      });

      if (!res.ok && res.status !== 204) {
        setIsStarred(previousState);
      }
    } catch (err) {
      console.error('Error toggling star:', err);
      setIsStarred(previousState);
    } finally {
      setStarToggling(false);
    }
  };

  const handleToggleRepoWatch = () => {
    if (isRepoWatching) {
      removeRepo(owner, name);
    } else {
      addRepo({
        owner,
        repo: name,
        watchedAt: new Date().toISOString(),
      });
    }
  };

  // Calculate total commits from contributions
  const totalCommits = contributions.reduce((sum, day) => sum + day.count, 0);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Close button */}
      <TouchableOpacity
        style={[styles.closeButton, { top: insets.top + 12 }]}
        onPress={() => navigation.goBack()}
      >
        <View style={[styles.closeButtonCircle, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.closeButtonText, { color: theme.colors.text }]}>×</Text>
        </View>
      </TouchableOpacity>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <LoadingSpinner size="large" color={theme.colors.primary} />
          <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
            Building city from repository...
          </Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: theme.colors.error }]}>
            {error}
          </Text>
        </View>
      ) : (
        <ScrollView style={styles.scrollView}>
          {/* Activity Heatmap Banner */}
          <View style={[styles.heatmapBanner, { marginTop: insets.top }]}>
            <ContributionGrid
              contributions={contributions}
              layout="weeks"
              months={12}
              loading={contributionsLoading}
              scrollToEnd={true}
            />
          </View>

          {/* Profile Header with overlapping avatar */}
            <View style={styles.profileHeader}>
              <View style={styles.avatarAndStats}>
                {/* Owner Avatar - overlaps banner */}
                <TouchableOpacity
                  onPress={() => {
                    const isBot = isBotLogin(owner);
                    const cleanLogin = cleanBotLogin(owner);
                    navigation.navigate('UserProfile', {
                      username: cleanLogin,
                      isBot,
                    });
                  }}
                >
                  {repoInfo?.ownerAvatarUrl ? (
                    <Image
                      source={{ uri: repoInfo.ownerAvatarUrl }}
                      style={[styles.avatar, { borderColor: theme.colors.background }]}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={[styles.avatarPlaceholder, { backgroundColor: theme.colors.surface, borderColor: theme.colors.background }]}>
                      <Text style={[styles.avatarInitial, { color: theme.colors.textSecondary }]}>
                        {owner.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>

                {/* Stats Row */}
                <View style={styles.statsRow}>
                  <View style={styles.statItem}>
                    <Text style={[styles.statValue, { color: theme.colors.text }]}>
                      {formatNumber(repoInfo?.stargazersCount || 0)}
                    </Text>
                    <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
                      stars
                    </Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={[styles.statValue, { color: theme.colors.text }]}>
                      {formatNumber(totalCommits)}
                    </Text>
                    <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
                      commits
                    </Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={[styles.statValue, { color: theme.colors.text }]}>
                      {repoInfo?.createdAt ? getRepositoryAge(repoInfo.createdAt) : '—'}
                    </Text>
                    <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
                      old
                    </Text>
                  </View>
                  {cityData && (
                    <View style={styles.statItem}>
                      <Text style={[styles.statValue, { color: theme.colors.text }]}>
                        {formatNumber(cityData.metadata.totalFiles)}
                      </Text>
                      <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
                        files
                      </Text>
                    </View>
                  )}
                </View>

                {/* Action Buttons */}
                <View style={styles.actionButtons}>
                  {isAuthenticated && (
                    <TouchableOpacity
                      style={[
                        styles.actionButton,
                        { backgroundColor: isStarred ? theme.colors.surface : 'transparent', borderColor: theme.colors.border },
                      ]}
                      onPress={handleToggleStar}
                      disabled={starToggling}
                    >
                      <LucideIcon
                        name="Star"
                        size={16}
                        color={isStarred ? theme.colors.warning : theme.colors.textSecondary}
                      />
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={[
                      styles.actionButton,
                      { backgroundColor: isRepoWatching ? theme.colors.primary : theme.colors.surface, borderColor: theme.colors.border },
                    ]}
                    onPress={handleToggleRepoWatch}
                  >
                    <LucideIcon
                      name={isRepoWatching ? "Eye" : "EyeOff"}
                      size={16}
                      color={isRepoWatching ? theme.colors.background : theme.colors.textSecondary}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Repository Name */}
              <View style={styles.nameContainer}>
                <Text style={[styles.repoName, { color: theme.colors.text }]}>
                  {name}
                </Text>
                {repoInfo?.language && (
                  <View style={styles.languageBadge}>
                    <View style={[styles.languageDot, { backgroundColor: theme.colors.accent }]} />
                    <Text style={[styles.languageText, { color: theme.colors.textSecondary }]}>
                      {repoInfo.language}
                    </Text>
                  </View>
                )}
              </View>

              {/* Description */}
              {repoInfo?.description && (
                <Text style={[styles.description, { color: theme.colors.textSecondary }]}>
                  {repoInfo.description}
                </Text>
              )}
            </View>

            {/* File City 3D Section */}
            <View style={styles.fileCityContainer}>
              {cityData ? (
                <FileCityCanvas
                  cityData={cityData}
                  highlightLayers={highlightLayers}
                  iconMap={iconMap}
                  showFileTypeIcons={true}
                  backgroundColor="transparent"
                  defaultDistrictColor="#4B5155"
                  buildingBorderRadius={0}
                  showDirectoryLabels={false}
                  enableZoom={true}
                  enablePan={true}
                />
              ) : (
                <View style={styles.noDataContainer}>
                  <Text style={[styles.noDataText, { color: theme.colors.textSecondary }]}>
                    No city data available
                  </Text>
                </View>
              )}
            </View>
          </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  closeButton: {
    position: 'absolute',
    right: 16,
    zIndex: 200,
  },
  closeButtonCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  closeButtonText: {
    fontSize: 28,
    fontWeight: '300',
    lineHeight: 28,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    fontSize: 14,
    marginTop: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
  },
  heatmapBanner: {
    height: 170,
  },
  scrollView: {
    flex: 1,
  },
  profileHeader: {
    paddingHorizontal: 16,
    marginTop: -60,
    position: 'relative',
  },
  avatarAndStats: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 16,
    marginBottom: 16,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
  },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    fontSize: 40,
    fontWeight: '600',
  },
  statsRow: {
    flex: 1,
    flexDirection: 'row',
    gap: 24,
    paddingBottom: 8,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '600',
  },
  statLabel: {
    fontSize: 12,
    marginTop: 2,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
    paddingBottom: 8,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  repoName: {
    fontSize: 24,
    fontWeight: '700',
  },
  languageBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  languageDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  languageText: {
    fontSize: 12,
    fontWeight: '500',
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 24,
  },
  fileCityContainer: {
    height: 400,
    marginHorizontal: 16,
    marginBottom: 24,
    borderRadius: 12,
    overflow: 'hidden',
  },
  noDataContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noDataText: {
    fontSize: 14,
  },
});
