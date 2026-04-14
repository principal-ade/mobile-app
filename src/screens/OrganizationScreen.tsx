import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Linking,
  FlatList,
} from 'react-native';
import { TabView, TabBar, SceneMap } from 'react-native-tab-view';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@principal-ade/industry-theme';
import { LucideIcon } from '../components/LucideIcon';
import { GitHubRepository } from '../types/github';

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

export interface OrganizationScreenProps {
  loading?: boolean;
  organization?: OrganizationInfo;
  repositories?: GitHubRepository[];
  pinnedRepoNames?: string[];
  members?: OrgMember[];
  onClose?: () => void;
  onRepoPress?: (owner: string, name: string, fullName: string) => void;
  onMemberPress?: (username: string) => void;
}

export const OrganizationScreen: React.FC<OrganizationScreenProps> = ({
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
  const { width } = Dimensions.get('window');
  const insets = useSafeAreaInsets();
  const [tabIndex, setTabIndex] = useState(0);
  const [routes] = useState([
    { key: 'repos', title: 'Projects' },
    { key: 'members', title: 'Members' },
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
            styles.emptyPlaceholder,
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

  // Members Tab Content
  const MembersRoute = () => (
    <FlatList
      data={members}
      style={{ backgroundColor: theme.colors.background }}
      contentContainerStyle={styles.tabContent}
      keyExtractor={(item) => item.id.toString()}
      numColumns={3}
      renderItem={({ item }) => (
        <TouchableOpacity
          style={styles.memberItem}
          onPress={() => {
            if (onMemberPress) {
              onMemberPress(item.login);
            }
          }}
          activeOpacity={0.7}
        >
          <Image
            source={{ uri: item.avatar_url }}
            style={styles.memberAvatar}
            resizeMode="cover"
          />
          <Text style={[styles.memberName, { color: theme.colors.text }]} numberOfLines={1}>
            {item.login}
          </Text>
        </TouchableOpacity>
      )}
      ListEmptyComponent={
        <View
          style={[
            styles.emptyPlaceholder,
            { backgroundColor: theme.colors.surface },
          ]}
        >
          <Text style={[styles.placeholderText, { color: theme.colors.textTertiary }]}>
            No members found
          </Text>
        </View>
      }
    />
  );

  const renderScene = SceneMap({
    repos: ReposRoute,
    members: MembersRoute,
  });

  // Render skeleton loading state
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

        <View style={[styles.header, styles.skeletonHeaderHeight]}>
          <View style={[styles.avatarSection, { marginTop: 32 + insets.top }]}>
            <View style={styles.skeletonAvatar} />
          </View>

          <View style={styles.nameContainer}>
            <View style={[styles.skeletonBar, styles.skeletonName, { backgroundColor: theme.colors.surface }]} />
            <View style={[styles.skeletonBar, styles.skeletonUsername, { backgroundColor: theme.colors.surface, marginTop: 4 }]} />
          </View>
        </View>
      </View>
    );
  }

  const orgName = organization.name || organization.login;
  const orgLogin = organization.login;

  return (
    <View style={styles.container}>
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
        <View>
          <View style={[styles.header, { marginTop: insets.top }]}>

            <View style={styles.avatarSection}>
              <Image
                source={{ uri: organization.avatar_url }}
                style={styles.avatar}
                resizeMode="cover"
              />
            </View>

            <View style={styles.nameContainer}>
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

            {organization.description && (
              <View style={styles.bioSection}>
                <Text style={[styles.bio, { color: theme.colors.textSecondary }]}>
                  {organization.description}
                </Text>
              </View>
            )}
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
  header: {
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 10,
    marginTop: 24,
  },
  avatar: {
    width: 150,
    height: 150,
    borderRadius: 20,
    borderWidth: 4,
    borderColor: '#ff6b35',
  },
  nameContainer: {
    alignItems: 'center',
    marginBottom: 12,
  },
  name: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
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
  bioSection: {
    paddingHorizontal: 8,
    marginBottom: 16,
  },
  bio: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  statsSection: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    width: '100%',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'cyan',
  },
  statItem: {
    flex: 1,
    maxWidth: 150,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'magenta',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  tabContent: {
    padding: 16,
  },
  emptyPlaceholder: {
    padding: 40,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    fontSize: 14,
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
  // Member item styles
  memberItem: {
    flex: 1 / 3,
    alignItems: 'center',
    padding: 8,
    maxWidth: Dimensions.get('window').width / 3,
  },
  memberAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 8,
  },
  memberName: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
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
    height: 300,
  },
  skeletonAvatar: {
    width: 150,
    height: 150,
    borderRadius: 20,
    borderWidth: 4,
    borderColor: '#ff6b35',
  },
  skeletonBar: {
    borderRadius: 10,
  },
  skeletonName: {
    width: 180,
    height: 24,
  },
  skeletonUsername: {
    width: 150,
    height: 18,
  },
});
