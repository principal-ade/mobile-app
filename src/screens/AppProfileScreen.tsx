/**
 * AppProfileScreen - Profile screen for GitHub Apps and bot accounts
 *
 * This screen displays profiles for:
 * 1. Bot user accounts (e.g., "dependabot[bot]") - GitHub users with type "Bot"
 * 2. GitHub Apps without user accounts (e.g., "opencode-agent")
 *
 * Key differences from UserProfileScreen:
 * - No contribution calendar (bots don't have organic contributions)
 * - No watch button (can't watch bots)
 * - Simplified activity view (just recent commits)
 * - Purple theme instead of orange
 */

import React from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@principal-ade/industry-theme';
import { Logo } from '../components/Logo';
import { LucideIcon } from '../components/LucideIcon';

export interface HourlyActivityGroup {
  id: string;
  repo: string;
  repoOwner: string;
  repoOwnerAvatar: string;
  hour: number;
  hourBucket: string;
  hoursAgo: number;
  commitCount: number;
}

export interface AppProfileScreenProps {
  loading?: boolean;
  avatarUrl?: string;
  name?: string;
  login?: string; // The bot/app login (without [bot] suffix)
  description?: string;
  externalUrl?: string;
  createdAt?: string;
  onClose?: () => void;
  recentActivity?: HourlyActivityGroup[];
  onRepoPress?: (owner: string, name: string, fullName: string) => void;
}

export const AppProfileScreen: React.FC<AppProfileScreenProps> = ({
  loading = false,
  avatarUrl,
  name,
  login,
  description,
  externalUrl,
  createdAt,
  onClose,
  recentActivity = [],
  onRepoPress,
}) => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  const formatDate = (isoString?: string) => {
    if (!isoString) return null;
    const date = new Date(isoString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };


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

        <View style={[styles.header, styles.skeletonHeaderHeight]}>
          <View style={[styles.avatarSection, { marginTop: 32 + insets.top }]}>
            <View style={styles.avatarContainer}>
              <View style={styles.skeletonAvatarCircle}>
                <Logo width={152} height={152} animated={true} />
              </View>
            </View>
          </View>

          <View style={styles.nameContainer}>
            <View style={[styles.skeletonBar, styles.skeletonName, { backgroundColor: theme.colors.surface }]} />
            <View style={[styles.skeletonBar, styles.skeletonLogin, { backgroundColor: theme.colors.surface, marginTop: 4 }]} />
          </View>
        </View>
      </View>
    );
  }

  // After loading, these should always be defined
  const appAvatarUrl = avatarUrl!;
  const appName = name!;
  const appLogin = login!;

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

      <ScrollView style={{ flex: 1, backgroundColor: theme.colors.background }}>
        {/* Header Section */}
        <View style={styles.header}>
          <View style={[styles.avatarSection, { marginTop: insets.top }]}>
            <View style={styles.avatarContainer}>
              <Image
                source={{ uri: appAvatarUrl }}
                style={styles.avatar}
                resizeMode="cover"
              />
              <View style={styles.botBadge}>
                <LucideIcon name="Cpu" size={20} color="#ffffff" />
              </View>
            </View>
          </View>

          <View style={styles.nameContainer}>
            <Text style={[styles.name, { color: theme.colors.text }]}>
              {appName}
            </Text>
            <View style={styles.socialHandles}>
              <TouchableOpacity
                style={[styles.socialHandle, { backgroundColor: theme.colors.surface }]}
                onPress={() => Linking.openURL(`https://github.com/apps/${appLogin}`)}
                activeOpacity={0.7}
              >
                <LucideIcon name="Github" size={14} color={theme.colors.textSecondary} />
                <Text style={[styles.handleText, { color: theme.colors.textSecondary }]}>
                  {appLogin}
                </Text>
                <View style={[styles.appBadge, { backgroundColor: theme.colors.accent }]}>
                  <Text style={[styles.appBadgeText, { color: '#ffffff' }]}>APP</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>

          {/* Description Section */}
          {description && (
            <View style={styles.descriptionSection}>
              <Text style={[styles.description, { color: theme.colors.textSecondary }]}>
                {description}
              </Text>
            </View>
          )}

          {/* App Info */}
          <View style={styles.appInfo}>
            {externalUrl && (
              <TouchableOpacity
                style={styles.infoRow}
                onPress={() => Linking.openURL(externalUrl)}
                activeOpacity={0.7}
              >
                <LucideIcon name="Link" size={16} color={theme.colors.textSecondary} />
                <Text style={[styles.infoText, { color: theme.colors.accent }]}>
                  {externalUrl.replace(/^https?:\/\//, '')}
                </Text>
              </TouchableOpacity>
            )}
            {createdAt && (
              <View style={styles.infoRow}>
                <LucideIcon name="Clock" size={16} color={theme.colors.textSecondary} />
                <Text style={[styles.infoText, { color: theme.colors.textSecondary }]}>
                  Created {formatDate(createdAt)}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Activity Content */}
        <View style={styles.contentSection}>
          <View style={styles.sectionHeaderContainer}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              Recent Activity
            </Text>
            <Text style={[styles.sectionSubtitle, { color: theme.colors.textSecondary }]}>
              Last 24 hours
            </Text>
          </View>

          {recentActivity.length > 0 ? (
            recentActivity.map((group) => {
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
                    <Image
                      source={{ uri: group.repoOwnerAvatar }}
                      style={styles.activityAvatar}
                      resizeMode="cover"
                    />
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
            })
          ) : (
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
    position: 'relative',
  },
  avatarSection: {
    alignItems: 'center',
    position: 'relative',
    marginBottom: 0,
    width: '100%',
    paddingTop: 32,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 4,
    borderColor: '#8b5cf6', // Purple for bots
  },
  botBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#8b5cf6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#1a1a1a',
  },
  nameContainer: {
    alignItems: 'center',
    marginTop: 16,
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
  appBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 4,
  },
  appBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  descriptionSection: {
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
  },
  appInfo: {
    paddingHorizontal: 24,
    paddingBottom: 16,
    gap: 8,
    alignItems: 'center',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoText: {
    fontSize: 14,
  },
  contentSection: {
    padding: 16,
  },
  sectionHeaderContainer: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 13,
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
  activityTimestamp: {
    fontSize: 12,
    marginBottom: 6,
  },
  activityCommitCount: {
    fontSize: 13,
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
  skeletonHeaderHeight: {
    height: 300,
  },
  skeletonAvatarCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 4,
    borderColor: '#8b5cf6',
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
  skeletonLogin: {
    width: 200,
    height: 18,
  },
});
