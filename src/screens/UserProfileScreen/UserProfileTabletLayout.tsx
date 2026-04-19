import React from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  FlatList,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@principal-ade/industry-theme';
import { ContributionGrid, DailyContribution } from '../../components/ContributionGrid';
import { LucideIcon } from '../../components/LucideIcon';
import { GitHubRepository, GitHubOrganization, GitHubAccountType } from '../../types/github';
import { ContributedRepository } from '../../services/GitHubSearchService';
import { formatUpdateTime, formatNumber } from './utils';

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
  contributions = [],
  repositories = [],
  pinnedRepoNames = [],
  onRepoPress,
}) => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  // Calculate stats from contributions
  const commitsThisYear = contributions.reduce((sum, day) => sum + day.count, 0);
  const totalRepos = repositories.length;

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

      <ScrollView style={styles.scrollView}>
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

        {/* Repositories Section */}
        <View style={styles.repositoriesSection}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Popular repositories
          </Text>

          {repositories.length > 0 ? (
            <FlatList
              data={repositories}
              scrollEnabled={false}
              numColumns={2}
              columnWrapperStyle={styles.repositoryRow}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => {
                const [owner, name] = item.full_name.split('/');
                return (
                  <TouchableOpacity
                    style={[styles.repoCard, { backgroundColor: theme.colors.surface }]}
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
                        <LucideIcon name="Pin" size={14} color={theme.colors.accent} />
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
                        <LucideIcon name="Star" size={12} color={theme.colors.textTertiary} />
                        <Text style={[styles.repoStatText, { color: theme.colors.textTertiary }]}>
                          {formatNumber(item.stargazers_count)}
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
                    </View>

                    <Text style={[styles.repoUpdated, { color: theme.colors.textTertiary }]}>
                      {formatUpdateTime(item.updated_at)}
                    </Text>
                  </TouchableOpacity>
                );
              }}
            />
          ) : (
            <View style={[styles.emptyState, { backgroundColor: theme.colors.surface }]}>
              <Text style={[styles.emptyStateText, { color: theme.colors.textTertiary }]}>
                No repositories found
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
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
  repositoriesSection: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
  },
  repositoryRow: {
    gap: 16,
    marginBottom: 16,
  },
  repoCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
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
  repoDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
    minHeight: 40, // Keep cards aligned
  },
  repoStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
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
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  repoUpdated: {
    fontSize: 12,
  },
  emptyState: {
    padding: 40,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateText: {
    fontSize: 14,
  },
});
