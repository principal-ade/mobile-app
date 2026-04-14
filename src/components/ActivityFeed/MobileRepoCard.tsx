import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  FlatList,
  ViewToken,
  LayoutChangeEvent,
  Pressable,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';
import { useTheme } from '@principal-ade/industry-theme';
import { Logo } from '../Logo';
import type { RepoActivitySummary, ActivityCommit } from '../../types/activity';
import type { FeedStackParamList } from '../../navigation/types';
import { apiConfig } from '../../utils/config';

interface MobileRepoCardProps {
  summary: RepoActivitySummary;
  /** Hour label to display (e.g., "Good Morning", "2 PM") */
  hourLabel?: string;
  /** Container height for calculating commit area */
  containerHeight: number;
  /** Skip top safe area inset (use when parent handles it) */
  skipTopInset?: boolean;
}

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getTimeRangeText(commits: ActivityCommit[]): string {
  const oldestCommit = commits[commits.length - 1];
  if (!oldestCommit) return '';

  const now = new Date();
  const commitDate = new Date(oldestCommit.date);
  const diffMs = now.getTime() - commitDate.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

  if (diffMins < 60) return `${diffMins} min${diffMins !== 1 ? 's' : ''}`;
  return `${diffHours} hr${diffHours !== 1 ? 's' : ''}`;
}

// Layout constants
const HOUR_LABEL_HEIGHT = 37; // paddingTop 16 + text ~17 + paddingBottom 4
const HEADER_HEIGHT = 80; // padding 16 + avatar 48 + padding 16
const FILE_CITY_BORDER = 2; // top + bottom border
const TIMELINE_HEIGHT = 52; // paddingTop 12 + avatar 28 + paddingBottom 12 (safe area added separately)
const TIMELINE_AVATAR_SIZE = 28;
const TIMELINE_LINE_HEIGHT = 2;

export function MobileRepoCard({ summary, hourLabel, containerHeight, skipTopInset = false }: MobileRepoCardProps) {
  const { theme } = useTheme();
  const navigation = useNavigation<NavigationProp<FeedStackParamList>>();
  const insets = useSafeAreaInsets();
  const topInset = skipTopInset ? 0 : insets.top;
  const [avatarError, setAvatarError] = useState(false);
  const [activeCommitIndex, setActiveCommitIndex] = useState(0);
  const [fileCityLoaded, setFileCityLoaded] = useState(false);
  const [fileCityError, setFileCityError] = useState(false);
  const [containerWidth, setContainerWidth] = useState(375);
  const [isScrolling, setIsScrolling] = useState(false);
  const commitsListRef = useRef<FlatList<ActivityCommit>>(null);

  const onContainerLayout = useCallback((event: LayoutChangeEvent) => {
    setContainerWidth(event.nativeEvent.layout.width);
  }, []);

  // Calculate commit section height based on known layout dimensions
  const fileCityHeight = containerWidth + FILE_CITY_BORDER;
  const topContentHeight = hourLabel
    ? topInset + HOUR_LABEL_HEIGHT + HEADER_HEIGHT
    : topInset + HEADER_HEIGHT;
  // Bottom safe area is applied as padding on timeline container
  const commitSectionHeight = containerHeight - topContentHeight - fileCityHeight - TIMELINE_HEIGHT - insets.bottom;

  const activeCommit = summary.commits[activeCommitIndex];

  // File City image URL
  const baseImageUrl = `${apiConfig.baseUrl}/file-city/${summary.owner}/${summary.repo}?width=800&height=800`;
  const fileCityImageUrl = activeCommit
    ? `${baseImageUrl}&commit=${activeCommit.sha}`
    : baseImageUrl;

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0]?.index != null) {
        setActiveCommitIndex(viewableItems[0].index);
      }
    },
    []
  );

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
  }).current;

  const scrollToCommit = useCallback((index: number) => {
    setIsScrolling(true);
    commitsListRef.current?.scrollToIndex({ index, animated: true });
    // Fallback timeout for programmatic scrolls
    setTimeout(() => setIsScrolling(false), 350);
  }, []);


  const cardWidth = containerWidth;
  const itemWidth = containerWidth;

  const renderCommitCard = useCallback(
    ({ item: commit }: { item: ActivityCommit }) => (
      <View
        style={[
          styles.commitCard,
          {
            backgroundColor: theme.colors.surface,
            width: cardWidth,
            height: commitSectionHeight,
            opacity: isScrolling ? 0 : 1,
          },
        ]}
      >
        {/* Author row */}
        <View style={styles.authorRow}>
          {commit.authorAvatarUrl && commit.authorLogin && (
            <TouchableOpacity
              onPress={() => {
                navigation.navigate('UserProfile', {
                  username: commit.authorLogin,
                });
              }}
            >
              <Image
                source={{ uri: commit.authorAvatarUrl }}
                style={styles.commitAvatar}
              />
            </TouchableOpacity>
          )}
          <Text style={[styles.authorName, { color: theme.colors.text }]}>
            {commit.author}
          </Text>
          <Text style={[styles.commitTime, { color: theme.colors.textSecondary }]}>
            {formatRelativeTime(new Date(commit.date))}
          </Text>
        </View>

        {/* Commit message */}
        <Text style={[styles.commitMessage, { color: theme.colors.text }]}>
          {commit.message}
        </Text>

        {/* Footer */}
        <View style={styles.commitFooter}>
          <Text style={[styles.sha, { color: theme.colors.textSecondary }]}>
            {commit.sha.slice(0, 7)}
          </Text>
          {(commit.filesChanged != null || commit.additions != null || commit.deletions != null) && (
            <View style={styles.statsRow}>
              {commit.filesChanged != null && (
                <Text style={[styles.statText, { color: theme.colors.textSecondary }]}>
                  {commit.filesChanged} {commit.filesChanged === 1 ? 'file' : 'files'}
                </Text>
              )}
              {commit.additions != null && (
                <Text style={[styles.statText, { color: theme.colors.success }]}>
                  +{commit.additions}
                </Text>
              )}
              {commit.deletions != null && (
                <Text style={[styles.statText, { color: theme.colors.error }]}>
                  -{commit.deletions}
                </Text>
              )}
            </View>
          )}
        </View>
      </View>
    ),
    [theme, cardWidth, commitSectionHeight, isScrolling]
  );

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      onLayout={onContainerLayout}
    >
      {/* Hour Label */}
      {hourLabel && (
        <View style={[styles.hourLabelContainer, { paddingTop: topInset + 16 }]}>
          <Text style={[styles.hourLabel, { color: theme.colors.textSecondary }]}>
            {hourLabel}
          </Text>
        </View>
      )}

      {/* Header */}
      <TouchableOpacity
        style={[styles.header, !hourLabel && { paddingTop: topInset + 16 }]}
        onPress={() => {
          navigation.navigate('RepoFileCity', {
            owner: summary.owner,
            name: summary.repo,
            fullName: summary.fullName,
          });
        }}
        activeOpacity={0.7}
      >
        <View
          style={[
            styles.avatarContainer,
            { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
          ]}
        >
          {!avatarError ? (
            <Image
              source={{ uri: `https://github.com/${summary.owner}.png?size=128` }}
              style={styles.avatar}
              onError={() => setAvatarError(true)}
            />
          ) : (
            <Text style={[styles.avatarFallback, { color: theme.colors.textSecondary }]}>
              {summary.owner.charAt(0).toUpperCase()}
            </Text>
          )}
        </View>

        <View style={styles.headerText}>
          <Text
            style={[styles.repoName, { color: theme.colors.text }]}
            numberOfLines={1}
          >
            {summary.repo}
          </Text>
          <Text style={[styles.repoMeta, { color: theme.colors.textSecondary }]}>
            {summary.owner} · {summary.commitCount} commit
            {summary.commitCount !== 1 ? 's' : ''} in last {getTimeRangeText(summary.commits)}
          </Text>
        </View>
      </TouchableOpacity>

      {/* Commit Timeline */}
      {summary.commits.length > 1 && (
        <View style={[styles.timelineContainer, { backgroundColor: theme.colors.surface }]}>
          {summary.commits.map((commit, index) => (
            <React.Fragment key={commit.sha}>
              {/* Connecting line before avatar (except first) */}
              {index > 0 && (
                <View
                  style={[
                    styles.timelineLine,
                    { backgroundColor: theme.colors.border },
                  ]}
                />
              )}
              {/* Author avatar */}
              <Pressable onPress={() => scrollToCommit(index)}>
                <View
                  style={[
                    styles.timelineAvatarContainer,
                    index === activeCommitIndex && {
                      borderColor: theme.colors.primary,
                      borderWidth: 2,
                    },
                    index !== activeCommitIndex && {
                      opacity: 0.5,
                    },
                  ]}
                >
                  {commit.authorAvatarUrl ? (
                    <Image
                      source={{ uri: commit.authorAvatarUrl }}
                      style={styles.timelineAvatar}
                    />
                  ) : (
                    <View
                      style={[
                        styles.timelineAvatarFallback,
                        { backgroundColor: theme.colors.border },
                      ]}
                    >
                      <Text style={[styles.timelineAvatarText, { color: theme.colors.textSecondary }]}>
                        {commit.author.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                  )}
                </View>
              </Pressable>
            </React.Fragment>
          ))}
        </View>
      )}

      {/* File City Image */}
      <View
        style={[
          styles.fileCityContainer,
          { backgroundColor: theme.colors.background, borderColor: theme.colors.border },
        ]}
      >
        {!fileCityLoaded && !fileCityError && (
          <View style={styles.fileCityPlaceholder}>
            <Logo
              width={120}
              height={120}
              color={theme.colors.textSecondary}
              opacity={0.6}
            />
          </View>
        )}
        {fileCityError ? (
          <View style={styles.fileCityPlaceholder}>
            <Logo
              width={80}
              height={80}
              color={theme.colors.textSecondary}
              opacity={0.4}
            />
          </View>
        ) : (
          <Image
            source={{ uri: fileCityImageUrl }}
            style={styles.fileCityImage}
            resizeMode="contain"
            onLoad={() => setFileCityLoaded(true)}
            onError={() => setFileCityError(true)}
          />
        )}
      </View>

      {/* Commits Carousel */}
      <View style={[styles.commitsSection, { backgroundColor: theme.colors.surface, paddingBottom: insets.bottom }]}>
        <FlatList
          ref={commitsListRef}
          data={summary.commits}
          renderItem={renderCommitCard}
          keyExtractor={(item) => item.sha}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          snapToInterval={itemWidth}
          decelerationRate="fast"
          style={styles.commitsList}
          contentContainerStyle={styles.commitsCarousel}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
  },
  hourLabelContainer: {
    paddingHorizontal: 16,
    paddingBottom: 4,
  },
  hourLabel: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 16,
  },
  avatarContainer: {
    width: 48,
    height: 48,
    borderRadius: 10,
    borderWidth: 1,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  avatarFallback: {
    fontSize: 20,
    fontWeight: '600',
  },
  headerText: {
    flex: 1,
  },
  repoName: {
    fontSize: 18,
    fontWeight: '700',
  },
  repoMeta: {
    fontSize: 13,
    marginTop: 4,
  },
  fileCityContainer: {
    width: '100%',
    aspectRatio: 1,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  fileCityPlaceholder: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fileCityImage: {
    width: '100%',
    height: '100%',
  },
  commitsSection: {
    flex: 1,
  },
  commitsList: {
    // Height determined by commitSectionHeight
  },
  commitsCarousel: {
    // No padding - edge to edge
  },
  commitCard: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  commitAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  authorName: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  commitTime: {
    fontSize: 12,
  },
  commitMessage: {
    fontSize: 15,
    lineHeight: 22,
    flex: 1,
  },
  commitFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  sha: {
    fontFamily: 'monospace',
    fontSize: 12,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statText: {
    fontSize: 13,
    fontWeight: '600',
  },
  timelineContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  timelineLine: {
    width: 24,
    height: TIMELINE_LINE_HEIGHT,
    marginHorizontal: 4,
  },
  timelineAvatarContainer: {
    width: TIMELINE_AVATAR_SIZE,
    height: TIMELINE_AVATAR_SIZE,
    borderRadius: TIMELINE_AVATAR_SIZE / 2,
    overflow: 'hidden',
  },
  timelineAvatar: {
    width: '100%',
    height: '100%',
  },
  timelineAvatarFallback: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineAvatarText: {
    fontSize: 12,
    fontWeight: '600',
  },
});

export default MobileRepoCard;
