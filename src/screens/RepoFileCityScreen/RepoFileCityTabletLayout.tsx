/**
 * RepoFileCityTabletLayout
 *
 * Tablet-optimized layout for repository profile with desktop-inspired design:
 * - Activity heatmap banner at top
 * - Owner avatar overlapping banner
 * - Stats row with key metrics
 * - File City 3D visualization at bottom
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp, NavigationProp } from '@react-navigation/native';
import { useTheme } from '@principal-ade/industry-theme';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
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
import { fetchRepoReadme, fetchRepositoryContributors, type Contributor } from '../../services/GithubService';

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

/**
 * Generate HTML for README display
 */
function getReadmeHTML(readme: string, backgroundColor: string): string {
  const isDark = backgroundColor === '#000000' ||
                 backgroundColor === '#000' ||
                 backgroundColor.toLowerCase().startsWith('#0') ||
                 backgroundColor.toLowerCase().startsWith('#1');

  return `
    <!DOCTYPE html>
    <html data-color-mode="${isDark ? 'dark' : 'light'}" data-dark-theme="dark">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/github-markdown-css/5.5.1/github-markdown${isDark ? '-dark' : ''}.min.css">
        <style>
          body {
            margin: 0;
            padding: 16px;
            background-color: ${backgroundColor};
          }
          .markdown-body {
            background-color: transparent;
          }
        </style>
      </head>
      <body class="markdown-body">
        ${readme}
      </body>
    </html>
  `;
}

export function RepoFileCityTabletLayout() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const layout = useWindowDimensions();
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
  const [readme, setReadme] = useState<string>('');
  const [readmeLoading, setReadmeLoading] = useState(true);
  const [contributors, setContributors] = useState<Contributor[]>([]);
  const [contributorsLoading, setContributorsLoading] = useState(true);

  // Bottom sheet ref and snap points
  const bottomSheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ['50%', '70%'], []);

  // Detect landscape orientation
  const isLandscape = layout.width > layout.height;

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

  // Fetch README
  useEffect(() => {
    if (!token) {
      setReadmeLoading(false);
      return;
    }

    let cancelled = false;

    async function loadReadme() {
      try {
        const content = await fetchRepoReadme(token!, owner, name);
        if (!cancelled) {
          setReadme(content);
          setReadmeLoading(false);
        }
      } catch (err) {
        console.warn('Failed to load README:', err);
        if (!cancelled) {
          setReadmeLoading(false);
        }
      }
    }

    loadReadme();

    return () => {
      cancelled = true;
    };
  }, [token, owner, name]);

  // Fetch contributors
  useEffect(() => {
    let cancelled = false;

    async function loadContributors() {
      try {
        setContributorsLoading(true);
        const data = await fetchRepositoryContributors(owner, name);
        if (!cancelled) {
          setContributors(data);
          setContributorsLoading(false);
        }
      } catch (err) {
        console.warn('Failed to load contributors:', err);
        if (!cancelled) {
          setContributorsLoading(false);
        }
      }
    }

    loadContributors();

    return () => {
      cancelled = true;
    };
  }, [owner, name]);

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

  const handleOpenReadme = useCallback(() => {
    bottomSheetRef.current?.expand();
  }, []);

  const handleCloseReadme = useCallback(() => {
    bottomSheetRef.current?.close();
  }, []);

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
                    const ownerType = repoInfo?.ownerType;
                    navigation.navigate('UserProfile', {
                      username: owner,
                      isOrganization: ownerType === 'Organization',
                      isBot: ownerType === 'Bot',
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
                        { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
                      ]}
                      onPress={() =>
                        navigation.navigate('AskTrail', {
                          owner,
                          repo: name,
                          fullName: route.params.fullName,
                        })
                      }
                    >
                      <LucideIcon name="Sparkles" size={16} color={theme.colors.primary} />
                    </TouchableOpacity>
                  )}
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
                  <TouchableOpacity
                    style={[
                      styles.actionButton,
                      { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
                    ]}
                    onPress={handleOpenReadme}
                    disabled={readmeLoading || !readme}
                  >
                    <LucideIcon
                      name="FileText"
                      size={16}
                      color={theme.colors.textSecondary}
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

            {/* Split View: File City + README */}
            <View style={[styles.contentContainer, isLandscape && styles.contentContainerLandscape]}>
              {/* File City Section */}
              <View style={[styles.fileCityContainer, isLandscape && styles.fileCityContainerLandscape]}>
                <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                  File City
                </Text>
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

              {/* Contributors Section */}
              <View style={[styles.contributorsContainer, isLandscape && styles.contributorsContainerLandscape]}>
                <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                  Contributors
                </Text>
                {contributorsLoading ? (
                  <View style={styles.contributorsLoading}>
                    <LoadingSpinner size="small" color={theme.colors.primary} />
                  </View>
                ) : contributors.length > 0 ? (
                  <ScrollView
                    style={styles.contributorsList}
                    contentContainerStyle={styles.contributorsGrid}
                  >
                    {contributors.map((contributor) => (
                      <TouchableOpacity
                        key={contributor.id}
                        style={styles.contributorItem}
                        onPress={() => {
                          navigation.navigate('UserProfile', {
                            username: contributor.login,
                            isOrganization: contributor.type === 'Organization',
                            isBot: contributor.type === 'Bot',
                          });
                        }}
                      >
                        <Image
                          source={{ uri: contributor.avatar_url }}
                          style={styles.contributorAvatar}
                          resizeMode="cover"
                        />
                        <Text
                          style={[styles.contributorLogin, { color: theme.colors.text }]}
                          numberOfLines={1}
                        >
                          {contributor.login}
                        </Text>
                        <Text style={[styles.contributorCount, { color: theme.colors.textSecondary }]}>
                          {formatNumber(contributor.contributions)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                ) : (
                  <View style={styles.noContributorsContainer}>
                    <Text style={[styles.noContributorsText, { color: theme.colors.textSecondary }]}>
                      No contributors found
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </ScrollView>
      )}

      {/* README Bottom Sheet */}
      <BottomSheet
        ref={bottomSheetRef}
        index={-1}
        snapPoints={snapPoints}
        enablePanDownToClose={true}
        backgroundStyle={{ backgroundColor: theme.colors.background }}
        handleIndicatorStyle={{ backgroundColor: theme.colors.textSecondary }}
      >
        <BottomSheetView style={styles.bottomSheetContainer}>
          {/* Header */}
          <View style={[styles.bottomSheetHeader, { borderBottomColor: theme.colors.border }]}>
            <Text style={[styles.bottomSheetTitle, { color: theme.colors.text }]}>README</Text>
            <TouchableOpacity
              onPress={handleCloseReadme}
              style={styles.bottomSheetCloseButton}
            >
              <LucideIcon name="X" size={24} color={theme.colors.text} />
            </TouchableOpacity>
          </View>

          {/* README Content */}
          {readmeLoading ? (
            <View style={styles.bottomSheetLoading}>
              <LoadingSpinner size="large" color={theme.colors.primary} />
              <Text style={[styles.bottomSheetLoadingText, { color: theme.colors.textSecondary }]}>
                Loading README...
              </Text>
            </View>
          ) : readme ? (
            <View style={styles.bottomSheetWebviewContainer}>
              <WebView
                source={{ html: getReadmeHTML(readme, theme.colors.background) }}
                style={styles.bottomSheetWebview}
                scrollEnabled={true}
                originWhitelist={['*']}
              />
            </View>
          ) : (
            <View style={styles.bottomSheetNoContent}>
              <Text style={[styles.bottomSheetNoContentText, { color: theme.colors.textSecondary }]}>
                No README available
              </Text>
            </View>
          )}
        </BottomSheetView>
      </BottomSheet>
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
  contentContainer: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  contentContainerLandscape: {
    flexDirection: 'row',
    gap: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  fileCityContainer: {
    height: 400,
    marginBottom: 24,
    borderRadius: 12,
    overflow: 'hidden',
  },
  fileCityContainerLandscape: {
    flex: 1,
    marginBottom: 0,
  },
  noDataContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noDataText: {
    fontSize: 14,
  },
  contributorsContainer: {
    marginBottom: 24,
  },
  contributorsContainerLandscape: {
    flex: 1,
    marginBottom: 0,
  },
  contributorsLoading: {
    height: 400,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contributorsList: {
    height: 400,
  },
  contributorsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    padding: 8,
  },
  contributorItem: {
    width: 80,
    alignItems: 'center',
    gap: 6,
  },
  contributorAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  contributorLogin: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
  contributorCount: {
    fontSize: 10,
  },
  noContributorsContainer: {
    height: 400,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noContributorsText: {
    fontSize: 14,
  },
  bottomSheetContainer: {
    flex: 1,
  },
  bottomSheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  bottomSheetTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  bottomSheetCloseButton: {
    padding: 8,
  },
  bottomSheetLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomSheetLoadingText: {
    fontSize: 14,
    marginTop: 12,
  },
  bottomSheetWebviewContainer: {
    flex: 1,
  },
  bottomSheetWebview: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  bottomSheetNoContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomSheetNoContentText: {
    fontSize: 14,
  },
});
