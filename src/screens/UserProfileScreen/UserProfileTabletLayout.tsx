import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  useWindowDimensions,
  ActivityIndicator,
} from 'react-native';
import { TabView, SceneMap, TabBar } from 'react-native-tab-view';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@principal-ade/industry-theme';
import { ContributionGrid, DailyContribution } from '../../components/ContributionGrid';
import { LucideIcon } from '../../components/LucideIcon';
import { GitHubRepository, GitHubOrganization, GitHubAccountType } from '../../types/github';
import { ContributedRepository } from '../../services/GitHubSearchService';
import { formatNumber } from './utils';
import { TabletRepoCard } from '../../components/TabletRepoCard';
import { fetchRepository } from '../../services/GithubService';
import { useAuthContext } from '../../context/AuthContext';

export interface ActivityCommit {
  sha: string;
  message: string;
  additions: number;
  deletions: number;
}

export interface HourlyActivityGroup {
  id: string;
  repo: string;
  repoOwner: string;
  repoOwnerAvatar: string;
  repoOwnerType?: GitHubAccountType;
  hour: number;
  hourBucket: string;
  hoursAgo: number;
  commits: ActivityCommit[];
  commitCount: number;
  totalAdditions: number;
  totalDeletions: number;
}

export interface UserProfileTabletLayoutProps {
  loading?: boolean;
  avatarUrl?: string;
  name?: string;
  username?: string;
  twitterHandle?: string;
  bio?: string;
  onWatchPress?: () => void;
  onClose?: () => void;
  isWatching?: boolean;
  recentActivity?: HourlyActivityGroup[];
  contributions?: DailyContribution[];
  repositories?: GitHubRepository[];
  pinnedRepoNames?: string[];
  organizations?: GitHubOrganization[];
  contributedRepos?: ContributedRepository[];
  onRepoPress?: (owner: string, name: string, fullName: string) => void;
  onOrgPress?: (orgLogin: string) => void;
  onOwnerPress?: (ownerLogin: string, ownerType?: GitHubAccountType) => void;
}

export const UserProfileTabletLayout: React.FC<UserProfileTabletLayoutProps> = ({
  loading = false,
  avatarUrl,
  name,
  username,
  twitterHandle,
  bio,
  onWatchPress,
  onClose,
  isWatching = false,
  recentActivity = [],
  contributions = [],
  repositories = [],
  pinnedRepoNames = [],
  contributedRepos = [],
  organizations = [],
  onRepoPress,
  onOrgPress,
  onOwnerPress,
}) => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const layout = useWindowDimensions();
  const { token } = useAuthContext();
  const [tabIndex, setTabIndex] = useState(0);
  const [routes] = useState([
    { key: 'activity', title: 'Activity' },
    { key: 'repos', title: 'Repos' },
    { key: 'orgs', title: 'Orgs' },
  ]);

  // State for full repository details
  const [contributedReposDetails, setContributedReposDetails] = useState<GitHubRepository[]>([]);
  const [loadingContributedRepos, setLoadingContributedRepos] = useState(false);

  // Calculate stats from contributions
  const commitsThisYear = contributions.reduce((sum, day) => sum + day.count, 0);
  const totalRepos = repositories.length;

  // Detect landscape orientation
  const isLandscape = layout.width > layout.height;

  // Fetch full repository details for contributed repos
  useEffect(() => {
    if (!token || contributedRepos.length === 0) {
      setContributedReposDetails([]);
      return;
    }

    let cancelled = false;

    const fetchFullRepoDetails = async () => {
      setLoadingContributedRepos(true);

      try {
        // Fetch full details for each contributed repo
        const detailsPromises = contributedRepos.map((repo) =>
          fetchRepository(token, repo.owner, repo.name).catch((err) => {
            console.warn(`Failed to fetch details for ${repo.nameWithOwner}:`, err);
            return null;
          })
        );

        const details = await Promise.all(detailsPromises);

        if (!cancelled) {
          // Filter out null values (failed fetches)
          setContributedReposDetails(details.filter((d): d is GitHubRepository => d !== null));
          setLoadingContributedRepos(false);
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Failed to fetch contributed repo details:', err);
          setLoadingContributedRepos(false);
        }
      }
    };

    fetchFullRepoDetails();

    return () => {
      cancelled = true;
    };
  }, [token, contributedRepos]);

  // Render skeleton loading state
  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        {onClose && (
          <TouchableOpacity
            style={[styles.closeButton, { top: insets.top + 12 }]}
            onPress={onClose}
          >
            <View style={[styles.closeButtonCircle, { backgroundColor: theme.colors.surface }]}>
              <Text style={[styles.closeButtonText, { color: theme.colors.text }]}>×</Text>
            </View>
          </TouchableOpacity>
        )}
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
            Loading...
          </Text>
        </View>
      </View>
    );
  }

  const userAvatarUrl = avatarUrl!;
  const userName = name!;
  const userUsername = username!;

  // Activity Tab Content
  const ActivityRoute = () => (
    <ScrollView style={{ backgroundColor: theme.colors.background }}>
      <View style={styles.tabContent}>
        {/* Recent Commits Section */}
        {recentActivity.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              Recent Commits
            </Text>
            <Text style={[styles.sectionSubtitle, { color: theme.colors.textSecondary }]}>
              Last 24 hours
            </Text>
            <View style={styles.activityList}>
              {recentActivity.map((group) => {
                const repoName = group.repo.includes('/') ? group.repo.split('/')[1] : group.repo;
                return (
                  <TouchableOpacity
                    key={group.id}
                    style={[styles.activityCard, { backgroundColor: theme.colors.surface }]}
                    onPress={() => {
                      if (onRepoPress) {
                        onRepoPress(group.repoOwner, repoName, group.repo);
                      }
                    }}
                    activeOpacity={0.7}
                  >
                    <TouchableOpacity
                      onPress={() => {
                        if (onOwnerPress) {
                          onOwnerPress(group.repoOwner, group.repoOwnerType);
                        }
                      }}
                      activeOpacity={0.7}
                    >
                      <Image
                        source={{ uri: group.repoOwnerAvatar }}
                        style={styles.activityAvatar}
                        resizeMode="cover"
                      />
                    </TouchableOpacity>
                    <View style={styles.activityInfo}>
                      <Text style={[styles.activityRepoName, { color: theme.colors.text }]} numberOfLines={1}>
                        {repoName}
                      </Text>
                      <Text style={[styles.activityOwner, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                        {group.repoOwner}
                      </Text>
                    </View>
                    <View style={styles.activityStats}>
                      <Text style={[styles.activityTime, { color: theme.colors.textSecondary }]}>
                        {group.hoursAgo === 0 ? 'Just now' : group.hoursAgo === 1 ? '1h ago' : `${group.hoursAgo}h ago`}
                      </Text>
                      <Text style={[styles.activityCommits, { color: theme.colors.textSecondary }]}>
                        {group.commitCount} {group.commitCount === 1 ? 'commit' : 'commits'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* Contributed Repositories Section */}
        {contributedRepos.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              Contributed Repositories
            </Text>
            <Text style={[styles.sectionSubtitle, { color: theme.colors.textSecondary }]}>
              Past 5 months
            </Text>
            {loadingContributedRepos ? (
              <View style={styles.loadingReposContainer}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
                <Text style={[styles.loadingReposText, { color: theme.colors.textSecondary }]}>
                  Loading repository details...
                </Text>
              </View>
            ) : (
              <View style={[styles.contributedReposList, isLandscape && styles.repositoriesListLandscape]}>
                {contributedReposDetails.map((repo) => {
                  const [owner, name] = repo.full_name.split('/');
                  return (
                    <View key={repo.id} style={isLandscape ? styles.repoCardContainer : undefined}>
                      <TabletRepoCard
                        owner={owner}
                        name={name}
                        fullName={repo.full_name}
                        description={repo.description}
                        language={repo.language}
                        stars={repo.stargazers_count}
                        updatedAt={repo.updated_at}
                        onPress={() => {
                          if (onRepoPress) {
                            onRepoPress(owner, name, repo.full_name);
                          }
                        }}
                      />
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        )}

        {/* Empty state */}
        {recentActivity.length === 0 && contributedRepos.length === 0 && (
          <View style={styles.emptyStateContainer}>
            <Text style={[styles.emptyStateText, { color: theme.colors.textTertiary }]}>
              No recent activity
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );

  // Repos Tab Content
  const ReposRoute = () => (
    <ScrollView style={{ backgroundColor: theme.colors.background }}>
      <View style={styles.tabContent}>
        {repositories.length > 0 ? (
          <View style={[styles.repositoriesList, isLandscape && styles.repositoriesListLandscape]}>
            {repositories.slice(0, 9).map((item) => {
              const [owner, name] = item.full_name.split('/');
              return (
                <View key={item.id} style={isLandscape ? styles.repoCardContainer : undefined}>
                  <TabletRepoCard
                    owner={owner}
                    name={name}
                    fullName={item.full_name}
                    description={item.description}
                    language={item.language}
                    stars={item.stargazers_count}
                    updatedAt={item.updated_at}
                    isPinned={pinnedRepoNames.includes(item.full_name)}
                    onPress={() => {
                      if (onRepoPress) {
                        onRepoPress(owner, name, item.full_name);
                      }
                    }}
                  />
                </View>
              );
            })}
          </View>
        ) : (
          <View style={styles.emptyStateContainer}>
            <Text style={[styles.emptyStateText, { color: theme.colors.textTertiary }]}>
              No repositories found
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );

  // Orgs Tab Content
  const OrgsRoute = () => (
    <ScrollView style={{ backgroundColor: theme.colors.background }}>
      <View style={styles.tabContent}>
        {organizations.length > 0 ? (
          <View style={styles.orgsList}>
            {organizations.map((org) => (
              <TouchableOpacity
                key={org.id}
                style={[styles.orgCard, { backgroundColor: theme.colors.surface }]}
                onPress={() => {
                  if (onOrgPress) {
                    onOrgPress(org.login);
                  }
                }}
                activeOpacity={0.7}
              >
                <Image
                  source={{ uri: org.avatar_url }}
                  style={styles.orgAvatar}
                  resizeMode="cover"
                />
                <View style={styles.orgInfo}>
                  <Text style={[styles.orgName, { color: theme.colors.text }]} numberOfLines={1}>
                    {org.login}
                  </Text>
                  {org.description && (
                    <Text style={[styles.orgDescription, { color: theme.colors.textSecondary }]} numberOfLines={2}>
                      {org.description}
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View style={styles.emptyStateContainer}>
            <Text style={[styles.emptyStateText, { color: theme.colors.textTertiary }]}>
              No organizations
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );

  const renderScene = SceneMap({
    activity: ActivityRoute,
    repos: ReposRoute,
    orgs: OrgsRoute,
  });

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Close button */}
      {onClose && (
        <TouchableOpacity
          style={[styles.closeButton, { top: insets.top + 12 }]}
          onPress={onClose}
        >
          <View style={[styles.closeButtonCircle, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.closeButtonText, { color: theme.colors.text }]}>×</Text>
          </View>
        </TouchableOpacity>
      )}

      {/* Activity Heatmap Banner */}
      <View style={[styles.heatmapBanner, { marginTop: insets.top }]}>
        <ContributionGrid
          contributions={contributions}
          layout="weeks"
          months={12}
          loading={contributions.length === 0}
          scrollToEnd={true}
        />
      </View>

      {/* Profile Header with overlapping avatar */}
      <View style={styles.profileHeader}>
        <View style={styles.avatarAndStats}>
          {/* Avatar - overlaps banner */}
          <Image
            source={{ uri: userAvatarUrl }}
            style={[styles.avatar, { borderColor: theme.colors.background }]}
            resizeMode="cover"
          />

          {/* Stats Row */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: theme.colors.text }]}>
                {formatNumber(commitsThisYear)}
              </Text>
              <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
                commits this year
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: theme.colors.text }]}>
                {formatNumber(totalRepos)}
              </Text>
              <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
                projects
              </Text>
            </View>
          </View>

          {/* Action Button - right aligned */}
          <TouchableOpacity
            style={[
              styles.watchButton,
              {
                backgroundColor: isWatching
                  ? theme.colors.surface
                  : theme.colors.primary,
                borderColor: theme.colors.primary,
              },
            ]}
            onPress={onWatchPress}
          >
            <Text
              style={[
                styles.watchButtonText,
                {
                  color: isWatching ? theme.colors.primary : theme.colors.text,
                },
              ]}
            >
              {isWatching ? 'Watching' : 'Watch'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Name + Username */}
        <View style={styles.nameSection}>
          <Text style={[styles.name, { color: theme.colors.text }]}>
            {userName}
          </Text>
          <View style={styles.socialHandles}>
            <TouchableOpacity
              style={[styles.socialHandle, { backgroundColor: theme.colors.surface }]}
              onPress={() => Linking.openURL(`https://github.com/${userUsername}`)}
              activeOpacity={0.7}
            >
              <LucideIcon name="Github" size={14} color={theme.colors.textSecondary} />
              <Text style={[styles.handleText, { color: theme.colors.textSecondary }]}>
                {userUsername}
              </Text>
            </TouchableOpacity>
            {twitterHandle && (
              <>
                <Text style={[styles.handleSeparator, { color: theme.colors.textTertiary }]}>•</Text>
                <TouchableOpacity
                  style={[styles.socialHandle, { backgroundColor: theme.colors.surface }]}
                  onPress={() => Linking.openURL(`https://twitter.com/${twitterHandle}`)}
                  activeOpacity={0.7}
                >
                  <LucideIcon name="Twitter" size={14} color={theme.colors.textSecondary} />
                  <Text style={[styles.handleText, { color: theme.colors.textSecondary }]}>
                    {twitterHandle}
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>

        {/* Bio */}
        {bio && (
          <Text style={[styles.bio, { color: theme.colors.textSecondary }]}>
            {bio}
          </Text>
        )}
      </View>

      {/* Tab View */}
      <TabView
        navigationState={{ index: tabIndex, routes }}
        renderScene={renderScene}
        renderTabBar={(props) => (
          <TabBar
            {...props}
            indicatorStyle={{ backgroundColor: theme.colors.primary }}
            style={{ backgroundColor: theme.colors.background }}
            activeColor={theme.colors.text}
            inactiveColor={theme.colors.textSecondary}
          />
        )}
        onIndexChange={setTabIndex}
        initialLayout={{ width: layout.width }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
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
    textAlign: 'center',
  },
  heatmapBanner: {
    height: 170,
  },
  profileHeader: {
    paddingHorizontal: 16,
    marginTop: -60, // Overlap the banner
  },
  avatarAndStats: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 16,
    marginBottom: 16,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
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
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    textAlign: 'center',
  },
  nameSection: {
    marginBottom: 12,
  },
  name: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  socialHandles: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  socialHandle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 14,
  },
  handleText: {
    fontSize: 14,
    fontWeight: '500',
  },
  handleSeparator: {
    fontSize: 14,
    marginHorizontal: 2,
  },
  bio: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 16,
  },
  watchButton: {
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  watchButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  tabContent: {
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    marginBottom: 16,
  },
  activityList: {
    gap: 12,
  },
  activityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  activityAvatar: {
    width: 48,
    height: 48,
    borderRadius: 8,
  },
  activityInfo: {
    flex: 1,
  },
  activityRepoName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  activityOwner: {
    fontSize: 14,
  },
  activityStats: {
    alignItems: 'flex-end',
  },
  activityTime: {
    fontSize: 12,
    marginBottom: 4,
  },
  activityCommits: {
    fontSize: 13,
  },
  contributedReposList: {
    // Container for TabletRepoCard components
  },
  loadingReposContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  loadingReposText: {
    fontSize: 14,
  },
  repositoriesList: {
    // Container for the list of TabletRepoCard components
  },
  repositoriesListLandscape: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -8, // Negative margin to offset container padding
  },
  repoCardContainer: {
    width: '50%',
    paddingHorizontal: 8,
  },
  orgsList: {
    gap: 12,
  },
  orgCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  orgAvatar: {
    width: 64,
    height: 64,
    borderRadius: 12,
  },
  orgInfo: {
    flex: 1,
  },
  orgName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  orgDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  emptyStateContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateText: {
    fontSize: 16,
  },
});
