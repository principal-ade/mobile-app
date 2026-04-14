import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Linking,
  FlatList,
} from 'react-native';
import { TabView, SceneMap, TabBar } from 'react-native-tab-view';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@principal-ade/industry-theme';
import { ContributionGrid, DailyContribution } from '../components/ContributionGrid';
import { Logo } from '../components/Logo';
import { LucideIcon } from '../components/LucideIcon';
import { GitHubRepository, GitHubOrganization } from '../types/github';
import { ContributedRepository } from '../services/GitHubSearchService';

export interface ActivityCommit {
  sha: string;
  message: string;
  additions: number;
  deletions: number;
}

export interface HourlyActivityGroup {
  id: string; // "YYYY-MM-DD:HH:repo"
  repo: string;
  repoOwner: string;
  repoOwnerAvatar: string;
  repoOwnerType?: 'User' | 'Organization';
  hour: number; // 0-23
  hourBucket: string; // ISO timestamp
  hoursAgo: number;
  commits: ActivityCommit[];
  commitCount: number;
  totalAdditions: number;
  totalDeletions: number;
}

export interface UserProfileScreenProps {
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
  onOwnerPress?: (ownerLogin: string, ownerType?: 'User' | 'Organization') => void;
}

export const UserProfileScreen: React.FC<UserProfileScreenProps> = ({
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
  organizations = [],
  contributedRepos = [],
  onRepoPress,
  onOrgPress,
  onOwnerPress,
}) => {
  const { theme } = useTheme();
  const { width } = Dimensions.get('window');
  const insets = useSafeAreaInsets();
  const [tabIndex, setTabIndex] = useState(0);
  const [routes] = useState([
    { key: 'activity', title: 'Activity' },
    { key: 'repos', title: 'Repos' },
    { key: 'orgs', title: 'Orgs' },
  ]);

  const formatUpdateTime = (isoString: string) => {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / 86400000);
    const diffMonths = Math.floor(diffDays / 30);
    const diffYears = Math.floor(diffDays / 365);

    if (diffDays === 0) {
      return 'Updated today';
    } else if (diffDays === 1) {
      return 'Updated yesterday';
    } else if (diffDays < 30) {
      return `Updated ${diffDays}d ago`;
    } else if (diffMonths < 12) {
      return `Updated ${diffMonths}mo ago`;
    } else {
      return `Updated ${diffYears}y ago`;
    }
  };

  // Activity Tab Content
  const ActivityRoute = () => (
    <ScrollView style={{ backgroundColor: theme.colors.background }}>
      <View style={styles.tabContent}>
        {/* Recent Activity Section */}
        {recentActivity.length > 0 && (
          <View style={styles.recentActivitySection}>
            <Text style={[styles.sectionHeader, { color: theme.colors.text }]}>
              Recent Commits
            </Text>
            <Text style={[styles.sectionSubheader, { color: theme.colors.textSecondary }]}>
              Last 24 hours
            </Text>
            {recentActivity.map((group) => {
              const repoName = group.repo.includes('/') ? group.repo.split('/')[1] : group.repo;
              return (
                <TouchableOpacity
                  key={group.id}
                  style={[
                    styles.activityItem,
                    { backgroundColor: theme.colors.surface },
                  ]}
                  onPress={() => {
                    if (onRepoPress) {
                      onRepoPress(group.repoOwner, repoName, group.repo);
                    }
                  }}
                  activeOpacity={0.7}
                >
                  <View style={styles.activityHeader}>
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
                    <View style={styles.activityContent}>
                      <Text
                        style={[styles.activityRepo, { color: theme.colors.text }]}
                        numberOfLines={1}
                      >
                        {repoName}
                      </Text>
                      <Text
                        style={[styles.activityOwner, { color: theme.colors.textSecondary }]}
                        numberOfLines={1}
                      >
                        {group.repoOwner}
                      </Text>
                    </View>
                    <View style={styles.activityStatsContainer}>
                      <Text
                        style={[styles.activityTimestamp, { color: theme.colors.textSecondary }]}
                      >
                        {group.hoursAgo === 0
                          ? 'Just now'
                          : group.hoursAgo === 1
                          ? '1h ago'
                          : `${group.hoursAgo}h ago`}
                      </Text>
                      <Text
                        style={[styles.activityCommitCount, { color: theme.colors.textSecondary }]}
                      >
                        {group.commitCount} {group.commitCount === 1 ? 'commit' : 'commits'}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Contributed Repositories Section */}
        {contributedRepos && contributedRepos.length > 0 && (
          <View style={styles.contributedReposSection}>
            <Text style={[styles.sectionHeader, { color: theme.colors.text }]}>
              Contributed Repositories
            </Text>
            <Text style={[styles.sectionSubheader, { color: theme.colors.textSecondary }]}>
              Past 5 months
            </Text>
            {contributedRepos.map((repo) => (
              <TouchableOpacity
                key={repo.nameWithOwner}
                style={[
                  styles.contributedRepoCard,
                  { backgroundColor: theme.colors.surface },
                ]}
                onPress={() => {
                  if (onRepoPress) {
                    onRepoPress(repo.owner, repo.name, repo.nameWithOwner);
                  }
                }}
                activeOpacity={0.7}
              >
                <View style={styles.contributedRepoHeader}>
                  <TouchableOpacity
                    onPress={() => {
                      if (onOwnerPress) {
                        onOwnerPress(repo.owner, repo.ownerType);
                      }
                    }}
                    activeOpacity={0.7}
                  >
                    <Image
                      source={{ uri: `https://github.com/${repo.owner}.png` }}
                      style={styles.contributedRepoAvatar}
                      resizeMode="cover"
                    />
                  </TouchableOpacity>
                  <View style={styles.contributedRepoContent}>
                    <Text
                      style={[styles.contributedRepoName, { color: theme.colors.text }]}
                      numberOfLines={1}
                    >
                      {repo.name}
                    </Text>
                    <Text
                      style={[styles.contributedRepoOwner, { color: theme.colors.textSecondary }]}
                      numberOfLines={1}
                    >
                      {repo.owner}
                    </Text>
                  </View>
                  <View style={styles.contributedRepoStats}>
                    <Text
                      style={[styles.contributedRepoCommits, { color: theme.colors.textSecondary }]}
                    >
                      {repo.commitCount} {repo.commitCount === 1 ? 'commit' : 'commits'}
                    </Text>
                    <Text
                      style={[styles.contributedRepoTime, { color: theme.colors.textTertiary }]}
                    >
                      {formatUpdateTime(repo.lastContributedAt)}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Empty State - only show if no contributed repos AND no recent activity */}
        {(!contributedRepos || contributedRepos.length === 0) && recentActivity.length === 0 && (
          <View
            style={[
              styles.activityPlaceholder,
              { backgroundColor: theme.colors.surface },
            ]}
          >
            <Text style={[styles.placeholderText, { color: theme.colors.textTertiary }]}>
              No activity in the last 24 hours
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );

  // Repositories Tab Content
  const ReposRoute = () => (
    <FlatList
      data={repositories}
      style={{ backgroundColor: theme.colors.background }}
      contentContainerStyle={styles.tabContent}
      keyExtractor={(item) => item.id.toString()}
      renderItem={({ item }) => {
        const [owner, name] = item.full_name.split('/');
        return (
          <TouchableOpacity
            style={[styles.repoItem, { backgroundColor: theme.colors.surface }]}
            onPress={() => {
              if (onRepoPress) {
                onRepoPress(owner, name, item.full_name);
              }
            }}
            activeOpacity={0.7}
          >
            <View style={styles.repoHeader}>
              <LucideIcon name="GitBranch" size={16} color={theme.colors.accent} />
              <Text style={[styles.repoName, { color: theme.colors.text }]} numberOfLines={1}>
                {item.name}
              </Text>
              {pinnedRepoNames.includes(item.full_name) && (
                <View style={styles.pinIndicator}>
                  <LucideIcon name="Pin" size={14} color={theme.colors.accent} />
                </View>
              )}
              {item.fork && item.parent && (
                <TouchableOpacity
                  style={styles.forkIndicator}
                  onPress={() => {
                    if (onRepoPress && item.parent) {
                      onRepoPress(item.parent.owner.login, item.parent.name, item.parent.full_name);
                    }
                  }}
                  activeOpacity={0.7}
                >
                  <LucideIcon name="GitFork" size={14} color={theme.colors.textTertiary} />
                </TouchableOpacity>
              )}
            </View>
            {item.description && (
              <Text
                style={[styles.repoDescription, { color: theme.colors.textSecondary }]}
                numberOfLines={2}
              >
                {item.description}
              </Text>
            )}
            <View style={styles.repoStats}>
              <View style={styles.repoStat}>
                <LucideIcon name="Star" size={14} color={theme.colors.textTertiary} />
                <Text style={[styles.repoStatText, { color: theme.colors.textTertiary }]}>
                  {item.stargazers_count}
                </Text>
              </View>
              {item.language && (
                <View style={styles.repoStat}>
                  <View style={[styles.languageDot, { backgroundColor: theme.colors.accent }]} />
                  <Text style={[styles.repoStatText, { color: theme.colors.textTertiary }]}>
                    {item.language}
                  </Text>
                </View>
              )}
              <View style={styles.repoStat}>
                <Text style={[styles.repoStatText, { color: theme.colors.textTertiary }]}>
                  {formatUpdateTime(item.updated_at)}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        );
      }}
      ListEmptyComponent={
        <View
          style={[
            styles.activityPlaceholder,
            { backgroundColor: theme.colors.surface },
          ]}
        >
          <Text style={[styles.placeholderText, { color: theme.colors.textTertiary }]}>
            No repositories found
          </Text>
        </View>
      }
    />
  );

  // Organizations Tab Content
  const OrgsRoute = () => (
    <FlatList
      data={organizations}
      style={{ backgroundColor: theme.colors.background }}
      contentContainerStyle={styles.tabContent}
      keyExtractor={(item) => item.id.toString()}
      renderItem={({ item }) => (
        <TouchableOpacity
          style={[styles.orgItem, { backgroundColor: theme.colors.surface }]}
          onPress={() => {
            if (onOrgPress) {
              onOrgPress(item.login);
            } else {
              Linking.openURL(`https://github.com/${item.login}`);
            }
          }}
          activeOpacity={0.7}
        >
          <Image
            source={{ uri: item.avatar_url }}
            style={styles.orgAvatar}
            resizeMode="cover"
          />
          <View style={styles.orgContent}>
            <Text style={[styles.orgName, { color: theme.colors.text }]} numberOfLines={1}>
              {item.login}
            </Text>
            {item.description && (
              <Text
                style={[styles.orgDescription, { color: theme.colors.textSecondary }]}
                numberOfLines={2}
              >
                {item.description}
              </Text>
            )}
          </View>
        </TouchableOpacity>
      )}
      ListEmptyComponent={
        <View
          style={[
            styles.activityPlaceholder,
            { backgroundColor: theme.colors.surface },
          ]}
        >
          <Text style={[styles.placeholderText, { color: theme.colors.textTertiary }]}>
            No organizations found
          </Text>
        </View>
      }
    />
  );

  const renderScene = SceneMap({
    activity: ActivityRoute,
    repos: ReposRoute,
    orgs: OrgsRoute,
  });

  // Render skeleton loading state
  if (loading) {
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

        {/* Header area - match exact layout of loaded state */}
        <View style={[styles.header, styles.skeletonHeaderHeight]}>
          <View style={[styles.avatarSection, { marginTop: 32 + insets.top }]}>
            {/* Logo as avatar - match exact size and position */}
            <View style={styles.avatarContainer}>
              <View style={styles.skeletonAvatarCircle}>
                <Logo width={152} height={152} animated={true} />
              </View>
            </View>
          </View>

          {/* Name placeholder */}
          <View style={styles.nameContainer}>
            <View style={[styles.skeletonBar, styles.skeletonName, { backgroundColor: theme.colors.surface }]} />
            <View style={[styles.skeletonBar, styles.skeletonUsername, { backgroundColor: theme.colors.surface, marginTop: 4 }]} />
          </View>

          {/* Action button placeholder */}
          <View style={styles.actionButtons}>
            <View style={[styles.skeletonButton, { backgroundColor: theme.colors.surface }]} />
          </View>
        </View>
      </View>
    );
  }

  // After loading, these should always be defined
  const userAvatarUrl = avatarUrl!;
  const userName = name!;
  const userUsername = username!;

  return (
    <View style={styles.container}>
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

      <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
        {/* Header Section */}
        <View style={styles.header}>
          {/* Avatar with contribution calendar background */}
          <View style={[styles.avatarSection, { marginTop: insets.top }]}>
            {/* Heatmap background behind avatar */}
            <View style={styles.contributionBackground}>
              <View style={styles.calendarWrapper}>
                <ContributionGrid
                  contributions={contributions}
                  layout="weeks"
                  months={5}
                  loading={contributions.length === 0}
                />
              </View>
            </View>

            {/* Avatar on top */}
            <View style={styles.avatarContainer}>
              <Image
                source={{ uri: userAvatarUrl }}
                style={styles.avatar}
                resizeMode="cover"
              />
            </View>
          </View>

          <View style={styles.nameContainer}>
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

          {/* Bio Section */}
          {bio && (
            <View style={styles.bioSection}>
              <Text style={[styles.bio, { color: theme.colors.textSecondary }]}>
                {bio}
              </Text>
            </View>
          )}

          {/* Action Button */}
          <View style={styles.actionButtons}>
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
        </View>

        {/* Tabs */}
        <TabView
          navigationState={{ index: tabIndex, routes }}
          renderScene={renderScene}
          onIndexChange={setTabIndex}
          initialLayout={{ width }}
          renderTabBar={(props) => (
            <TabBar
              {...props}
              indicatorStyle={{ backgroundColor: theme.colors.primary }}
              style={{ backgroundColor: theme.colors.background }}
              activeColor={theme.colors.text}
              inactiveColor={theme.colors.textTertiary}
            />
          )}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    // paddingBottom is applied dynamically with safe area insets
  },
  header: {
    alignItems: 'center',
    paddingHorizontal: 16,
    position: 'relative',
  },
  avatarSection: {
    alignItems: 'center',
    position: 'relative',
    marginBottom: 0,
    width: '100%',
  },
  contributionBackground: {
    position: 'absolute',
    top: 0, // Anchor to top (needed when avatarSection is centered)
    left: -16, // Extend beyond header's paddingHorizontal
    right: -16, // Extend beyond header's paddingHorizontal
    height: 160,
    opacity: 0.3,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 0,
  },
  calendarWrapper: {
    width: '100%',
    height: 160,
  },
  avatarContainer: {
    zIndex: 1,
    paddingTop: 16,
  },
  avatar: {
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 4,
    borderColor: '#ff6b35',
  },
  nameContainer: {
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 0,
    paddingBottom: 12,
    zIndex: 1,
  },
  name: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
  },
  socialHandles: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
    justifyContent: 'center',
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
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    width: '100%',
    paddingHorizontal: 8,
    zIndex: 1,
  },
  watchButton: {
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  watchButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  bioSection: {
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  bio: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
  },
  tabContent: {
    padding: 16,
  },
  activityPlaceholder: {
    padding: 40,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    fontSize: 14,
  },
  activityItem: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  activityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  activityAvatar: {
    width: 48,
    height: 48,
    borderRadius: 8,
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityRepo: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  activityOwner: {
    fontSize: 13,
  },
  activityStatsContainer: {
    alignItems: 'flex-end',
    marginLeft: 12,
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  activityDetails: {
    fontSize: 12,
  },
  activityTimestamp: {
    fontSize: 12,
    marginBottom: 6,
  },
  activityCommitCount: {
    fontSize: 13,
  },
  // Repo item styles
  repoItem: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  repoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  repoName: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  pinIndicator: {
    marginLeft: 4,
  },
  forkIndicator: {
    padding: 4,
    marginLeft: 4,
  },
  repoDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  repoStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  repoStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  repoStatText: {
    fontSize: 12,
  },
  languageDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  // Org item styles
  orgItem: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  orgAvatar: {
    width: 48,
    height: 48,
    borderRadius: 10,
    marginRight: 12,
  },
  orgContent: {
    flex: 1,
    justifyContent: 'center',
  },
  orgName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  orgDescription: {
    fontSize: 14,
    lineHeight: 20,
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
    marginTop: 0,
    textAlign: 'center',
  },
  // Skeleton styles
  skeletonHeaderHeight: {
    height: 300, // Fixed height to prevent layout shift
  },
  skeletonAvatarCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 4,
    borderColor: '#ff6b35',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  skeletonBar: {
    borderRadius: 10,
  },
  skeletonName: {
    width: 180,
    height: 28,
  },
  skeletonUsername: {
    width: 200,
    height: 18,
  },
  skeletonButton: {
    width: 140,
    height: 48,
    borderRadius: 12,
  },
  // Contributed repos section styles
  contributedReposSection: {
    marginBottom: 24,
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  sectionSubheader: {
    fontSize: 12,
    marginBottom: 12,
  },
  contributedRepoCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  contributedRepoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  contributedRepoAvatar: {
    width: 48,
    height: 48,
    borderRadius: 8,
    marginRight: 12,
  },
  contributedRepoContent: {
    flex: 1,
  },
  contributedRepoName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  contributedRepoOwner: {
    fontSize: 13,
  },
  contributedRepoStats: {
    alignItems: 'flex-end',
    marginLeft: 12,
  },
  contributedRepoCommits: {
    fontSize: 13,
    marginBottom: 4,
  },
  contributedRepoTime: {
    fontSize: 11,
  },
  recentActivitySection: {
    // No additional styles needed - uses existing styles
  },
});
