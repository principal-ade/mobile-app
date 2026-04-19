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
import { LucideIcon } from '../../components/LucideIcon';
import { GitHubRepository } from '../../types/github';
import { formatUpdateTime, formatNumber } from './utils';

export interface OrgMember {
  id: number;
  login: string;
  avatar_url: string;
}

export interface OrganizationInfo {
  login: string;
  name: string | null;
  description: string | null;
  avatar_url: string;
  html_url: string;
  blog: string | null;
  location: string | null;
  email: string | null;
  twitter_username: string | null;
  public_repos: number;
  public_gists: number;
  followers: number;
  created_at: string;
}

export interface OrganizationTabletLayoutProps {
  loading?: boolean;
  organization?: OrganizationInfo;
  repositories?: GitHubRepository[];
  pinnedRepoNames?: string[];
  members?: OrgMember[];
  onClose?: () => void;
  onRepoPress?: (owner: string, name: string, fullName: string) => void;
  onMemberPress?: (username: string) => void;
}

export const OrganizationTabletLayout: React.FC<OrganizationTabletLayoutProps> = ({
  loading = false,
  organization,
  repositories = [],
  pinnedRepoNames = [],
  members = [],
  onClose,
  onRepoPress,
  onMemberPress: _onMemberPress,
}) => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  if (loading || !organization) {
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

  const orgName = organization.name || organization.login;
  const orgLogin = organization.login;

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

      <ScrollView style={styles.scrollView}>
        {/* Profile Header */}
        <View style={[styles.profileHeader, { marginTop: insets.top + 24 }]}>
          <View style={styles.avatarAndStats}>
            {/* Avatar - rounded square for orgs */}
            <Image
              source={{ uri: organization.avatar_url }}
              style={[styles.avatar, { borderColor: theme.colors.background }]}
              resizeMode="cover"
            />

            {/* Stats Row */}
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: theme.colors.text }]}>
                  {formatNumber(organization.public_repos)}
                </Text>
                <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
                  projects
                </Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: theme.colors.text }]}>
                  {formatNumber(members.length)}
                </Text>
                <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
                  members
                </Text>
              </View>
            </View>
          </View>

          {/* Name + Username */}
          <View style={styles.nameSection}>
            <Text style={[styles.name, { color: theme.colors.text }]}>
              {orgName}
            </Text>
            <View style={styles.socialHandles}>
              <TouchableOpacity
                style={[styles.socialHandle, { backgroundColor: theme.colors.surface }]}
                onPress={() => Linking.openURL(`https://github.com/${orgLogin}`)}
                activeOpacity={0.7}
              >
                <LucideIcon name="Github" size={14} color={theme.colors.textSecondary} />
                <Text style={[styles.handleText, { color: theme.colors.textSecondary }]}>
                  {orgLogin}
                </Text>
              </TouchableOpacity>
              {organization.twitter_username && (
                <>
                  <Text style={[styles.handleSeparator, { color: theme.colors.textTertiary }]}>•</Text>
                  <TouchableOpacity
                    style={[styles.socialHandle, { backgroundColor: theme.colors.surface }]}
                    onPress={() => Linking.openURL(`https://twitter.com/${organization.twitter_username}`)}
                    activeOpacity={0.7}
                  >
                    <LucideIcon name="Twitter" size={14} color={theme.colors.textSecondary} />
                    <Text style={[styles.handleText, { color: theme.colors.textSecondary }]}>
                      {organization.twitter_username}
                    </Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>

          {/* Description */}
          {organization.description && (
            <Text style={[styles.bio, { color: theme.colors.textSecondary }]}>
              {organization.description}
            </Text>
          )}
        </View>

        {/* Repositories Section */}
        <View style={styles.repositoriesSection}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Public repositories
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
  profileHeader: {
    paddingHorizontal: 16,
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
    borderRadius: 16, // Rounded square for orgs
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
    marginBottom: 24,
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
    minHeight: 40,
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
