import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  Pressable,
  Animated,
  Dimensions,
} from 'react-native';
import { PanGestureHandler, PanGestureHandlerGestureEvent, State } from 'react-native-gesture-handler';
import { useTheme } from '@principal-ade/industry-theme';
import { Logo } from '../Logo';
import type { RepoActivitySummary } from '../../types/activity';

const SCREEN_WIDTH = Dimensions.get('window').width;
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
}: SwipeCardProps) {
  const { theme } = useTheme();
  const [avatarError, setAvatarError] = useState(false);
  const [fileCityLoaded, setFileCityLoaded] = useState(false);
  const [fileCityError, setFileCityError] = useState(false);

  // Animation values
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const isAnimating = useRef(false);

  const authors = getUniqueAuthors(summary.commits);
  const latestCommit = summary.commits[0];

  // File City image URL (no commit param - static view)
  const fileCityImageUrl = `https://app.principal-ade.com/api/file-city/${summary.owner}/${summary.repo}?width=800&height=800`;

  // Swipe handlers
  const resetPosition = useCallback(() => {
    Animated.parallel([
      Animated.spring(translateX, {
        toValue: 0,
        useNativeDriver: true,
        friction: 5,
      }),
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        friction: 5,
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

  const swipeUp = useCallback(() => {
    if (isAnimating.current) return;
    isAnimating.current = true;

    Animated.timing(translateY, {
      toValue: -300,
      duration: 200,
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

      // Determine if horizontal or vertical swipe based on initial direction
      if (Math.abs(tx) > Math.abs(ty)) {
        translateX.setValue(tx);
        translateY.setValue(0);
      } else {
        // Allow both up and down swipes
        translateY.setValue(ty);
        translateX.setValue(0);
      }
    },
    [swipeDisabled, translateX, translateY]
  );

  const onHandlerStateChange = useCallback(
    (event: PanGestureHandlerGestureEvent) => {
      if (swipeDisabled || isAnimating.current) return;

      if (event.nativeEvent.state === State.END) {
        const { translationX, translationY, velocityX, velocityY } = event.nativeEvent;

        // Check for swipe up (seen)
        if (translationY < -SWIPE_DOWN_THRESHOLD || velocityY < -500) {
          swipeUp();
        }
        // Check for swipe down (undo)
        else if (translationY > SWIPE_DOWN_THRESHOLD || velocityY > 500) {
          swipeDown();
        }
        // Check for horizontal swipes
        else if (translationX < -SWIPE_THRESHOLD || velocityX < -500) {
          swipeOut('left');
        } else if (translationX > SWIPE_THRESHOLD || velocityX > 500) {
          swipeOut('right');
        } else {
          resetPosition();
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
        !swipeDisabled && {
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
          <Text
            style={[styles.repoName, { color: theme.colors.text }]}
            numberOfLines={1}
          >
            {summary.repo}
          </Text>
          <Text style={[styles.repoMeta, { color: theme.colors.textSecondary }]}>
            {summary.owner} · {summary.commitCount} commit
            {summary.commitCount !== 1 ? 's' : ''}
          </Text>
        </View>
      </View>

      {/* Authors row */}
      <View style={[styles.authorsRow, { backgroundColor: theme.colors.surface }]}>
        <View style={styles.avatarStack}>
          {authors.map((author, index) => (
            <View
              key={author.login}
              style={[
                styles.stackedAvatarContainer,
                {
                  marginLeft: index > 0 ? -8 : 0,
                  zIndex: authors.length - index,
                  borderColor: theme.colors.surface,
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
        <Text style={[styles.authorsText, { color: theme.colors.textSecondary }]}>
          {authors.length === 1
            ? authors[0]?.login
            : `${authors[0]?.login} and ${authors.length - 1} other${authors.length > 2 ? 's' : ''}`}
        </Text>
        <Text style={[styles.timeText, { color: theme.colors.textSecondary }]}>
          {formatRelativeTime(new Date(summary.latestCommitAt))}
        </Text>
      </View>

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

      {/* Summary Footer */}
      <View style={[styles.summarySection, { backgroundColor: theme.colors.surface }]}>
        {/* Latest commit preview */}
        {latestCommit && (
          <Text
            style={[styles.commitPreview, { color: theme.colors.text }]}
            numberOfLines={2}
          >
            {latestCommit.message}
          </Text>
        )}

        {/* Tap hint */}
        <Text style={[styles.tapHint, { color: theme.colors.textSecondary }]}>
          {swipeDisabled ? 'Tap for details' : 'Swipe or tap for details'}
        </Text>
      </View>
    </Animated.View>
  );

  // Wrap with gesture handler if swipe is enabled
  if (swipeDisabled) {
    return (
      <Pressable style={styles.wrapper} onPress={onPress}>
        {cardContent}
      </Pressable>
    );
  }

  return (
    <PanGestureHandler
      onGestureEvent={onGestureEvent}
      onHandlerStateChange={onHandlerStateChange}
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
  summarySection: {
    flex: 1,
    padding: 16,
    justifyContent: 'space-between',
  },
  authorsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  avatarStack: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stackedAvatarContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
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
    fontSize: 11,
    fontWeight: '600',
  },
  authorsText: {
    flex: 1,
    fontSize: 13,
  },
  timeText: {
    fontSize: 12,
  },
  commitPreview: {
    fontSize: 15,
    lineHeight: 22,
    marginTop: 12,
  },
  tapHint: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 12,
  },
});

export default SwipeCard;
