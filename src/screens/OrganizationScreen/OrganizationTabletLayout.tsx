import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  useWindowDimensions,
} from 'react-native';
import { TabView, SceneMap, TabBar } from 'react-native-tab-view';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@principal-ade/industry-theme';
import { LucideIcon } from '../../components/LucideIcon';
import { GitHubRepository } from '../../types/github';
import { formatNumber } from './utils';
import { TabletRepoCard } from '../../components/TabletRepoCard';

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
  onMemberPress,
}) => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const layout = useWindowDimensions();
  const [tabIndex, setTabIndex] = useState(0);
  const [routes] = useState([
    { key: 'repos', title: 'Repos' },
    { key: 'members', title: 'Members' },
  ]);

  // Detect landscape orientation
  const isLandscape = layout.width > layout.height;

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

  // Members Tab Content
  const MembersRoute = () => (
    <ScrollView style={{ backgroundColor: theme.colors.background }}>
      <View style={styles.tabContent}>
        {members.length > 0 ? (
          <View style={[styles.membersList, isLandscape && styles.membersListLandscape]}>
            {members.map((member) => (
              <View key={member.id} style={isLandscape ? styles.memberCardContainer : undefined}>
                <TouchableOpacity
                  style={[styles.memberCard, { backgroundColor: theme.colors.surface }]}
                  onPress={() => {
                    if (onMemberPress) {
                      onMemberPress(member.login);
                    }
                  }}
                  activeOpacity={0.7}
                >
                  <Image
                    source={{ uri: member.avatar_url }}
                    style={styles.memberAvatar}
                    resizeMode="cover"
                  />
                  <Text style={[styles.memberName, { color: theme.colors.text }]} numberOfLines={1}>
                    {member.login}
                  </Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.emptyStateContainer}>
            <Text style={[styles.emptyStateText, { color: theme.colors.textTertiary }]}>
              No members found
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );

  const renderScene = SceneMap({
    repos: ReposRoute,
    members: MembersRoute,
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
    marginBottom: 16,
  },
  tabContent: {
    padding: 16,
  },
  repositoriesList: {
    // Container for TabletRepoCard components
  },
  repositoriesListLandscape: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -8,
  },
  repoCardContainer: {
    width: '50%',
    paddingHorizontal: 8,
  },
  membersList: {
    gap: 12,
  },
  membersListLandscape: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -8,
  },
  memberCardContainer: {
    width: '50%',
    paddingHorizontal: 8,
    marginBottom: 12,
  },
  memberCard: {
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
  memberAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
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
