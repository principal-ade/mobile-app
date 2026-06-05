/**
 * Bookmarked tab — two segments backed by per-user bookmarked indexes on web-ade.
 *
 * Pattern mirrors `TrailsTabScreen`: lazy-load each segment on first
 * activation, error banner, pull-to-refresh, empty state when the list is
 * zero. Both row types push onto the in-tab detail screen — trails open
 * `TrailDetail`, topics open `TopicDetail`.
 *
 * Snapshot freshness is handled server-side: list reads return snapshots
 * as stored, and the detail-fetch path refreshes them lazily. Gone targets
 * surface as `entry.gone === true` and render dimmed in the row.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  type TextStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { useTheme } from '@principal-ade/industry-theme';
import { LucideIcon } from '../components/LucideIcon';
import { BookmarkedTopicRow } from '../components/Bookmarked/BookmarkedTopicRow';
import { BookmarkedTrailRow } from '../components/Bookmarked/BookmarkedTrailRow';
import { useAuth } from '../hooks/useAuth';
import {
  BookmarksApiError,
  getBookmarkedTopics,
  getBookmarkedTrails,
} from '../services/BookmarksApiService';
import type {
  BookmarkedTopicEntry,
  BookmarkedTrailEntry,
} from '../types/Bookmarks';
import type { BookmarksStackParamList } from '../navigation/types';

type TabKey = 'topics' | 'trails';
type NavProp = StackNavigationProp<BookmarksStackParamList, 'BookmarksHome'>;

export function BookmarkedTopicsTrailsScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavProp>();
  const { token, isAuthenticated, isLoading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<TabKey>('topics');

  // Topics segment state
  const [topicsEntries, setTopicsEntries] = useState<BookmarkedTopicEntry[]>([]);
  const [topicsLoading, setTopicsLoading] = useState(false);
  const [topicsRefreshing, setTopicsRefreshing] = useState(false);
  const [topicsError, setTopicsError] = useState<string | null>(null);
  const [topicsLoadedOnce, setTopicsLoadedOnce] = useState(false);

  // Trails segment state
  const [trailsEntries, setTrailsEntries] = useState<BookmarkedTrailEntry[]>([]);
  const [trailsLoading, setTrailsLoading] = useState(false);
  const [trailsRefreshing, setTrailsRefreshing] = useState(false);
  const [trailsError, setTrailsError] = useState<string | null>(null);
  const [trailsLoadedOnce, setTrailsLoadedOnce] = useState(false);

  const loadTopics = useCallback(
    async (mode: 'initial' | 'refresh' | 'silent') => {
      if (!token) return;
      if (mode === 'initial') setTopicsLoading(true);
      else if (mode === 'refresh') setTopicsRefreshing(true);
      if (mode !== 'silent') setTopicsError(null);
      try {
        const entries = await getBookmarkedTopics(token);
        setTopicsEntries(entries);
        if (mode === 'silent') setTopicsError(null);
      } catch (err) {
        // Silent refreshes don't surface errors — the user didn't ask for
        // them and a transient failure shouldn't replace the data they
        // were already looking at with a banner.
        if (mode !== 'silent') {
          setTopicsError(
            err instanceof BookmarksApiError
              ? err.message
              : 'Could not load your bookmarked topics.',
          );
        }
      } finally {
        if (mode === 'initial') setTopicsLoading(false);
        else if (mode === 'refresh') setTopicsRefreshing(false);
        setTopicsLoadedOnce(true);
      }
    },
    [token],
  );

  const loadTrails = useCallback(
    async (mode: 'initial' | 'refresh' | 'silent') => {
      if (!token) return;
      if (mode === 'initial') setTrailsLoading(true);
      else if (mode === 'refresh') setTrailsRefreshing(true);
      if (mode !== 'silent') setTrailsError(null);
      try {
        const entries = await getBookmarkedTrails(token);
        setTrailsEntries(entries);
        if (mode === 'silent') setTrailsError(null);
      } catch (err) {
        if (mode !== 'silent') {
          setTrailsError(
            err instanceof BookmarksApiError
              ? err.message
              : 'Could not load your bookmarked trails.',
          );
        }
      } finally {
        if (mode === 'initial') setTrailsLoading(false);
        else if (mode === 'refresh') setTrailsRefreshing(false);
        setTrailsLoadedOnce(true);
      }
    },
    [token],
  );

  // Lazy-load each segment on first activation. Keeps initial mount cheap
  // when the user only opens one segment.
  useEffect(() => {
    if (!isAuthenticated || !token) return;
    if (activeTab === 'topics' && !topicsLoadedOnce) {
      void loadTopics('initial');
    } else if (activeTab === 'trails' && !trailsLoadedOnce) {
      void loadTrails('initial');
    }
  }, [
    activeTab,
    isAuthenticated,
    token,
    topicsLoadedOnce,
    trailsLoadedOnce,
    loadTopics,
    loadTrails,
  ]);

  // Refresh-on-focus: the user is the source of new entries (they just
  // tapped the bookmark button on a trail detail), so coming back to this
  // screen with stale data is the common case. Silent mode — no spinner,
  // no banner on failure; the existing entries stay visible until the
  // new fetch lands.
  useFocusEffect(
    useCallback(() => {
      if (!isAuthenticated || !token) return;
      if (topicsLoadedOnce) void loadTopics('silent');
      if (trailsLoadedOnce) void loadTrails('silent');
    }, [
      isAuthenticated,
      token,
      topicsLoadedOnce,
      trailsLoadedOnce,
      loadTopics,
      loadTrails,
    ]),
  );

  const handleTrailRowPress = useCallback(
    (entry: BookmarkedTrailEntry) => {
      navigation.navigate('TrailDetail', { trailId: entry.trailId });
    },
    [navigation],
  );

  const handleTopicRowPress = useCallback(
    (entry: BookmarkedTopicEntry) => {
      navigation.navigate('TopicDetail', { topicId: entry.topicId });
    },
    [navigation],
  );

  // Unauthenticated state — match the empty-state language to the rest of
  // the app's "sign in to see" treatment.
  if (!authLoading && !isAuthenticated) {
    return (
      <EmptyState
        insetsTop={insets.top}
        backgroundColor={theme.colors.background}
        textColor={theme.colors.text}
        subtextColor={theme.colors.textSecondary}
        iconColor={theme.colors.textSecondary}
        iconName="Bookmark"
        title="Sign in to see your bookmarks"
        subtitle="Once you're signed in, topics and trails you bookmark will show up here."
      />
    );
  }

  const isTopics = activeTab === 'topics';
  const tabLoading = isTopics ? topicsLoading : trailsLoading;
  const tabLoadedOnce = isTopics ? topicsLoadedOnce : trailsLoadedOnce;
  const tabError = isTopics ? topicsError : trailsError;
  const tabRefreshing = isTopics ? topicsRefreshing : trailsRefreshing;

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.colors.background, paddingTop: insets.top },
      ]}
    >
      <TabToggle
        active={activeTab}
        onChange={setActiveTab}
        accentColor={theme.colors.accent}
        textColor={theme.colors.text}
        mutedColor={theme.colors.textTertiary}
        borderColor={theme.colors.border}
      />

      {tabError ? (
        <View style={styles.errorBanner}>
          <Text
            style={[
              styles.errorText,
              { color: theme.colors.error ?? '#ef4444' },
            ]}
          >
            {tabError}
          </Text>
        </View>
      ) : null}

      {authLoading || (tabLoading && !tabLoadedOnce) ? (
        <View style={styles.spinnerWrap}>
          <ActivityIndicator color={theme.colors.accent} />
        </View>
      ) : isTopics ? (
        topicsEntries.length === 0 ? (
          <EmptyContent
            iconColor={theme.colors.textSecondary}
            textColor={theme.colors.text}
            subtextColor={theme.colors.textSecondary}
            iconName="Hash"
            title="No bookmarked topics yet"
            subtitle="Topics you bookmark will show up here so you can jump back to them."
          />
        ) : (
          <FlatList
            data={topicsEntries}
            keyExtractor={(item) => item.topicId}
            renderItem={({ item }) => (
              <BookmarkedTopicRow entry={item} onPress={handleTopicRowPress} />
            )}
            refreshControl={
              <RefreshControl
                refreshing={tabRefreshing}
                onRefresh={() => void loadTopics('refresh')}
                tintColor={theme.colors.accent}
              />
            }
          />
        )
      ) : trailsEntries.length === 0 ? (
        <EmptyContent
          iconColor={theme.colors.textSecondary}
          textColor={theme.colors.text}
          subtextColor={theme.colors.textSecondary}
          iconName="Footprints"
          title="No bookmarked trails yet"
          subtitle="Trails you bookmark will show up here so you can come back to them later."
        />
      ) : (
        <FlatList
          data={trailsEntries}
          keyExtractor={(item) => item.trailId}
          renderItem={({ item }) => (
            <BookmarkedTrailRow entry={item} onPress={handleTrailRowPress} />
          )}
          refreshControl={
            <RefreshControl
              refreshing={tabRefreshing}
              onRefresh={() => void loadTrails('refresh')}
              tintColor={theme.colors.accent}
            />
          }
        />
      )}
    </View>
  );
}

interface TabToggleProps {
  active: TabKey;
  onChange: (key: TabKey) => void;
  accentColor: string;
  textColor: string;
  mutedColor: string;
  borderColor: string;
}

const TabToggle: React.FC<TabToggleProps> = ({
  active,
  onChange,
  accentColor,
  textColor,
  mutedColor,
  borderColor,
}) => {
  const items: { key: TabKey; label: string }[] = [
    { key: 'topics', label: 'Topics' },
    { key: 'trails', label: 'Trails' },
  ];
  return (
    <View
      style={[
        styles.toggleRow,
        {
          borderBottomColor: borderColor,
          borderBottomWidth: StyleSheet.hairlineWidth,
        },
      ]}
    >
      {items.map((item) => {
        const isActive = item.key === active;
        const color = isActive ? textColor : mutedColor;
        return (
          <Pressable
            key={item.key}
            onPress={() => onChange(item.key)}
            style={styles.toggleItem}
          >
            <Text
              style={[
                styles.toggleLabel,
                {
                  color,
                  fontWeight: String(
                    isActive ? '600' : '500',
                  ) as TextStyle['fontWeight'],
                },
              ]}
            >
              {item.label}
            </Text>
            <View
              style={[
                styles.toggleUnderline,
                {
                  backgroundColor: isActive ? accentColor : 'transparent',
                },
              ]}
            />
          </Pressable>
        );
      })}
    </View>
  );
};

interface EmptyContentProps {
  iconColor: string;
  textColor: string;
  subtextColor: string;
  iconName: 'Hash' | 'Footprints' | 'Bookmark';
  title: string;
  subtitle: string;
}

const EmptyContent: React.FC<EmptyContentProps> = ({
  iconColor,
  textColor,
  subtextColor,
  iconName,
  title,
  subtitle,
}) => (
  <View style={styles.content}>
    <View style={styles.iconContainer}>
      <LucideIcon name={iconName} size={64} color={iconColor} />
    </View>
    <Text style={[styles.title, { color: textColor }]}>{title}</Text>
    <Text style={[styles.subtitle, { color: subtextColor }]}>{subtitle}</Text>
  </View>
);

interface EmptyStateProps {
  insetsTop: number;
  backgroundColor: string;
  textColor: string;
  subtextColor: string;
  iconColor: string;
  iconName: 'Hash' | 'Footprints' | 'Bookmark';
  title: string;
  subtitle: string;
}

const EmptyState: React.FC<EmptyStateProps> = ({
  insetsTop,
  backgroundColor,
  textColor,
  subtextColor,
  iconColor,
  iconName,
  title,
  subtitle,
}) => (
  <View style={[styles.container, { backgroundColor, paddingTop: insetsTop }]}>
    <EmptyContent
      iconColor={iconColor}
      textColor={textColor}
      subtextColor={subtextColor}
      iconName={iconName}
      title={title}
      subtitle={subtitle}
    />
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  toggleRow: {
    flexDirection: 'row',
  },
  toggleItem: {
    flex: 1,
    paddingTop: 12,
    paddingBottom: 0,
    alignItems: 'center',
  },
  toggleLabel: {
    fontSize: 14,
    paddingBottom: 10,
  },
  toggleUnderline: {
    height: 2,
    alignSelf: 'stretch',
  },
  spinnerWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  iconContainer: {
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    maxWidth: 320,
  },
  errorBanner: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  errorText: {
    fontSize: 12,
  },
});

export default BookmarkedTopicsTrailsScreen;
