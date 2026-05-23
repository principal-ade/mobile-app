import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  type TextStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { useTheme } from '@principal-ade/industry-theme';
import { LucideIcon } from '../components/LucideIcon';
import { InboxRow } from '../components/Trails/InboxRow';
import { RecentlyVisitedRow } from '../components/Trails/RecentlyVisitedRow';
import { useAuth } from '../hooks/useAuth';
import {
  getInbox,
  getRecentlyVisited,
  markInboxRead,
  TrailsApiError,
  type TrailRecentlyVisitedEntry,
} from '../services/TrailsApiService';
import type { InboxIndexEntry } from '../types/Inbox';
import type { TrailsStackParamList } from '../navigation/types';

/**
 * Trails tab — landing surface for the signed-in user's trails activity.
 *
 * Toggles between two sources:
 *   - Inbox: trails someone sent the user via /api/trails/.../send.
 *   - Recently Visited: per-user manifest of trails the user has opened.
 *
 * The toggle lives in the screen header; row taps in either mode push
 * onto the in-tab TrailDetail screen.
 */
type TabKey = 'inbox' | 'recent';
type NavProp = StackNavigationProp<TrailsStackParamList, 'TrailsHome'>;

export default function TrailsTabScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavProp>();
  const { token, user, isAuthenticated, isLoading: authLoading } = useAuth();

  const [activeTab, setActiveTab] = useState<TabKey>('inbox');

  // Inbox state
  const [inboxEntries, setInboxEntries] = useState<InboxIndexEntry[]>([]);
  const [inboxLoading, setInboxLoading] = useState(false);
  const [inboxRefreshing, setInboxRefreshing] = useState(false);
  const [inboxError, setInboxError] = useState<string | null>(null);
  const [inboxLoadedOnce, setInboxLoadedOnce] = useState(false);

  // Recently visited state
  const [recentEntries, setRecentEntries] = useState<
    TrailRecentlyVisitedEntry[]
  >([]);
  const [recentLoading, setRecentLoading] = useState(false);
  const [recentRefreshing, setRecentRefreshing] = useState(false);
  const [recentError, setRecentError] = useState<string | null>(null);
  const [recentLoadedOnce, setRecentLoadedOnce] = useState(false);

  const loadInbox = useCallback(
    async (mode: 'initial' | 'refresh') => {
      if (!token) return;
      if (mode === 'initial') setInboxLoading(true);
      else setInboxRefreshing(true);
      setInboxError(null);
      try {
        const response = await getInbox(token);
        setInboxEntries(response.entries);
      } catch (err) {
        setInboxError(
          err instanceof TrailsApiError
            ? err.message
            : 'Could not load your trails inbox.',
        );
      } finally {
        if (mode === 'initial') setInboxLoading(false);
        else setInboxRefreshing(false);
        setInboxLoadedOnce(true);
      }
    },
    [token],
  );

  const loadRecent = useCallback(
    async (mode: 'initial' | 'refresh') => {
      const githubId = user?.id;
      if (!githubId) return;
      if (mode === 'initial') setRecentLoading(true);
      else setRecentRefreshing(true);
      setRecentError(null);
      try {
        const entries = await getRecentlyVisited(
          githubId,
          token ?? undefined,
        );
        setRecentEntries(entries);
      } catch (err) {
        setRecentError(
          err instanceof TrailsApiError
            ? err.message
            : 'Could not load recently visited trails.',
        );
      } finally {
        if (mode === 'initial') setRecentLoading(false);
        else setRecentRefreshing(false);
        setRecentLoadedOnce(true);
      }
    },
    [token, user?.id],
  );

  // Lazy-load each tab on first activation rather than upfront — keeps
  // the initial mount cheap if the user lands on inbox and never flips
  // the toggle.
  useEffect(() => {
    if (!isAuthenticated || !token) return;
    if (activeTab === 'inbox' && !inboxLoadedOnce) {
      void loadInbox('initial');
    } else if (activeTab === 'recent' && !recentLoadedOnce && user?.id) {
      void loadRecent('initial');
    }
  }, [
    activeTab,
    isAuthenticated,
    token,
    user?.id,
    inboxLoadedOnce,
    recentLoadedOnce,
    loadInbox,
    loadRecent,
  ]);

  const handleInboxRowPress = useCallback(
    (entry: InboxIndexEntry) => {
      if (entry.readAt === null && token) {
        const optimisticReadAt = new Date().toISOString();
        setInboxEntries((prev) =>
          prev.map((e) =>
            e.trailId === entry.trailId
              ? { ...e, readAt: optimisticReadAt }
              : e,
          ),
        );
        markInboxRead(entry.trailId, token).catch(() => {
          setInboxEntries((prev) =>
            prev.map((e) =>
              e.trailId === entry.trailId ? { ...e, readAt: null } : e,
            ),
          );
        });
      }
      navigation.navigate('TrailDetail', { trailId: entry.trailId });
    },
    [navigation, token],
  );

  const handleRecentRowPress = useCallback(
    (entry: TrailRecentlyVisitedEntry) => {
      navigation.navigate('TrailDetail', { trailId: entry.id });
    },
    [navigation],
  );

  // Unauthenticated state — keep the original landing copy. We don't
  // surface a "sign in" CTA from here because the app's auth gate handles
  // that flow elsewhere.
  if (!authLoading && !isAuthenticated) {
    return (
      <EmptyState
        insetsTop={insets.top}
        backgroundColor={theme.colors.background}
        textColor={theme.colors.text}
        subtextColor={theme.colors.textSecondary}
        iconColor={theme.colors.textSecondary}
        title="Sign in to see your trails"
        subtitle="Trails are authored walkthroughs of a codebase. Once you're signed in, anything someone shares with you lands here."
      />
    );
  }

  const isInbox = activeTab === 'inbox';
  const tabLoading = isInbox ? inboxLoading : recentLoading;
  const tabLoadedOnce = isInbox ? inboxLoadedOnce : recentLoadedOnce;
  const tabError = isInbox ? inboxError : recentError;
  const tabRefreshing = isInbox ? inboxRefreshing : recentRefreshing;

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
      ) : isInbox ? (
        inboxEntries.length === 0 ? (
          <EmptyContent
            iconColor={theme.colors.textSecondary}
            textColor={theme.colors.text}
            subtextColor={theme.colors.textSecondary}
            title="All caught up"
            subtitle="No trails waiting on you right now. When someone shares one, it'll land here."
          />
        ) : (
          <FlatList
            data={inboxEntries}
            keyExtractor={(item) => item.trailId}
            renderItem={({ item }) => (
              <InboxRow entry={item} onPress={handleInboxRowPress} />
            )}
            refreshControl={
              <RefreshControl
                refreshing={tabRefreshing}
                onRefresh={() => void loadInbox('refresh')}
                tintColor={theme.colors.accent}
              />
            }
          />
        )
      ) : recentEntries.length === 0 ? (
        <EmptyContent
          iconColor={theme.colors.textSecondary}
          textColor={theme.colors.text}
          subtextColor={theme.colors.textSecondary}
          title="Nothing here yet"
          subtitle="Trails you open from a shared link or your inbox will show up here so you can find them again."
        />
      ) : (
        <FlatList
          data={recentEntries}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <RecentlyVisitedRow entry={item} onPress={handleRecentRowPress} />
          )}
          refreshControl={
            <RefreshControl
              refreshing={tabRefreshing}
              onRefresh={() => void loadRecent('refresh')}
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
    { key: 'inbox', label: 'Inbox' },
    { key: 'recent', label: 'Recently Visited' },
  ];
  return (
    <View
      style={[
        styles.toggleRow,
        { borderBottomColor: borderColor, borderBottomWidth: StyleSheet.hairlineWidth },
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
  title: string;
  subtitle: string;
}

const EmptyContent: React.FC<EmptyContentProps> = ({
  iconColor,
  textColor,
  subtextColor,
  title,
  subtitle,
}) => (
  <View style={styles.content}>
    <View style={styles.iconContainer}>
      <LucideIcon name="Footprints" size={64} color={iconColor} />
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
  title: string;
  subtitle: string;
}

const EmptyState: React.FC<EmptyStateProps> = ({
  insetsTop,
  backgroundColor,
  textColor,
  subtextColor,
  iconColor,
  title,
  subtitle,
}) => (
  <View
    style={[styles.container, { backgroundColor, paddingTop: insetsTop }]}
  >
    <EmptyContent
      iconColor={iconColor}
      textColor={textColor}
      subtextColor={subtextColor}
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
