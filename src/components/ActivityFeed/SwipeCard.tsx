import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  Pressable,
  Animated,
  Dimensions,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { PanGestureHandler, PanGestureHandlerGestureEvent, State } from 'react-native-gesture-handler';
import { useTheme } from '@principal-ade/industry-theme';
import { Logo } from '../Logo';
import type { RepoActivitySummary } from '../../types/activity';
import { getCommitsSummary } from '../../services/FeedApiService';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.25;

interface SwipeCardProps {
  summary: RepoActivitySummary;
  /** Hour label to display (e.g., "Good Morning", "2 PM") */
  hourLabel?: string;
  /** Container height for layout calculations */
  containerHeight: number;
  /** Called when card is tapped to expand */
  onPress?: () => void;
  /** Called when swiped left (seen) */
  onSwipeLeft?: () => void;
  /** Called when swiped right (save) */
  onSwipeRight?: () => void;
  /** Called when swiped down (undo) */
  onSwipeDown?: () => void;
  /** Disable swipe gestures */
  swipeDisabled?: boolean;
  /** Skip loading File City image and AI summary (for testing) */
  skipRemoteContent?: boolean;
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

// Get unique authors from commits
function getUniqueAuthors(commits: RepoActivitySummary['commits']) {
  const seen = new Set<string>();
  const authors: { login: string; avatarUrl: string | null }[] = [];

  for (const commit of commits) {
    const key = commit.authorLogin || commit.author;
    if (!seen.has(key)) {
      seen.add(key);
      authors.push({
        login: commit.authorLogin || commit.author,
        avatarUrl: commit.authorAvatarUrl,
      });
    }
    if (authors.length >= 5) break; // Max 5 avatars
  }

  return authors;
}

const SWIPE_DOWN_THRESHOLD = 80;

export function SwipeCard({
  summary,
  hourLabel,
  containerHeight: _containerHeight,
  onPress,
  onSwipeLeft,
  onSwipeRight,
  onSwipeDown,
  swipeDisabled = false,
  skipRemoteContent = false,
}: SwipeCardProps) {
  const { theme } = useTheme();
  const [avatarError, setAvatarError] = useState(false);
  const [fileCityLoaded, setFileCityLoaded] = useState(false);
  const [fileCityError, setFileCityError] = useState(false);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryExpanded, setSummaryExpanded] = useState(false);

  // Animation values
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const isAnimating = useRef(false);

  const authors = getUniqueAuthors(summary.commits);
  const latestCommit = summary.commits[0];

  // File City image URL with all commit SHAs for highlighting
  const apiBase = __DEV__ ? 'http://localhost:3000/api' : 'https://app.principal-ade.com/api';
  const commitShas = summary.commits.map(c => c.sha).join(',');
  const fileCityImageUrl = `${apiBase}/file-city/${summary.owner}/${summary.repo}?width=800&height=800&commits=${commitShas}`;

  // Stable key for the card based on commits
  const cardKey = summary.commits.map(c => c.sha).join(',');

  // Fetch AI summary for commits
  useEffect(() => {
    if (skipRemoteContent || summary.commits.length === 0) return;

    setSummaryLoading(true);
    setAiSummary(null);

    const commitsForSummary = summary.commits.map(c => ({
      sha: c.sha,
      message: c.message,
      author: c.authorLogin || c.author,
      additions: c.additions,
      deletions: c.deletions,
      filesChanged: c.filesChanged,
    }));

    getCommitsSummary(commitsForSummary, summary.fullName, 'non-technical')
      .then(text => {
        setAiSummary(text);
      })
      .catch(err => {
        console.warn('[SwipeCard] Failed to get AI summary:', err);
      })
      .finally(() => {
        setSummaryLoading(false);
      });
  }, [cardKey, summary.fullName, skipRemoteContent]);

  // Swipe handlers
  const resetPosition = useCallback(() => {
    Animated.parallel([
      Animated.spring(translateX, {
        toValue: 0,
        useNativeDriver: true,
        tension: 100,
        friction: 10,
      }),
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 100,
        friction: 10,
      }),
    ]).start(() => {
      isAnimating.current = false;
    });
  }, [translateX, translateY]);

  const swipeOut = useCallback((direction: 'left' | 'right') => {
    if (isAnimating.current) return;
    isAnimating.current = true;

    const toValue = direction === 'left' ? -SCREEN_WIDTH * 1.5 : SCREEN_WIDTH * 1.5;
    Animated.timing(translateX, {
      toValue,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      if (direction === 'left') {
        onSwipeLeft?.();
      } else {
        onSwipeRight?.();
      }
      // Reset for next card
      translateX.setValue(0);
      translateY.setValue(0);
      isAnimating.current = false;
    });
  }, [translateX, translateY, onSwipeLeft, onSwipeRight]);

  const swipeDown = useCallback(() => {
    if (isAnimating.current || !onSwipeDown) return;
    isAnimating.current = true;

    Animated.timing(translateY, {
      toValue: 100,
      duration: 150,
      useNativeDriver: true,
    }).start(() => {
      onSwipeDown();
      // Reset position
      translateX.setValue(0);
      translateY.setValue(0);
      isAnimating.current = false;
    });
  }, [translateY, translateX, onSwipeDown]);

  const swipeUp = useCallback((velocityY: number = -800) => {
    if (isAnimating.current) return;
    isAnimating.current = true;

    // Use spring with velocity for natural feel
    Animated.spring(translateY, {
      toValue: -SCREEN_HEIGHT,
      velocity: Math.min(velocityY / 1000, -0.5), // Normalize velocity, ensure minimum speed
      tension: 40,
      friction: 8,
      useNativeDriver: true,
    }).start(() => {
      onSwipeLeft?.();
      // Reset position
      translateX.setValue(0);
      translateY.setValue(0);
      isAnimating.current = false;
    });
  }, [translateY, translateX, onSwipeLeft]);

  const onGestureEvent = useCallback(
    (event: PanGestureHandlerGestureEvent) => {
      if (swipeDisabled || isAnimating.current) return;
      const { translationX: tx, translationY: ty } = event.nativeEvent;

      // Determine primary direction but allow some secondary movement for natural feel
      const absX = Math.abs(tx);
      const absY = Math.abs(ty);

      if (absX > absY) {
        // Primarily horizontal - allow slight vertical drift
        translateX.setValue(tx);
        translateY.setValue(ty * 0.3); // Dampen vertical movement
      } else {
        // Primarily vertical - allow slight horizontal drift
        translateY.setValue(ty);
        translateX.setValue(tx * 0.3); // Dampen horizontal movement
      }
    },
    [swipeDisabled, translateX, translateY]
  );

  const onHandlerStateChange = useCallback(
    (event: PanGestureHandlerGestureEvent) => {
      if (swipeDisabled || isAnimating.current) return;

      if (event.nativeEvent.state === State.END) {
        const { translationX, translationY, velocityX, velocityY } = event.nativeEvent;

        // Determine primary swipe direction based on both distance and velocity
        const absTransX = Math.abs(translationX);
        const absTransY = Math.abs(translationY);
        const absVelX = Math.abs(velocityX);
        const absVelY = Math.abs(velocityY);

        // Weight velocity more heavily for determining direction
        const horizontalIntent = absTransX + absVelX * 0.1;
        const verticalIntent = absTransY + absVelY * 0.1;

        if (verticalIntent > horizontalIntent) {
          // Vertical swipe takes precedence
          if (translationY < -SWIPE_DOWN_THRESHOLD || velocityY < -500) {
            swipeUp(velocityY);
          } else if (translationY > SWIPE_DOWN_THRESHOLD || velocityY > 500) {
            swipeDown();
          } else {
            resetPosition();
          }
        } else {
          // Horizontal swipe
          if (translationX < -SWIPE_THRESHOLD || velocityX < -500) {
            swipeOut('left');
          } else if (translationX > SWIPE_THRESHOLD || velocityX > 500) {
            swipeOut('right');
          } else {
            resetPosition();
          }
        }
      }
    },
    [swipeDisabled, swipeOut, swipeUp, swipeDown, resetPosition]
  );

  // Interpolate rotation and opacity based on swipe
  const rotate = translateX.interpolate({
    inputRange: [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2],
    outputRange: ['-10deg', '0deg', '10deg'],
    extrapolate: 'clamp',
  });

  const passOpacity = translateX.interpolate({
    inputRange: [-SCREEN_WIDTH / 4, 0],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  const saveOpacity = translateX.interpolate({
    inputRange: [0, SCREEN_WIDTH / 4],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const undoOpacity = translateY.interpolate({
    inputRange: [0, SWIPE_DOWN_THRESHOLD / 2],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const seenUpOpacity = translateY.interpolate({
    inputRange: [-SWIPE_DOWN_THRESHOLD / 2, 0],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  const cardContent = (
    <Animated.View
      style={[
        styles.container,
        { backgroundColor: theme.colors.background },
        {
          transform: [{ translateX }, { translateY }, { rotate }],
        },
      ]}
    >
      {/* Seen indicator (left swipe) */}
      {!swipeDisabled && (
        <Animated.View style={[styles.swipeIndicator, styles.seenIndicator, { opacity: passOpacity }]}>
          <Text style={styles.swipeIndicatorText}>SEEN</Text>
        </Animated.View>
      )}

      {/* Save indicator (right swipe) */}
      {!swipeDisabled && (
        <Animated.View style={[styles.swipeIndicator, styles.saveIndicator, { opacity: saveOpacity }]}>
          <Text style={styles.swipeIndicatorText}>SAVE</Text>
        </Animated.View>
      )}

      {/* Undo indicator (down swipe) */}
      {!swipeDisabled && onSwipeDown && (
        <Animated.View style={[styles.swipeIndicator, styles.undoIndicator, { opacity: undoOpacity }]}>
          <Text style={styles.swipeIndicatorText}>UNDO</Text>
        </Animated.View>
      )}

      {/* Seen indicator (up swipe) */}
      {!swipeDisabled && (
        <Animated.View style={[styles.swipeIndicator, styles.seenUpIndicator, { opacity: seenUpOpacity }]}>
          <Text style={styles.swipeIndicatorText}>SEEN</Text>
        </Animated.View>
      )}

      {/* Hour Label */}
      {hourLabel && (
        <View style={styles.hourLabelContainer}>
          <Text style={[styles.hourLabel, { color: theme.colors.textSecondary }]}>
            {hourLabel}
          </Text>
        </View>
      )}

      {/* Header */}
      <View style={styles.header}>
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
          <View style={styles.repoRow}>
            <Text
              style={[styles.repoName, { color: theme.colors.text }]}
              numberOfLines={1}
            >
              {summary.repo}
            </Text>
            <Text style={[styles.commitCount, { color: theme.colors.textSecondary }]}>
              {summary.commitCount} commit{summary.commitCount !== 1 ? 's' : ''}
            </Text>
          </View>
          <View style={styles.authorInfo}>
            <View style={styles.avatarStack}>
              {authors.map((author, index) => (
                <View
                  key={author.login}
                  style={[
                    styles.stackedAvatarContainer,
                    {
                      marginLeft: index > 0 ? -6 : 0,
                      zIndex: authors.length - index,
                      borderColor: theme.colors.background,
                    },
                  ]}
                >
                  {author.avatarUrl ? (
                    <Image
                      source={{ uri: author.avatarUrl }}
                      style={styles.stackedAvatar}
                    />
                  ) : (
                    <View style={[styles.stackedAvatarFallback, { backgroundColor: theme.colors.border }]}>
                      <Text style={[styles.stackedAvatarText, { color: theme.colors.textSecondary }]}>
                        {author.login.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                  )}
                </View>
              ))}
            </View>
            <Text style={[styles.authorsText, { color: theme.colors.textSecondary }]} numberOfLines={1}>
              {authors.length === 1
                ? authors[0]?.login
                : `${authors[0]?.login} +${authors.length - 1}`}
            </Text>
            <Text style={[styles.timeText, { color: theme.colors.textSecondary }]}>
              {formatRelativeTime(new Date(summary.latestCommitAt))}
            </Text>
          </View>
        </View>
      </View>

      {/* File City Image */}
      <View
        style={[
          styles.fileCityContainer,
          { backgroundColor: theme.colors.background, borderColor: theme.colors.border },
        ]}
      >
        {/* Always render placeholder to avoid layout shifts - use opacity to hide */}
        <View style={[styles.fileCityPlaceholder, { opacity: !fileCityLoaded && !fileCityError ? 1 : 0 }]}>
          <View style={styles.logoWrapper}>
            <Logo
              width={120}
              height={120}
              color={theme.colors.textSecondary}
              opacity={0.6}
            />
          </View>
        </View>
        {fileCityError ? (
          <View style={styles.fileCityPlaceholder}>
            <Logo
              width={80}
              height={80}
              color={theme.colors.textSecondary}
              opacity={0.4}
            />
          </View>
        ) : !skipRemoteContent ? (
          <Image
            source={{ uri: fileCityImageUrl }}
            style={styles.fileCityImage}
            resizeMode="contain"
            onLoad={() => setFileCityLoaded(true)}
            onError={() => setFileCityError(true)}
          />
        ) : null}
      </View>

      {/* Summary Footer */}
      <Pressable
        style={[
          styles.summarySection,
          { backgroundColor: theme.colors.surface },
          summaryExpanded && styles.summarySectionExpanded,
        ]}
        onPress={() => setSummaryExpanded(!summaryExpanded)}
      >
        {summaryLoading ? (
          <View style={styles.summaryLoading}>
            <ActivityIndicator size="small" color={theme.colors.textSecondary} />
            <Text style={[styles.summaryLoadingText, { color: theme.colors.textSecondary }]}>
              Summarizing commits...
            </Text>
          </View>
        ) : (
          <ScrollView
            style={styles.summaryScroll}
            showsVerticalScrollIndicator={summaryExpanded}
            scrollEnabled={summaryExpanded}
          >
            <Text style={[styles.commitPreview, { color: theme.colors.text }]}>
              {aiSummary || latestCommit?.message}
            </Text>
          </ScrollView>
        )}
      </Pressable>
    </Animated.View>
  );

  // Always use same structure to avoid layout shifts when transitioning
  return (
    <PanGestureHandler
      onGestureEvent={onGestureEvent}
      onHandlerStateChange={onHandlerStateChange}
      enabled={!swipeDisabled}
    >
      <Pressable style={styles.wrapper} onPress={onPress}>
        {cardContent}
      </Pressable>
    </PanGestureHandler>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    width: '100%',
  },
  container: {
    flex: 1,
    width: '100%',
  },
  swipeIndicator: {
    position: 'absolute',
    top: 100,
    zIndex: 100,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 3,
  },
  seenIndicator: {
    right: 20,
    borderColor: '#888888',
    transform: [{ rotate: '15deg' }],
  },
  saveIndicator: {
    left: 20,
    borderColor: '#44BB44',
    transform: [{ rotate: '-15deg' }],
  },
  undoIndicator: {
    top: '40%',
    alignSelf: 'center',
    left: undefined,
    right: undefined,
    borderColor: '#FF9500',
    transform: [],
  },
  seenUpIndicator: {
    top: undefined,
    bottom: '30%',
    alignSelf: 'center',
    left: undefined,
    right: undefined,
    borderColor: '#888888',
    transform: [],
  },
  swipeIndicatorText: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  hourLabelContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
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
  repoRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  repoName: {
    fontSize: 18,
    fontWeight: '700',
    flex: 1,
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
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoWrapper: {
    width: 120,
    height: 120,
  },
  fileCityImage: {
    width: '100%',
    height: '100%',
  },
  summarySection: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
    overflow: 'hidden',
  },
  summarySectionExpanded: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: '70%',
    flexGrow: 0,
    flexShrink: 0,
    flexBasis: 'auto',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  authorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 6,
  },
  avatarStack: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stackedAvatarContainer: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    overflow: 'hidden',
  },
  stackedAvatar: {
    width: '100%',
    height: '100%',
  },
  stackedAvatarFallback: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stackedAvatarText: {
    fontSize: 9,
    fontWeight: '600',
  },
  authorsText: {
    fontSize: 13,
    flex: 1,
  },
  commitCount: {
    fontSize: 12,
  },
  timeText: {
    fontSize: 11,
  },
  summaryScroll: {
    flex: 1,
  },
  commitPreview: {
    fontSize: 15,
    lineHeight: 22,
  },
  summaryLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
  },
  summaryLoadingText: {
    fontSize: 14,
  },
});

export default SwipeCard;
