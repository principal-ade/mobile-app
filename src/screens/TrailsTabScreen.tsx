import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@principal-ade/industry-theme';
import { LucideIcon } from '../components/LucideIcon';
import { InboxRow } from '../components/Trails/InboxRow';
import { useAuth } from '../hooks/useAuth';
import { getInbox, markInboxRead, TrailsApiError } from '../services/TrailsApiService';
import type { InboxIndexEntry } from '../types/Inbox';

/**
 * Trails tab — landing surface for received trails.
 *
 * Fetches the recipient's inbox on mount and on pull-to-refresh. Each row
 * is a trail someone sent the signed-in user via `POST /api/trails/by-id/{id}/send`.
 *
 * Tapping a row marks it read; the trail-detail screen is a follow-up slice,
 * so the tap currently just clears the unread dot without navigating away.
 */
export default function TrailsTabScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { token, isAuthenticated, isLoading: authLoading } = useAuth();

  const [entries, setEntries] = useState<InboxIndexEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

  const loadInbox = useCallback(
    async (mode: 'initial' | 'refresh') => {
      if (!token) return;
      if (mode === 'initial') setIsLoading(true);
      else setIsRefreshing(true);
      setError(null);
      try {
        const response = await getInbox(token);
        setEntries(response.entries);
      } catch (err) {
        if (err instanceof TrailsApiError) {
          setError(err.message);
        } else {
          setError('Could not load your trails inbox.');
        }
      } finally {
        if (mode === 'initial') setIsLoading(false);
        else setIsRefreshing(false);
        setHasLoadedOnce(true);
      }
    },
    [token],
  );

  useEffect(() => {
    if (isAuthenticated && token && !hasLoadedOnce) {
      void loadInbox('initial');
    }
  }, [isAuthenticated, token, hasLoadedOnce, loadInbox]);

  const handleRowPress = useCallback(
    (entry: InboxIndexEntry) => {
      if (entry.readAt !== null || !token) return;
      // Optimistic mark-read; revert on failure so the dot reappears.
      const optimisticReadAt = new Date().toISOString();
      setEntries((prev) =>
        prev.map((e) =>
          e.trailId === entry.trailId ? { ...e, readAt: optimisticReadAt } : e,
        ),
      );
      markInboxRead(entry.trailId, token).catch(() => {
        setEntries((prev) =>
          prev.map((e) =>
            e.trailId === entry.trailId ? { ...e, readAt: null } : e,
          ),
        );
      });
    },
    [token],
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

  if (authLoading || (isLoading && !hasLoadedOnce)) {
    return (
      <View
        style={[
          styles.container,
          {
            backgroundColor: theme.colors.background,
            paddingTop: insets.top,
            alignItems: 'center',
            justifyContent: 'center',
          },
        ]}
      >
        <ActivityIndicator color={theme.colors.accent} />
      </View>
    );
  }

  if (entries.length === 0) {
    return (
      <View
        style={[
          styles.container,
          {
            backgroundColor: theme.colors.background,
            paddingTop: insets.top,
          },
        ]}
      >
        {error ? (
          <View style={styles.errorBanner}>
            <Text
              style={[styles.errorText, { color: theme.colors.error ?? '#ef4444' }]}
            >
              {error}
            </Text>
          </View>
        ) : null}
        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <LucideIcon
              name="Footprints"
              size={64}
              color={theme.colors.textSecondary}
            />
          </View>
          <Text style={[styles.title, { color: theme.colors.text }]}>
            No trails yet
          </Text>
          <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
            Trails are authored walkthroughs of a codebase. When someone
            shares one with you, it will land here.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.colors.background, paddingTop: insets.top },
      ]}
    >
      {error ? (
        <View style={styles.errorBanner}>
          <Text
            style={[styles.errorText, { color: theme.colors.error ?? '#ef4444' }]}
          >
            {error}
          </Text>
        </View>
      ) : null}
      <FlatList
        data={entries}
        keyExtractor={(item) => item.trailId}
        renderItem={({ item }) => (
          <InboxRow entry={item} onPress={handleRowPress} />
        )}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => void loadInbox('refresh')}
            tintColor={theme.colors.accent}
          />
        }
      />
    </View>
  );
}

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
    <View style={styles.content}>
      <View style={styles.iconContainer}>
        <LucideIcon name="Footprints" size={64} color={iconColor} />
      </View>
      <Text style={[styles.title, { color: textColor }]}>{title}</Text>
      <Text style={[styles.subtitle, { color: subtextColor }]}>{subtitle}</Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
