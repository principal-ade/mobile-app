import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { useTheme } from '@principal-ade/industry-theme';
import { InboxRow } from '../components/Trails/InboxRow';
import {
  EmptyContent,
  EmptyState,
  ScreenHeader,
} from '../components/Trails/TrailListChrome';
import { useAuth } from '../hooks/useAuth';
import {
  getInbox,
  markInboxRead,
  deleteInboxEntry,
  TrailsApiError,
} from '../services/TrailsApiService';
import {
  getSkipInboxDeleteConfirm,
  setSkipInboxDeleteConfirm,
} from '../utils/inboxPrefs';
import type { InboxIndexEntry } from '../types/Inbox';
import type { TrailsStackParamList } from '../navigation/types';

/**
 * Inbox tab — trails someone sent the user via /api/trails/.../send.
 *
 * Recently Visited used to share this screen behind a toggle; it now lives on
 * its own tab (see RecentTabScreen). Row taps push onto the in-tab TrailDetail
 * screen.
 */
type NavProp = StackNavigationProp<TrailsStackParamList, 'TrailsHome'>;

export default function TrailsTabScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavProp>();
  const { token, isAuthenticated, isLoading: authLoading } = useAuth();

  const [inboxEntries, setInboxEntries] = useState<InboxIndexEntry[]>([]);
  const [inboxLoading, setInboxLoading] = useState(false);
  const [inboxRefreshing, setInboxRefreshing] = useState(false);
  const [inboxError, setInboxError] = useState<string | null>(null);
  const [inboxLoadedOnce, setInboxLoadedOnce] = useState(false);
  const [skipDeleteConfirm, setSkipDeleteConfirm] = useState(false);

  // Load the "don't ask again" preference once on mount.
  useEffect(() => {
    void getSkipInboxDeleteConfirm().then(setSkipDeleteConfirm);
  }, []);

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

  useEffect(() => {
    if (!isAuthenticated || !token) return;
    if (!inboxLoadedOnce) {
      void loadInbox('initial');
    }
  }, [isAuthenticated, token, inboxLoadedOnce, loadInbox]);

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

  // Optimistically drop the row, then fire the server delete; restore on
  // failure so the inbox never silently loses an entry.
  const performDelete = useCallback(
    (entry: InboxIndexEntry) => {
      if (!token) return;
      setInboxError(null);
      let restore: InboxIndexEntry[] = [];
      setInboxEntries((prev) => {
        restore = prev;
        return prev.filter((e) => e.trailId !== entry.trailId);
      });
      deleteInboxEntry(entry.trailId, token).catch(() => {
        setInboxEntries(restore);
        setInboxError('Could not remove that trail. Pull to refresh and try again.');
      });
    },
    [token],
  );

  const handleRequestDelete = useCallback(
    (entry: InboxIndexEntry, close: () => void) => {
      if (skipDeleteConfirm) {
        performDelete(entry);
        return;
      }
      Alert.alert(
        'Remove from inbox?',
        `"${entry.snapshot.title}" will be removed from your inbox.`,
        [
          { text: 'Cancel', style: 'cancel', onPress: close },
          {
            text: 'Remove',
            style: 'destructive',
            onPress: () => performDelete(entry),
          },
          {
            text: "Remove, don't ask again",
            style: 'destructive',
            onPress: () => {
              setSkipDeleteConfirm(true);
              void setSkipInboxDeleteConfirm(true);
              performDelete(entry);
            },
          },
        ],
        // Treat an outside-tap / back dismissal as a cancel so the row resets.
        { cancelable: true, onDismiss: close },
      );
    },
    [skipDeleteConfirm, performDelete],
  );

  // Unauthenticated state — keep the original landing copy. We don't surface a
  // "sign in" CTA from here because the app's auth gate handles that flow
  // elsewhere.
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

  return (
    <GestureHandlerRootView
      style={[
        styles.container,
        { backgroundColor: theme.colors.background, paddingTop: insets.top },
      ]}
    >
      <ScreenHeader
        title="Inbox"
        textColor={theme.colors.text}
        borderColor={theme.colors.border}
      />

      {inboxError ? (
        <View style={styles.errorBanner}>
          <Text
            style={[
              styles.errorText,
              { color: theme.colors.error ?? '#ef4444' },
            ]}
          >
            {inboxError}
          </Text>
        </View>
      ) : null}

      {authLoading || (inboxLoading && !inboxLoadedOnce) ? (
        <View style={styles.spinnerWrap}>
          <ActivityIndicator color={theme.colors.accent} />
        </View>
      ) : inboxEntries.length === 0 ? (
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
            <InboxRow
              entry={item}
              onPress={handleInboxRowPress}
              onRequestDelete={handleRequestDelete}
            />
          )}
          // Top hairline lives on the content (not the fixed list frame) so
          // it travels with the rows on pull-to-refresh — otherwise the first
          // row's borderless top is exposed once the content leaves the header.
          contentContainerStyle={{
            borderTopWidth: StyleSheet.hairlineWidth,
            borderTopColor: theme.colors.border,
          }}
          refreshControl={
            <RefreshControl
              refreshing={inboxRefreshing}
              onRefresh={() => void loadInbox('refresh')}
              tintColor={theme.colors.accent}
            />
          }
        />
      )}
    </GestureHandlerRootView>
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
