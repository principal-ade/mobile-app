import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
  ScrollView,
} from 'react-native';
import { LoadingSpinner } from '../components/LoadingSpinner';

// Custom warning icon (no emoji)
function WarningIcon({ color, size = 48 }: { color: string; size?: number }) {
  return (
    <View style={[warningStyles.wrapper, { width: size, height: size }]}>
      <View
        style={[
          warningStyles.triangle,
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
          warningStyles.exclamation,
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
          warningStyles.dot,
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

const warningStyles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  triangle: {
    width: 0,
    height: 0,
  },
  exclamation: {
    position: 'absolute',
    borderRadius: 1,
  },
  dot: {
    position: 'absolute',
  },
});
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useTheme } from '@principal-ade/industry-theme';
import { FileCityCanvas } from '../components/FileCity';
import { Canvas, Path, Line, Text as SkiaText, vec, Skia, matchFont } from '@shopify/react-native-skia';
import type { CityBuilding, CityDistrict, CityData, HighlightLayer, FileTypeIconConfig } from '../components/FileCity';
import { getFileCityForRepo, type RepoInfo } from '../services/FileCityService';
import { getStargazers, type Stargazer } from '../services/StargazersService';
import { getContributors, type Contributor } from '../services/ContributorsService';
import { useAuthContext } from '../context/AuthContext';
import type { RootStackParamList } from '../navigation/types';
import { DailyActivityHeatmap, type CommitTimestamp } from '../components/DailyActivityHeatmap';
import { getRepoActivity, checkTourAvailability } from '../services/FeedApiService';
import { useFeedPreferences } from '../context/FeedPreferencesContext';

type RouteProps = RouteProp<RootStackParamList, 'RepoFileCity'>;

const fontStyle = {
  fontFamily: 'System',
  fontSize: 10,
  fontWeight: '400' as const,
};

const chartFont = matchFont(fontStyle);

// Star Chart Component
function StarChart({
  stargazers,
  totalCount,
  size,
  theme
}: {
  stargazers: Stargazer[];
  totalCount: number;
  size: number;
  theme: { colors: { primary: string; text: string; textSecondary: string } };
}) {

  const chartWidth = size;
  const chartHeight = size;
  const padding = { left: 40, right: 20, top: 20, bottom: 50 };
  const graphWidth = chartWidth - padding.left - padding.right;
  const graphHeight = chartHeight - padding.top - padding.bottom;

  // Sort by time (oldest first) and calculate cumulative
  const sorted = [...stargazers]
    .sort((a, b) => new Date(a.starredAt).getTime() - new Date(b.starredAt).getTime());

  const startTime = new Date(sorted[0].starredAt).getTime();
  const endTime = new Date(sorted[sorted.length - 1].starredAt).getTime();
  const timeRange = endTime - startTime || 1;

  // Calculate actual cumulative counts
  // The oldest fetched star is at position (totalCount - stargazers.length + 1)
  // The newest fetched star is at position totalCount
  const startCount = totalCount - stargazers.length;

  // Create cumulative points with actual star counts
  const points = sorted.map((star, i) => {
    const time = new Date(star.starredAt).getTime();
    const x = padding.left + ((time - startTime) / timeRange) * graphWidth;
    const cumulative = startCount + i + 1;
    const y = padding.top + graphHeight - ((cumulative - startCount) / stargazers.length) * graphHeight;
    return { x, y, count: cumulative };
  });

  // Build path
  const path = Skia.Path.Make();
  points.forEach((p, i) => {
    if (i === 0) path.moveTo(p.x, p.y);
    else path.lineTo(p.x, p.y);
  });

  // Y-axis ticks showing actual cumulative counts
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map(pct => ({
    value: Math.round(startCount + pct * stargazers.length),
    y: padding.top + graphHeight - (pct * graphHeight),
  }));

  // X-axis ticks (start, middle, end dates)
  const startDate = new Date(sorted[0].starredAt);
  const endDate = new Date(sorted[sorted.length - 1].starredAt);
  const midTime = startTime + timeRange / 2;
  const midDate = new Date(midTime);

  const formatDate = (d: Date) => {
    const month = d.toLocaleDateString('en-US', { month: 'short' });
    const day = d.getDate();
    return `${month} ${day}`;
  };

  const xTicks = [
    { label: formatDate(startDate), x: padding.left },
    { label: formatDate(midDate), x: padding.left + graphWidth / 2 },
    { label: formatDate(endDate), x: padding.left + graphWidth },
  ];

  const axisColor = theme.colors.textSecondary;
  const tickLength = 5;

  return (
    <>
      <Canvas style={{ width: chartWidth, height: chartHeight }}>
        {/* Y-axis */}
        <Line
          p1={vec(padding.left, padding.top)}
          p2={vec(padding.left, padding.top + graphHeight)}
          color={axisColor}
          strokeWidth={1}
        />
        {/* X-axis */}
        <Line
          p1={vec(padding.left, padding.top + graphHeight)}
          p2={vec(padding.left + graphWidth, padding.top + graphHeight)}
          color={axisColor}
          strokeWidth={1}
        />

        {/* Y-axis ticks and labels */}
        {yTicks.map((tick, i) => (
          <React.Fragment key={`y-${i}`}>
            <Line
              p1={vec(padding.left - tickLength, tick.y)}
              p2={vec(padding.left, tick.y)}
              color={axisColor}
              strokeWidth={1}
            />
            <SkiaText
              x={padding.left - tickLength - 22}
              y={tick.y + 3}
              text={tick.value.toString()}
              font={chartFont}
              color={axisColor}
            />
          </React.Fragment>
        ))}

        {/* X-axis ticks and labels */}
        {xTicks.map((tick, i) => (
          <React.Fragment key={`x-${i}`}>
            <Line
              p1={vec(tick.x, padding.top + graphHeight)}
              p2={vec(tick.x, padding.top + graphHeight + tickLength)}
              color={axisColor}
              strokeWidth={1}
            />
            <SkiaText
              x={tick.x - (i === 0 ? 0 : i === 2 ? 35 : 18)}
              y={padding.top + graphHeight + tickLength + 14}
              text={tick.label}
              font={chartFont}
              color={axisColor}
            />
          </React.Fragment>
        ))}

        {/* Data line */}
        <Path
          path={path}
          color={theme.colors.primary}
          style="stroke"
          strokeWidth={2.5}
          strokeCap="round"
          strokeJoin="round"
        />
      </Canvas>
    </>
  );
}

function formatCount(count: number | undefined): string {
  if (count === undefined) return '—';
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1).replace(/\.0$/, '')}k`;
  }
  return count.toString();
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
// Canvas is a square, capped at 50% of screen height
const CANVAS_SIZE = Math.min(SCREEN_WIDTH, SCREEN_HEIGHT * 0.4);

export function RepoFileCityScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const route = useRoute<RouteProps>();

  const { owner, name, fullName } = route.params;
  const { isAuthenticated, token } = useAuthContext();
  const { watchedRepos, addRepo, removeRepo } = useFeedPreferences();

  const [isLoading, setIsLoading] = useState(true);
  const [isStarred, setIsStarred] = useState(false);
  const [starToggling, setStarToggling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cityData, setCityData] = useState<CityData | null>(null);
  const [highlightLayers, setHighlightLayers] = useState<HighlightLayer[]>([]);
  const [iconMap, setIconMap] = useState<Map<string, FileTypeIconConfig>>(new Map());
  const [activeViz, setActiveViz] = useState<'city' | 'stars' | 'heatmap'>('city');
  const [repoInfo, setRepoInfo] = useState<RepoInfo | null>(null);
  const [stargazers, setStargazers] = useState<Stargazer[]>([]);
  const [stargazersTotalCount, setStargazersTotalCount] = useState(0);
  const [stargazersLoading, setStargazersLoading] = useState(false);
  const [stargazersFetched, setStargazersFetched] = useState(false);

  const [contributors, setContributors] = useState<Contributor[]>([]);
  const [recentCommits, setRecentCommits] = useState<CommitTimestamp[]>([]);
  const [contributorsLoading, setContributorsLoading] = useState(false);
  const [contributorsFetched, setContributorsFetched] = useState(false);
  const [selectedContributor, setSelectedContributor] = useState<string | null>(null);

  const [isTourAvailable, setIsTourAvailable] = useState(false);

  // Check if repo is being watched
  const isRepoWatching = React.useMemo(() => {
    return watchedRepos.some((r) =>
      r.owner.toLowerCase() === owner.toLowerCase() &&
      r.repo.toLowerCase() === name.toLowerCase()
    );
  }, [watchedRepos, owner, name]);

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

  // Fetch stargazers when Stars tab is selected
  useEffect(() => {
    if (activeViz !== 'stars' || stargazersFetched || !owner || !name) return;

    let cancelled = false;

    async function fetchStargazers() {
      setStargazersLoading(true);
      try {
        const result = await getStargazers(owner, name, 100);
        if (!cancelled) {
          setStargazers(result.stargazers);
          setStargazersTotalCount(result.totalCount);
          setStargazersFetched(true);
        }
      } catch (err) {
        console.error('Error fetching stargazers:', err);
      } finally {
        if (!cancelled) {
          setStargazersLoading(false);
        }
      }
    }

    fetchStargazers();

    return () => {
      cancelled = true;
    };
  }, [activeViz, owner, name, stargazersFetched]);

  // Fetch contributors when City or Heatmap tab is selected
  useEffect(() => {
    if ((activeViz !== 'city' && activeViz !== 'heatmap') || contributorsFetched) return;
    if (!owner || !name) return;

    let cancelled = false;

    async function fetchContributorsData() {
      setContributorsLoading(true);
      try {
        // Always fetch contributors
        const contribs = await getContributors(owner, name, 30);

        if (!cancelled) {
          setContributors(contribs);
          setContributorsFetched(true);
        }
      } catch (err) {
        console.error('[RepoFileCityScreen] Error fetching contributors data:', err);
      } finally {
        if (!cancelled) {
          setContributorsLoading(false);
        }
      }
    }

    fetchContributorsData();

    return () => {
      cancelled = true;
    };
  }, [activeViz, owner, name, contributorsFetched]);

  // Fetch activity when Heatmap tab is selected
  useEffect(() => {
    if (activeViz !== 'heatmap' || !isAuthenticated || !token || !owner || !name) return;

    let cancelled = false;

    async function fetchActivityData() {
      if (!token) return; // Type guard for async context
      try {
        const activityResponse = await getRepoActivity(token, owner, name, 168);
        const commits: CommitTimestamp[] = activityResponse.commits.map((c) => ({
          timestamp: new Date(c.timestamp),
          repoId: c.repoId,
          authorLogin: c.authorLogin,
          authorAvatarUrl: c.authorAvatarUrl,
        }));

        if (!cancelled) {
          setRecentCommits(commits);
        }
      } catch (err) {
        console.error('[RepoFileCityScreen] Error fetching activity data:', err);
      }
    }

    fetchActivityData();

    return () => {
      cancelled = true;
    };
  }, [activeViz, owner, name, isAuthenticated, token]);

  // Check if user has starred/followed when authenticated
  useEffect(() => {
    if (!isAuthenticated || !token) return;

    let cancelled = false;

    async function checkUserStatus() {
      try {
        // Check if starred
        const starRes = await fetch(`https://api.github.com/user/starred/${owner}/${name}`, {
          headers: { Authorization: `token ${token}` },
        });
        if (!cancelled) {
          setIsStarred(starRes.status === 204);
        }
      } catch (err) {
        console.error('Error checking user status:', err);
      }
    }

    checkUserStatus();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, token, owner, name]);

  // Fetch tour availability
  useEffect(() => {
    let cancelled = false;

    async function fetchTourAvailability() {
      try {
        const tourResult = await checkTourAvailability(owner, name);

        if (!cancelled) {
          setIsTourAvailable(tourResult.hasTour);
        }
      } catch (err) {
        console.error('Error fetching tour availability:', err);
      }
    }

    fetchTourAvailability();

    return () => {
      cancelled = true;
    };
  }, [owner, name]);

  const handleToggleStar = async () => {
    if (!token || starToggling) return;

    setStarToggling(true);
    try {
      const method = isStarred ? 'DELETE' : 'PUT';
      const res = await fetch(`https://api.github.com/user/starred/${owner}/${name}`, {
        method,
        headers: { Authorization: `token ${token}` },
      });
      if (res.ok || res.status === 204) {
        setIsStarred(!isStarred);
      }
    } catch (err) {
      console.error('Error toggling star:', err);
    } finally {
      setStarToggling(false);
    }
  };

  // Toggle watch state
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

  const handleTourPress = () => {
    // TODO: Navigate to tour view or show tour
    console.log('Tour button pressed');
  };

  const handleBuildingPress = (_building: CityBuilding) => {
    // Currently no action on building press
  };

  const handleDistrictPress = (_district: CityDistrict) => {
    // Currently no action on district press
  };

  const handleRetry = () => {
    setCityData(null);
    setError(null);
    setIsLoading(true);
    // Re-trigger the effect by changing a dependency
    // The effect will re-run because we're setting loading to true
    getFileCityForRepo(owner, name)
      .then((result) => {
        setCityData(result.cityData);
        setHighlightLayers(result.highlightLayers);
        setIconMap(result.iconMap);
        setRepoInfo(result.repoInfo);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error('Error on retry:', err);
        setError(
          err instanceof Error
            ? err.message
            : 'Failed to load repository structure'
        );
        setIsLoading(false);
      });
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          style={styles.avatarButton}
          onPress={() => {/* TODO: navigate to owner profile */}}
        >
          {repoInfo?.ownerAvatarUrl ? (
            <Image
              source={{ uri: repoInfo.ownerAvatarUrl }}
              style={styles.avatar}
            />
          ) : (
            <View style={[styles.avatarPlaceholder, { backgroundColor: theme.colors.surface }]}>
              <Text style={[styles.avatarInitial, { color: theme.colors.textSecondary }]}>
                {owner.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text
            style={[styles.title, { color: theme.colors.text }]}
            numberOfLines={1}
          >
            {fullName}
          </Text>
        </View>
        <View style={styles.headerRight}>
          {isTourAvailable && (
            <TouchableOpacity
              style={styles.tourButton}
              onPress={handleTourPress}
            >
              <Text style={[styles.tourButtonText, { color: theme.colors.primary }]}>
                Tour
              </Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={[styles.closeIcon, { color: theme.colors.textSecondary }]}>
              ✕
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Content */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <LoadingSpinner size="large" color={theme.colors.primary} />
          <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
            Building city from repository...
          </Text>
          <Text style={[styles.loadingSubtext, { color: theme.colors.textSecondary }]}>
            Fetching file tree for {fullName}
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
      ) : cityData ? (
        <>
          {/* Visualization Area */}
          <View style={styles.canvasContainer}>
            {activeViz === 'city' && (
              <FileCityCanvas
                cityData={cityData}
                highlightLayers={highlightLayers}
                iconMap={iconMap}
                showFileTypeIcons={true}
                backgroundColor={theme.colors.background}
                defaultDistrictColor="#4B5155"
                buildingBorderRadius={0}
                showDirectoryLabels={false}
                enableZoom={true}
                enablePan={true}
                onBuildingPress={handleBuildingPress}
                onDistrictPress={handleDistrictPress}
              />
            )}
            {activeViz === 'stars' && (
              <View style={styles.starChartContainer}>
                {stargazersLoading ? (
                  <LoadingSpinner size="large" color={theme.colors.primary} />
                ) : stargazers.length >= 2 ? (
                  <StarChart stargazers={stargazers} totalCount={stargazersTotalCount} size={CANVAS_SIZE} theme={theme} />

                ) : (
                  <Text style={[styles.placeholderText, { color: theme.colors.textSecondary }]}>
                    {stargazers.length === 0 ? 'No recent stars' : 'Not enough data'}
                  </Text>
                )}
              </View>
            )}
            {activeViz === 'heatmap' && (
              <FileCityCanvas
                cityData={cityData}
                highlightLayers={highlightLayers}
                iconMap={iconMap}
                showFileTypeIcons={true}
                backgroundColor={theme.colors.background}
                defaultDistrictColor="#4B5155"
                buildingBorderRadius={0}
                showDirectoryLabels={false}
                enableZoom={true}
                enablePan={true}
                onBuildingPress={handleBuildingPress}
                onDistrictPress={handleDistrictPress}
              />
            )}
          </View>

          {/* Bottom Section */}
          <View style={[styles.bottomSection, { backgroundColor: theme.colors.surface, paddingBottom: insets.bottom + 16 }]}>
            {/* Tab Bar */}
            <View style={styles.tabBar}>
              <TouchableOpacity
                style={[
                  styles.tab,
                  activeViz === 'city' && styles.tabActive,
                  activeViz === 'city' && { borderBottomColor: theme.colors.primary },
                ]}
                onPress={() => setActiveViz('city')}
              >
                <Text
                  style={[
                    styles.tabText,
                    { color: activeViz === 'city' ? theme.colors.primary : theme.colors.textSecondary },
                  ]}
                >
                  Repo
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.tab,
                  activeViz === 'stars' && styles.tabActive,
                  activeViz === 'stars' && { borderBottomColor: theme.colors.primary },
                ]}
                onPress={() => setActiveViz('stars')}
              >
                <Text
                  style={[
                    styles.tabText,
                    { color: activeViz === 'stars' ? theme.colors.primary : theme.colors.textSecondary },
                  ]}
                >
                  Stars
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.tab,
                  activeViz === 'heatmap' && styles.tabActive,
                  activeViz === 'heatmap' && { borderBottomColor: theme.colors.primary },
                ]}
                onPress={() => setActiveViz('heatmap')}
              >
                <Text
                  style={[
                    styles.tabText,
                    { color: activeViz === 'heatmap' ? theme.colors.primary : theme.colors.textSecondary },
                  ]}
                >
                  Devs
                </Text>
              </TouchableOpacity>
            </View>

            {/* Tab Content */}
            <View style={styles.tabContent}>
              {activeViz === 'city' && (
                <ScrollView
                  style={styles.repoTabScroll}
                  showsVerticalScrollIndicator={false}
                >
                  {/* Description */}
                  {repoInfo?.description && (
                    <Text
                      style={[styles.description, { color: theme.colors.text }]}
                      numberOfLines={3}
                    >
                      {repoInfo.description}
                    </Text>
                  )}

                  {/* Stats Grid */}
                  <View style={styles.statsGrid}>
                    <View style={[styles.statCard, { backgroundColor: theme.colors.background }]}>
                      <Text style={[styles.statIcon, { color: theme.colors.warning }]}>★</Text>
                      <Text style={[styles.statCardValue, { color: theme.colors.text }]}>
                        {formatCount(repoInfo?.stargazersCount)}
                      </Text>
                      <Text style={[styles.statCardLabel, { color: theme.colors.textSecondary }]}>
                        Stars
                      </Text>
                    </View>
                    <View style={[styles.statCard, { backgroundColor: theme.colors.background }]}>
                      <Text style={[styles.statCardValue, { color: theme.colors.text }]}>
                        {formatCount(cityData.metadata.totalFiles)}
                      </Text>
                      <Text style={[styles.statCardLabel, { color: theme.colors.textSecondary }]}>
                        Files
                      </Text>
                    </View>
                  </View>

                  {/* Star & Track toggles (when signed in) */}
                  {isAuthenticated && (
                    <View style={styles.actionButtons}>
                      <TouchableOpacity
                        style={[
                          styles.actionButton,
                          { borderColor: theme.colors.warning },
                          isStarred && { backgroundColor: theme.colors.warning },
                        ]}
                        onPress={handleToggleStar}
                        disabled={starToggling}
                      >
                        <Text style={[
                          styles.actionButtonIcon,
                          { color: isStarred ? '#000' : theme.colors.warning },
                        ]}>
                          {isStarred ? '★' : '☆'}
                        </Text>
                        <Text style={[
                          styles.actionButtonText,
                          { color: isStarred ? '#000' : theme.colors.warning },
                        ]}>
                          {starToggling ? '...' : isStarred ? 'Starred' : 'Star'}
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[
                          styles.actionButton,
                          { borderColor: theme.colors.primary },
                          isRepoWatching && { backgroundColor: theme.colors.primary },
                        ]}
                        onPress={handleToggleRepoWatch}
                      >
                        <Text style={[
                          styles.actionButtonText,
                          { color: isRepoWatching ? '#fff' : theme.colors.primary },
                        ]}>
                          {isRepoWatching ? 'Watching' : 'Watch'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {/* Contributors Section */}
                  <View style={styles.contributorsSection}>
                    {contributorsLoading ? (
                      <LoadingSpinner size="small" color={theme.colors.primary} />
                    ) : contributors.length > 0 ? (
                      <>
                        <View style={styles.contributorsHeader}>
                          <Text style={[styles.contributorsLabel, { color: theme.colors.textSecondary }]}>
                            Contributors
                          </Text>
                          <Text style={[styles.contributorsCount, { color: theme.colors.text }]}>
                            {contributors.length}
                          </Text>
                        </View>
                        <ScrollView
                          horizontal
                          showsHorizontalScrollIndicator={false}
                          style={styles.contributorsScroll}
                          contentContainerStyle={styles.contributorsScrollContent}
                        >
                          {contributors.map((contributor) => (
                            <TouchableOpacity
                              key={contributor.login}
                              style={styles.contributorAvatar}
                              onPress={() => {
                                navigation.navigate('UserProfile', {
                                  login: contributor.login,
                                });
                              }}
                            >
                              <Image
                                source={{ uri: contributor.avatarUrl }}
                                style={styles.contributorImage}
                              />
                            </TouchableOpacity>
                          ))}
                        </ScrollView>
                      </>
                    ) : null}
                  </View>
                </ScrollView>
              )}

              {activeViz === 'stars' && (
                <ScrollView style={styles.starsContent} showsVerticalScrollIndicator={false}>
                  {stargazers.length > 0 ? (
                    <>
                      <Text style={[styles.listTitle, { color: theme.colors.text }]}>
                        Recent Stargazers
                      </Text>
                      {stargazers.map((star) => (
                        <View key={star.login} style={styles.stargazerRow}>
                          <Image
                            source={{ uri: star.avatarUrl }}
                            style={styles.stargazerAvatar}
                          />
                          <Text style={[styles.stargazerName, { color: theme.colors.text }]}>
                            {star.login}
                          </Text>
                          <Text style={[styles.stargazerTime, { color: theme.colors.textSecondary }]}>
                            {formatRelativeTime(star.starredAt)}
                          </Text>
                        </View>
                      ))}
                    </>
                  ) : !stargazersLoading ? (
                    <View style={styles.starsEmpty}>
                      <Text style={[styles.placeholderText, { color: theme.colors.textSecondary }]}>
                        No stargazers yet
                      </Text>
                    </View>
                  ) : null}
                </ScrollView>
              )}

              {activeViz === 'heatmap' && (
                <View style={styles.heatmapContent}>
                  {contributorsLoading ? (
                    <View style={styles.heatmapLoading}>
                      <LoadingSpinner size="large" color={theme.colors.primary} />
                    </View>
                  ) : (() => {
                    // Filter contributors to only show those with activity in the last week
                    const activeAuthorLogins = new Set(
                      recentCommits.map(commit => commit.authorLogin).filter(Boolean)
                    );
                    const activeContributors = contributors.filter(c =>
                      activeAuthorLogins.has(c.login)
                    );

                    return (
                    <>
                      {/* Active Contributors Row */}
                      <View style={styles.contributorsSection}>
                        <View style={styles.contributorsHeader}>
                          <Text style={[styles.contributorsLabel, { color: theme.colors.textSecondary }]}>
                            Active This Week
                          </Text>
                          <Text style={[styles.contributorsCount, { color: theme.colors.text }]}>
                            {activeContributors.length}
                          </Text>
                        </View>
                        {activeContributors.length > 0 ? (
                          <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            style={styles.contributorsScroll}
                            contentContainerStyle={styles.contributorsScrollContent}
                          >
                            {activeContributors.map((contributor) => (
                              <TouchableOpacity
                                key={contributor.login}
                                onPress={() => setSelectedContributor(
                                  selectedContributor === contributor.login ? null : contributor.login
                                )}
                                style={[
                                  styles.contributorAvatar,
                                  {
                                    borderColor: selectedContributor === contributor.login
                                      ? theme.colors.primary
                                      : 'transparent',
                                    borderWidth: 2,
                                  },
                                ]}
                              >
                                <Image
                                  source={{ uri: contributor.avatarUrl }}
                                  style={styles.contributorImage}
                                />
                              </TouchableOpacity>
                            ))}
                          </ScrollView>
                        ) : (
                          <Text style={[styles.noDataText, { color: theme.colors.textSecondary, marginTop: 8 }]}>
                            No active contributors this week
                          </Text>
                        )}
                      </View>

                      {/* Daily Activity Heatmap */}
                      <View style={styles.heatmapGrid}>
                        {!isAuthenticated ? (
                          <Text style={[styles.noDataText, { color: theme.colors.textSecondary }]}>
                            Sign in to view activity
                          </Text>
                        ) : (() => {
                          const filteredCommits = selectedContributor
                            ? recentCommits.filter(commit => commit.authorLogin === selectedContributor)
                            : recentCommits;

                          return filteredCommits.length > 0 ? (
                            <DailyActivityHeatmap commits={filteredCommits} />
                          ) : (
                            <Text style={[styles.noDataText, { color: theme.colors.textSecondary }]}>
                              {selectedContributor
                                ? `No activity from ${selectedContributor} in the last 7 days`
                                : 'No activity in the last 7 days'}
                            </Text>
                          );
                        })()}
                      </View>
                    </>
                    );
                  })()}
                </View>
              )}
            </View>
          </View>
        </>
      ) : null}
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
    paddingBottom: 8,
  },
  avatarButton: {
    padding: 4,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  avatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: 14,
    fontWeight: '600',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tourButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  tourButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  closeButton: {
    padding: 8,
    width: 40,
    alignItems: 'center',
  },
  closeIcon: {
    fontSize: 18,
    fontWeight: '400',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 15,
    textAlign: 'center',
  },
  loadingSubtext: {
    marginTop: 8,
    fontSize: 13,
    textAlign: 'center',
    opacity: 0.7,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    textAlign: 'center',
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
  canvasContainer: {
    width: CANVAS_SIZE,
    height: CANVAS_SIZE,
    alignSelf: 'center',
  },
  starChartContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 8,
  },
  chartOverlay: {
    position: 'absolute',
    bottom: 20,
    left: 20,
  },
  chartTitleLarge: {
    fontSize: 24,
    fontWeight: '700',
  },
  chartSubtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  vizPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 18,
    fontWeight: '600',
  },
  placeholderSubtext: {
    fontSize: 14,
    marginTop: 8,
    opacity: 0.7,
  },
  bottomSection: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomWidth: 2,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
  },
  tabContent: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  tabPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Heatmap tab styles
  heatmapContent: {
    flex: 1,
  },
  heatmapLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heatmapGrid: {},
  noDataText: {
    fontSize: 14,
    textAlign: 'center',
  },
  contributorsSection: {
    marginBottom: 16,
  },
  contributorsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  contributorsLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  contributorsCount: {
    fontSize: 14,
    fontWeight: '700',
  },
  contributorsScroll: {
    marginHorizontal: -16,
  },
  contributorsScrollContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  contributorAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  contributorImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 20,
    opacity: 0.9,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 24,
    borderWidth: 1.5,
    gap: 6,
  },
  actionButtonIcon: {
    fontSize: 16,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  repoTabScroll: {
    flex: 1,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  statCardValue: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 2,
  },
  statCardLabel: {
    fontSize: 11,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  // Stars tab styles
  starsContent: {
    flex: 1,
  },
  starsEmpty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  listTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  stargazerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 10,
  },
  stargazerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  stargazerName: {
    flex: 1,
    fontSize: 14,
  },
  stargazerTime: {
    fontSize: 12,
  },
});

export default RepoFileCityScreen;
