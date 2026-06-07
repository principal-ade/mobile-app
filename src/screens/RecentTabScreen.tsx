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
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { useTheme } from '@principal-ade/industry-theme';
import { RecentlyVisitedRow } from '../components/Trails/RecentlyVisitedRow';
import { RecentTrailsCardFeed } from '../components/Trails/RecentTrailsCardFeed';
import {
  EmptyContent,
  EmptyState,
  ScreenHeader,
} from '../components/Trails/TrailListChrome';
import { useRecentTrailsView } from '../context/RecentTrailsViewContext';
import { useAuth } from '../hooks/useAuth';
import {
  getRecentlyVisited,
  TrailsApiError,
  type TrailRecentlyVisitedEntry,
} from '../services/TrailsApiService';
import type { RecentStackParamList } from '../navigation/types';

/**
 * Recently Visited tab — per-user manifest of trails the user has opened.
 *
 * Split out of the Inbox tab into its own tab. Row taps push onto the in-tab
 * TrailDetail screen.
 */
type NavProp = StackNavigationProp<RecentStackParamList, 'RecentHome'>;

export default function RecentTabScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavProp>();
  const { token, user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { viewMode } = useRecentTrailsView();

  const [recentEntries, setRecentEntries] = useState<
    TrailRecentlyVisitedEntry[]
  >([]);
  const [recentLoading, setRecentLoading] = useState(false);
  const [recentRefreshing, setRecentRefreshing] = useState(false);
  const [recentError, setRecentError] = useState<string | null>(null);
  const [recentLoadedOnce, setRecentLoadedOnce] = useState(false);

  const loadRecent = useCallback(
    async (mode: 'initial' | 'refresh') => {
      const githubId = user?.id;
      if (!githubId) return;
      if (mode === 'initial') setRecentLoading(true);
      else setRecentRefreshing(true);
      setRecentError(null);
      try {
        const entries = await getRecentlyVisited(githubId, token ?? undefined);
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

  useEffect(() => {
    if (!isAuthenticated || !token) return;
    if (!recentLoadedOnce && user?.id) {
      void loadRecent('initial');
    }
  }, [isAuthenticated, token, user?.id, recentLoadedOnce, loadRecent]);

  const handleRecentRowPress = useCallback(
    (entry: TrailRecentlyVisitedEntry) => {
      navigation.navigate('TrailDetail', { trailId: entry.id });
    },
    [navigation],
  );

  // Unauthenticated state — mirrors the Inbox tab; the app's auth gate handles
  // the actual sign-in flow elsewhere.
  if (!authLoading && !isAuthenticated) {
    return (
      <EmptyState
        insetsTop={insets.top}
        backgroundColor={theme.colors.background}
        textColor={theme.colors.text}
        subtextColor={theme.colors.textSecondary}
        iconColor={theme.colors.textSecondary}
        title="Sign in to see your trails"
        subtitle="Trails you open will show up here so you can find them again once you're signed in."
      />
    );
  }

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.colors.background, paddingTop: insets.top },
      ]}
    >
      <ScreenHeader
        title="Recently Visited"
        textColor={theme.colors.text}
        borderColor={theme.colors.border}
      />

      {recentError ? (
        <View style={styles.errorBanner}>
          <Text
            style={[
              styles.errorText,
              { color: theme.colors.error ?? '#ef4444' },
            ]}
          >
            {recentError}
          </Text>
        </View>
      ) : null}

      {authLoading || (recentLoading && !recentLoadedOnce) ? (
        <View style={styles.spinnerWrap}>
          <ActivityIndicator color={theme.colors.accent} />
        </View>
      ) : recentEntries.length === 0 ? (
        <EmptyContent
          iconColor={theme.colors.textSecondary}
          textColor={theme.colors.text}
          subtextColor={theme.colors.textSecondary}
          title="Nothing here yet"
          subtitle="Trails you open from a shared link or your inbox will show up here so you can find them again."
        />
      ) : viewMode === 'cards' ? (
        <RecentTrailsCardFeed
          entries={recentEntries}
          token={token ?? undefined}
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
              refreshing={recentRefreshing}
              onRefresh={() => void loadRecent('refresh')}
              tintColor={theme.colors.accent}
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  spinnerWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorBanner: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  errorText: {
    fontSize: 12,
  },
});
