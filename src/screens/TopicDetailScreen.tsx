/**
 * Topic detail screen — read + star + share view of a curated topic.
 *
 * Mirrors the read half of `web-ade/src/app/topic/[id]/page.tsx`: title,
 * author, markdown description, and an ordered list of trail summary
 * cards. Trail rows tap through to `TrailDetail` in the same stack;
 * Starred and Search both register `TrailDetail` so the route is always
 * reachable from here.
 *
 * Reached from:
 *   - Starred tab → topic row
 *   - Search tab clipboard double-tap on a `/topic/<id>` URL
 *   - Deep link  `principal-ai://…/topic/<id>`
 */

import React from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import Svg, { Polygon } from 'react-native-svg';
import type { StackScreenProps } from '@react-navigation/stack';
import { useTheme } from '@principal-ade/industry-theme';

import { IndustryMarkdownInline } from '../components/IndustryMarkdown';
import { LucideIcon } from '../components/LucideIcon';
import { useAuth } from '../hooks/useAuth';
import {
  getTopicById,
  TopicsApiError,
} from '../services/TopicsApiService';
import {
  getTrailById,
  TrailsApiError,
} from '../services/TrailsApiService';
import { starTopic, unstarTopic } from '../services/StarsApiService';
import { apiConfig } from '../utils/config';
import type { StarredStackParamList } from '../navigation/types';
import type { GetTopicResponse } from '../types/Topic';
import type { SharedTrailIndexEntry } from '../types/Inbox';

type Props = StackScreenProps<StarredStackParamList, 'TopicDetail'>;

// Web copy of the URL keeps the share link consistent across surfaces.
// `apiConfig.baseUrl` ends in `/api`; strip it so we get the user-facing
// origin to prefix `/topic/<id>` with.
const WEB_ORIGIN = apiConfig.baseUrl.replace(/\/api\/?$/, '');
const COPY_FEEDBACK_MS = 1500;

interface TrailFetchResult {
  state: 'loading' | 'ok' | 'error';
  entry?: SharedTrailIndexEntry;
  owner?: string;
  repo?: string;
  errorMessage?: string;
}

export const TopicDetailScreen: React.FC<Props> = ({ navigation, route }) => {
  const { topicId } = route.params;
  const { theme } = useTheme();
  const { token } = useAuth();

  const [state, setState] = React.useState<
    | { status: 'loading' }
    | { status: 'ok'; data: GetTopicResponse }
    | { status: 'error'; message: string }
  >({ status: 'loading' });

  // Per-trail summary fetches keyed by trail id. The web page does the
  // same fan-out; topics are curated lists (small N) so a parallel set of
  // requests on mount is fine without batching.
  const [trailResults, setTrailResults] = React.useState<
    Record<string, TrailFetchResult>
  >({});

  // Tracks an in-flight star/unstar so the toggle can't double-fire while
  // the optimistic update is reconciling.
  const [starInFlight, setStarInFlight] = React.useState(false);
  const [shareCopied, setShareCopied] = React.useState(false);

  // ---- Load topic ---------------------------------------------------------
  React.useEffect(() => {
    let cancelled = false;
    setState({ status: 'loading' });
    setTrailResults({});
    getTopicById(topicId, token ?? undefined)
      .then((data) => {
        if (cancelled) return;
        setState({ status: 'ok', data });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const message =
          err instanceof TopicsApiError
            ? err.message
            : err instanceof Error
              ? err.message
              : 'Unable to load topic';
        setState({ status: 'error', message });
      });
    return () => {
      cancelled = true;
    };
  }, [topicId, token]);

  // ---- Load each trail summary -------------------------------------------
  const trailIdsKey =
    state.status === 'ok' ? state.data.topic.trailIds.join(',') : '';
  React.useEffect(() => {
    if (state.status !== 'ok') return;
    const ids = state.data.topic.trailIds;
    if (ids.length === 0) return;
    let cancelled = false;
    setTrailResults((prev) => {
      const next = { ...prev };
      for (const tid of ids) {
        if (!(tid in next)) next[tid] = { state: 'loading' };
      }
      return next;
    });
    for (const tid of ids) {
      getTrailById(tid, token ?? undefined)
        .then((data) => {
          if (cancelled) return;
          setTrailResults((prev) => ({
            ...prev,
            [tid]: {
              state: 'ok',
              entry: data.entry,
              owner: data.owner,
              repo: data.repo,
            },
          }));
        })
        .catch((err: unknown) => {
          if (cancelled) return;
          const message =
            err instanceof TrailsApiError
              ? err.message
              : err instanceof Error
                ? err.message
                : 'Trail unavailable';
          setTrailResults((prev) => ({
            ...prev,
            [tid]: { state: 'error', errorMessage: message },
          }));
        });
    }
    return () => {
      cancelled = true;
    };
    // trailIdsKey changes when the ordered list changes; covers the
    // reload-after-error case without a deep-compare on the array.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trailIdsKey, token]);

  // ---- Star toggle --------------------------------------------------------
  const isStarred = state.status === 'ok' ? state.data.starred : false;
  const canStar = state.status === 'ok' && !!token;

  const toggleStar = React.useCallback(async () => {
    if (state.status !== 'ok' || !token || starInFlight) return;
    const previous = state.data.starred;
    // Optimistic flip — revert on failure. Star toggles are idempotent on
    // the server so a failed call leaves the index untouched.
    setState({ status: 'ok', data: { ...state.data, starred: !previous } });
    setStarInFlight(true);
    try {
      if (previous) {
        await unstarTopic(topicId, token);
      } else {
        await starTopic(topicId, token);
      }
    } catch {
      setState((s) =>
        s.status === 'ok'
          ? { status: 'ok', data: { ...s.data, starred: previous } }
          : s,
      );
    } finally {
      setStarInFlight(false);
    }
  }, [state, token, topicId, starInFlight]);

  // ---- Share --------------------------------------------------------------
  const handleShare = React.useCallback(async () => {
    const url = `${WEB_ORIGIN}/topic/${topicId}`;
    try {
      await Clipboard.setStringAsync(url);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), COPY_FEEDBACK_MS);
    } catch {
      // Clipboard denied — fail quietly to match the web behavior.
    }
  }, [topicId]);

  // ---- Header buttons -----------------------------------------------------
  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View style={styles.headerRight}>
          <Pressable
            onPress={() => void handleShare()}
            hitSlop={12}
            style={({ pressed }) => [
              styles.headerButton,
              { opacity: pressed ? 0.5 : 1 },
            ]}
            accessibilityLabel="Copy topic link"
            accessibilityRole="button"
          >
            <LucideIcon
              name={shareCopied ? 'Check' : 'Link'}
              size={20}
              color={
                shareCopied ? theme.colors.accent : theme.colors.textSecondary
              }
            />
          </Pressable>
          {canStar ? (
            <Pressable
              onPress={() => void toggleStar()}
              hitSlop={12}
              disabled={starInFlight}
              style={({ pressed }) => [
                styles.headerButton,
                { opacity: pressed || starInFlight ? 0.5 : 1 },
              ]}
              accessibilityLabel={isStarred ? 'Unstar topic' : 'Star topic'}
              accessibilityRole="button"
            >
              <StarIcon
                size={22}
                color={
                  isStarred
                    ? theme.colors.accent
                    : theme.colors.textSecondary
                }
                filled={isStarred}
              />
            </Pressable>
          ) : null}
        </View>
      ),
    });
  }, [
    navigation,
    canStar,
    isStarred,
    starInFlight,
    shareCopied,
    toggleStar,
    handleShare,
    theme.colors.accent,
    theme.colors.textSecondary,
  ]);

  // ---- Render -------------------------------------------------------------
  if (state.status === 'loading') {
    return (
      <View
        style={[styles.center, { backgroundColor: theme.colors.background }]}
      >
        <ActivityIndicator color={theme.colors.text} />
      </View>
    );
  }

  if (state.status === 'error') {
    return (
      <View
        style={[
          styles.center,
          { backgroundColor: theme.colors.background, padding: 24 },
        ]}
      >
        <Text
          style={{
            color: theme.colors.text,
            fontFamily: theme.fonts.body,
            fontSize: theme.fontSizes[2],
            textAlign: 'center',
          }}
        >
          {state.message}
        </Text>
      </View>
    );
  }

  const { topic } = state.data;
  const trailCount = topic.trailIds.length;
  const trailCountLabel =
    trailCount === 1 ? '1 TRAIL' : `${trailCount} TRAILS`;

  return (
    <ScrollView
      style={{ backgroundColor: theme.colors.background }}
      contentContainerStyle={styles.scrollContent}
    >
      <Text
        style={[
          styles.title,
          {
            color: theme.colors.primary,
            fontFamily: theme.fonts.heading,
          },
        ]}
      >
        {topic.title}
      </Text>

      <View style={styles.authorRow}>
        <Image
          source={{
            uri: `https://avatars.githubusercontent.com/u/${topic.createdBy.githubId}?v=4`,
          }}
          style={[styles.avatar, { borderColor: theme.colors.border }]}
        />
        <Text
          style={[
            styles.byline,
            { color: theme.colors.textSecondary, fontFamily: theme.fonts.body },
          ]}
        >
          by{' '}
          <Text style={{ color: theme.colors.text }}>
            @{topic.createdBy.githubLogin}
          </Text>
        </Text>
      </View>

      {topic.description ? (
        <View style={styles.descriptionWrap}>
          <IndustryMarkdownInline>{topic.description}</IndustryMarkdownInline>
        </View>
      ) : null}

      <View style={styles.sectionHeader}>
        <Text
          style={[
            styles.sectionTitle,
            { color: theme.colors.text, fontFamily: theme.fonts.body },
          ]}
        >
          Code Trails
        </Text>
        <Text
          style={[
            styles.sectionCount,
            {
              color: theme.colors.textTertiary,
              fontFamily: theme.fonts.monospace,
            },
          ]}
        >
          {trailCountLabel}
        </Text>
      </View>

      {trailCount === 0 ? (
        <Text
          style={[
            styles.empty,
            {
              color: theme.colors.textTertiary,
              fontFamily: theme.fonts.body,
            },
          ]}
        >
          No trails attached yet.
        </Text>
      ) : (
        topic.trailIds.map((tid) => (
          <TrailCard
            key={tid}
            trailId={tid}
            result={trailResults[tid]}
            onPress={() => navigation.navigate('TrailDetail', { trailId: tid })}
          />
        ))
      )}
    </ScrollView>
  );
};

interface TrailCardProps {
  trailId: string;
  result: TrailFetchResult | undefined;
  onPress: () => void;
}

const TrailCard: React.FC<TrailCardProps> = ({ trailId, result, onPress }) => {
  const { theme } = useTheme();
  const state = result?.state ?? 'loading';

  return (
    <Pressable
      onPress={onPress}
      // Loaded-or-error trails still navigate (TrailDetail handles its own
      // load), but mid-fetch we suppress the tap so the user can't jump
      // before we even know the id maps to anything.
      disabled={state === 'loading'}
      accessibilityRole="button"
      accessibilityLabel={
        result?.entry?.title ?? `Open trail ${trailId.slice(0, 8)}`
      }
      style={({ pressed }) => [
        styles.trailCard,
        {
          backgroundColor:
            theme.colors.backgroundSecondary ?? theme.colors.background,
          borderColor: theme.colors.border,
          opacity: pressed ? 0.7 : 1,
        },
      ]}
    >
      {state === 'loading' ? (
        <View style={styles.trailRow}>
          <ActivityIndicator size="small" color={theme.colors.textSecondary} />
          <Text
            style={[
              styles.trailMuted,
              {
                color: theme.colors.textTertiary,
                fontFamily: theme.fonts.body,
              },
            ]}
          >
            Loading trail…
          </Text>
        </View>
      ) : state === 'ok' && result?.entry ? (
        <View>
          <Text
            style={[
              styles.trailTitle,
              { color: theme.colors.text, fontFamily: theme.fonts.body },
            ]}
            numberOfLines={2}
          >
            {result.entry.title}
          </Text>
          {result.owner && result.repo ? (
            <Text
              style={[
                styles.trailMeta,
                {
                  color: theme.colors.textTertiary,
                  fontFamily: theme.fonts.monospace,
                },
              ]}
              numberOfLines={1}
            >
              {result.owner}/{result.repo}
            </Text>
          ) : null}
        </View>
      ) : (
        <Text
          style={[
            styles.trailMuted,
            { color: theme.colors.text, fontFamily: theme.fonts.body },
          ]}
        >
          Trail {trailId.slice(0, 8)}… unavailable
          {result?.errorMessage ? ` — ${result.errorMessage}` : ''}
        </Text>
      )}
    </Pressable>
  );
};

/**
 * Header star icon — supports a filled state, which the shared `LucideIcon`
 * doesn't (it hardcodes `fill: 'none'`). Same path as the Lucide Star, just
 * with a togglable fill so the active state reads at a glance. Copied from
 * TrailDetailScreen so both detail headers behave identically.
 */
const STAR_POINTS =
  '12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2';

const StarIcon: React.FC<{ size: number; color: string; filled: boolean }> = ({
  size,
  color,
  filled,
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Polygon
      points={STAR_POINTS}
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      fill={filled ? color : 'none'}
    />
  </Svg>
);

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 30,
  },
  authorRow: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
  byline: {
    fontSize: 13,
  },
  descriptionWrap: {
    marginTop: 16,
  },
  sectionHeader: {
    marginTop: 24,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  sectionCount: {
    fontSize: 11,
    letterSpacing: 0.5,
  },
  empty: {
    fontSize: 13,
    fontStyle: 'italic',
  },
  trailCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  trailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  trailTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  trailMeta: {
    marginTop: 4,
    fontSize: 11,
    letterSpacing: 0.4,
  },
  trailMuted: {
    fontSize: 13,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerButton: {
    paddingHorizontal: 12,
    justifyContent: 'center',
  },
});

export default TopicDetailScreen;
