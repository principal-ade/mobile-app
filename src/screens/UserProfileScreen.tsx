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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@principal-ade/industry-theme';
import { ContributionCalendar, DailyContribution } from '../components/ContributionCalendar';
import { Logo } from '../components/Logo';

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
  loading?: boolean;
  avatarUrl?: string;
  name?: string;
  username?: string;
  bio?: string;
  onWatchPress?: () => void;
  onClose?: () => void;
  isWatching?: boolean;
  recentActivity?: HourlyActivityGroup[];
  contributions?: DailyContribution[];
}

export const UserProfileScreen: React.FC<UserProfileScreenProps> = ({
  loading = false,
  avatarUrl,
  name,
  username,
  bio,
  onWatchPress,
  onClose,
  isWatching = false,
  recentActivity = [],
  contributions = [],
}) => {
  const { theme } = useTheme();
  const { width } = Dimensions.get('window');
  const insets = useSafeAreaInsets();
  const scrollY = useRef(new Animated.Value(0)).current;

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
                <Logo width={112} height={112} animated={true} />
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

  // Define header collapse threshold
  const HEADER_MAX_HEIGHT = 300 + insets.top;
  const HEADER_MIN_HEIGHT = 60 + insets.top;
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

      {/* Sticky Header Bar */}
      <Animated.View
        style={[
          styles.stickyHeader,
          {
            backgroundColor: theme.colors.surface,
            borderBottomColor: theme.colors.border,
            opacity: stickyHeaderOpacity,
            transform: [{ translateY: stickyHeaderTranslateY }],
            paddingTop: insets.top,
            height: 60 + insets.top,
          },
        ]}
      >
        <View style={styles.stickyHeaderContent}>
          <Image
            source={{ uri: userAvatarUrl }}
            style={styles.stickyAvatar}
            resizeMode="cover"
          />
          <View style={styles.stickyNameContainer}>
            <Text style={[styles.stickyName, { color: theme.colors.text }]} numberOfLines={1}>
              {userName}
            </Text>
            <Text style={[styles.stickyUsername, { color: theme.colors.textSecondary }]} numberOfLines={1}>
              @{userUsername}
            </Text>
          </View>
        </View>
      </Animated.View>
      <Animated.ScrollView
        style={{ backgroundColor: theme.colors.background }}
        contentContainerStyle={[styles.contentContainer, { paddingBottom: 32 + insets.bottom }]}
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
        {/* Avatar with contribution calendar background */}
        <Animated.View
          style={[
            styles.avatarSection,
            {
              marginTop: 32 + insets.top,
              transform: [
                { scale: avatarScale },
                { translateY: avatarTranslateY },
              ],
            },
          ]}
        >
          {/* Heatmap background behind avatar */}
          <View style={styles.contributionBackground}>
            <View style={styles.calendarWrapper}>
              <ContributionCalendar
                contributions={contributions}
                months={5}
                showLabels={false}
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
            {userName}
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
            @{userUsername}
          </Animated.Text>
        </Animated.View>

        {/* Action Button */}
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

      {/* Recent Activity - Last 24 Hours */}
      <View style={styles.activitySection}>
        <Text
          style={[
            styles.sectionTitle,
            { color: theme.colors.text },
          ]}
        >
          Recent Activity
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
    // paddingBottom is applied dynamically with safe area insets
  },
  header: {
    alignItems: 'center',
    paddingHorizontal: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  avatarSection: {
    alignItems: 'center',
    position: 'relative',
    marginBottom: 16,
    width: '100%',
  },
  contributionBackground: {
    position: 'absolute',
    top: -15, // Center heatmap with avatar
    left: -16, // Extend beyond header's paddingHorizontal
    right: -16, // Extend beyond header's paddingHorizontal
    height: 180,
    opacity: 0.3,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 0,
  },
  calendarWrapper: {
    width: '100%',
    height: 180,
  },
  avatarContainer: {
    zIndex: 1,
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
    paddingTop: 24,
  },
  bio: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
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
    marginTop: -2,
  },
  // Skeleton styles
  skeletonHeaderHeight: {
    height: 300, // Fixed height to prevent layout shift
  },
  skeletonAvatarCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
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
    width: 120,
    height: 18,
  },
  skeletonButton: {
    width: 140,
    height: 48,
    borderRadius: 12,
  },
});
