import React, { useRef } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Animated,
} from 'react-native';
import { useTheme } from '@principal-ade/industry-theme';
import { ContributionCalendar, DailyContribution } from '../components/ContributionCalendar';

interface UserStats {
  repositories: number;
  followers: number;
  following: number;
}

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
  hour: number; // 0-23
  hourBucket: string; // ISO timestamp
  hoursAgo: number;
  commits: ActivityCommit[];
  commitCount: number;
  totalAdditions: number;
  totalDeletions: number;
}

export interface UserProfileScreenProps {
  avatarUrl: string;
  name: string;
  username: string;
  bio?: string;
  location?: string;
  website?: string;
  stats: UserStats;
  onFollowPress?: () => void;
  onMessagePress?: () => void;
  isFollowing?: boolean;
  recentActivity?: HourlyActivityGroup[];
  contributions?: DailyContribution[];
}

export const UserProfileScreen: React.FC<UserProfileScreenProps> = ({
  avatarUrl,
  name,
  username,
  bio,
  location,
  website,
  stats,
  onFollowPress,
  onMessagePress,
  isFollowing = false,
  recentActivity = [],
  contributions = [],
}) => {
  const { theme } = useTheme();
  const { width } = Dimensions.get('window');
  const scrollY = useRef(new Animated.Value(0)).current;

  // Define header collapse threshold
  const HEADER_MAX_HEIGHT = 300;
  const HEADER_MIN_HEIGHT = 60;
  const HEADER_SCROLL_DISTANCE = HEADER_MAX_HEIGHT - HEADER_MIN_HEIGHT;

  // Animated values
  const headerHeight = scrollY.interpolate({
    inputRange: [0, HEADER_SCROLL_DISTANCE],
    outputRange: [HEADER_MAX_HEIGHT, HEADER_MIN_HEIGHT],
    extrapolate: 'clamp',
  });

  const avatarScale = scrollY.interpolate({
    inputRange: [0, HEADER_SCROLL_DISTANCE],
    outputRange: [1, 0.4],
    extrapolate: 'clamp',
  });

  const avatarTranslateY = scrollY.interpolate({
    inputRange: [0, HEADER_SCROLL_DISTANCE],
    outputRange: [0, -10],
    extrapolate: 'clamp',
  });

  const headerOpacity = scrollY.interpolate({
    inputRange: [0, HEADER_SCROLL_DISTANCE / 2, HEADER_SCROLL_DISTANCE],
    outputRange: [1, 0.5, 0],
    extrapolate: 'clamp',
  });

  const nameTranslateY = scrollY.interpolate({
    inputRange: [0, HEADER_SCROLL_DISTANCE],
    outputRange: [0, 10],
    extrapolate: 'clamp',
  });

  const nameFontSize = scrollY.interpolate({
    inputRange: [0, HEADER_SCROLL_DISTANCE],
    outputRange: [28, 16],
    extrapolate: 'clamp',
  });

  // Sticky header animations
  const stickyHeaderOpacity = scrollY.interpolate({
    inputRange: [0, HEADER_SCROLL_DISTANCE / 2, HEADER_SCROLL_DISTANCE],
    outputRange: [0, 0, 1],
    extrapolate: 'clamp',
  });

  const stickyHeaderTranslateY = scrollY.interpolate({
    inputRange: [0, HEADER_SCROLL_DISTANCE],
    outputRange: [-60, 0],
    extrapolate: 'clamp',
  });

  return (
    <View style={styles.container}>
      {/* Sticky Header Bar */}
      <Animated.View
        style={[
          styles.stickyHeader,
          {
            backgroundColor: theme.colors.surface,
            borderBottomColor: theme.colors.border,
            opacity: stickyHeaderOpacity,
            transform: [{ translateY: stickyHeaderTranslateY }],
          },
        ]}
      >
        <View style={styles.stickyHeaderContent}>
          <Image
            source={{ uri: avatarUrl }}
            style={styles.stickyAvatar}
            resizeMode="cover"
          />
          <View style={styles.stickyNameContainer}>
            <Text style={[styles.stickyName, { color: theme.colors.text }]} numberOfLines={1}>
              {name}
            </Text>
            <Text style={[styles.stickyUsername, { color: theme.colors.textSecondary }]} numberOfLines={1}>
              @{username}
            </Text>
          </View>
        </View>
      </Animated.View>
      <Animated.ScrollView
        style={{ backgroundColor: theme.colors.background }}
        contentContainerStyle={styles.contentContainer}
        scrollEventThrottle={16}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
      >
        {/* Collapsing Header Section */}
        <Animated.View
          style={[
            styles.header,
            {
              height: headerHeight,
            },
          ]}
        >
        {/* Contribution calendar background for entire header */}
        {contributions.length > 0 && (
          <View style={styles.contributionBackground}>
            <View style={styles.calendarWrapper}>
              <ContributionCalendar contributions={contributions} months={5} showLabels={false} />
            </View>
          </View>
        )}

        <Animated.View
          style={[
            styles.avatarContainer,
            {
              transform: [
                { scale: avatarScale },
                { translateY: avatarTranslateY },
              ],
            },
          ]}
        >
          <Image
            source={{ uri: avatarUrl }}
            style={styles.avatar}
            resizeMode="cover"
          />
        </Animated.View>

        <Animated.View
          style={[
            styles.nameContainer,
            {
              transform: [{ translateY: nameTranslateY }],
            },
          ]}
        >
          <Animated.Text
            style={[
              styles.name,
              {
                color: theme.colors.text,
                fontSize: nameFontSize,
              },
            ]}
          >
            {name}
          </Animated.Text>
          <Animated.Text
            style={[
              styles.username,
              {
                color: theme.colors.textSecondary,
                opacity: headerOpacity,
              },
            ]}
          >
            @{username}
          </Animated.Text>
        </Animated.View>

        {/* Action Buttons */}
        <Animated.View
          style={[
            styles.actionButtons,
            {
              opacity: headerOpacity,
            },
          ]}
        >
          <TouchableOpacity
            style={[
              styles.followButton,
              {
                backgroundColor: isFollowing
                  ? theme.colors.surface
                  : theme.colors.primary,
                borderColor: theme.colors.primary,
              },
            ]}
            onPress={onFollowPress}
          >
            <Text
              style={[
                styles.followButtonText,
                {
                  color: isFollowing ? theme.colors.primary : theme.colors.text,
                },
              ]}
            >
              {isFollowing ? 'Following' : 'Follow'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.messageButton,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
              },
            ]}
            onPress={onMessagePress}
          >
            <Text style={[styles.messageButtonText, { color: theme.colors.text }]}>
              Message
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>

      {/* Bio Section */}
      {bio && (
        <View style={styles.bioSection}>
          <Text style={[styles.bio, { color: theme.colors.textSecondary }]}>
            {bio}
          </Text>
        </View>
      )}

      {/* Info Section */}
      <View style={styles.infoSection}>
        {location && (
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: theme.colors.textTertiary }]}>
              Location
            </Text>
            <Text style={[styles.infoValue, { color: theme.colors.text }]}>
              {location}
            </Text>
          </View>
        )}
        {website && (
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: theme.colors.textTertiary }]}>
              Website
            </Text>
            <Text
              style={[
                styles.infoValue,
                styles.link,
                { color: theme.colors.accent },
              ]}
            >
              {website}
            </Text>
          </View>
        )}
      </View>

      {/* Stats Section */}
      <View
        style={[
          styles.statsContainer,
          { backgroundColor: theme.colors.surface },
        ]}
      >
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: theme.colors.text }]}>
            {stats.repositories}
          </Text>
          <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
            Repositories
          </Text>
        </View>

        <View
          style={[styles.statDivider, { backgroundColor: theme.colors.border }]}
        />

        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: theme.colors.text }]}>
            {stats.followers}
          </Text>
          <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
            Followers
          </Text>
        </View>

        <View
          style={[styles.statDivider, { backgroundColor: theme.colors.border }]}
        />

        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: theme.colors.text }]}>
            {stats.following}
          </Text>
          <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
            Following
          </Text>
        </View>
      </View>

      {/* Recent Activity - Last 24 Hours */}
      <View style={styles.activitySection}>
        <Text
          style={[
            styles.sectionTitle,
            { color: theme.colors.text },
          ]}
        >
          Recent Activity (24h)
        </Text>
        {recentActivity.length > 0 ? (
          <View>
            {recentActivity.map((group) => (
              <View
                key={group.id}
                style={[
                  styles.activityItem,
                  { backgroundColor: theme.colors.surface },
                ]}
              >
                <View style={styles.activityHeader}>
                  <Image
                    source={{ uri: group.repoOwnerAvatar }}
                    style={styles.activityAvatar}
                    resizeMode="cover"
                  />
                  <View style={styles.activityContent}>
                    <Text
                      style={[styles.activityRepo, { color: theme.colors.accent }]}
                      numberOfLines={1}
                    >
                      {group.repo}
                    </Text>
                    <Text
                      style={[styles.activityTitle, { color: theme.colors.text }]}
                      numberOfLines={2}
                    >
                      {group.commitCount} {group.commitCount === 1 ? 'commit' : 'commits'}
                    </Text>
                    <Text
                      style={[
                        styles.activityDetails,
                        { color: theme.colors.success },
                      ]}
                      numberOfLines={1}
                    >
                      +{group.totalAdditions} -{group.totalDeletions}
                    </Text>
                  </View>
                </View>
                <Text
                  style={[styles.activityTimestamp, { color: theme.colors.textTertiary }]}
                >
                  {group.hoursAgo === 0
                    ? 'Just now'
                    : group.hoursAgo === 1
                    ? '1 hour ago'
                    : `${group.hoursAgo} hours ago`}
                </Text>
              </View>
            ))}
          </View>
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
      </Animated.ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  stickyHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 60,
    zIndex: 100,
    borderBottomWidth: 1,
    justifyContent: 'center',
  },
  stickyHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  stickyAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#ff6b35',
  },
  stickyNameContainer: {
    marginLeft: 12,
    flex: 1,
  },
  stickyName: {
    fontSize: 16,
    fontWeight: '700',
  },
  stickyUsername: {
    fontSize: 12,
    fontWeight: '400',
  },
  contentContainer: {
    paddingBottom: 32,
  },
  header: {
    alignItems: 'center',
    paddingTop: 24,
    paddingHorizontal: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  avatarContainer: {
    marginBottom: 16,
    zIndex: 1,
  },
  contributionBackground: {
    position: 'absolute',
    top: -120,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.3,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 0,
  },
  calendarWrapper: {
    width: '100%',
    height: 140,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: '#ff6b35',
  },
  nameContainer: {
    alignItems: 'center',
    marginBottom: 20,
    zIndex: 1,
  },
  name: {
    fontWeight: '700',
    marginBottom: 4,
  },
  username: {
    fontSize: 16,
    fontWeight: '400',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    paddingHorizontal: 8,
    zIndex: 1,
  },
  followButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  followButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  messageButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  messageButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  bioSection: {
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  bio: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
  },
  infoSection: {
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '400',
  },
  link: {
    textDecorationLine: 'underline',
  },
  statsContainer: {
    flexDirection: 'row',
    marginTop: 24,
    marginHorizontal: 16,
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '400',
  },
  statDivider: {
    width: 1,
    height: 40,
  },
  activitySection: {
    paddingHorizontal: 16,
    paddingTop: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
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
  },
  activityHeader: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  activityAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityRepo: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
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
    marginLeft: 44,
  },
});
