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
import { SentRow } from '../components/Trails/SentRow';
import { SegmentedControl } from '../components/SegmentedControl';
import {
  EmptyContent,
  ScreenHeader,
} from '../components/Trails/TrailListChrome';
import { useAuth } from '../hooks/useAuth';
import {
  getInbox,
  getSent,
  deleteInboxEntry,
  TrailsApiError,
} from '../services/TrailsApiService';
import {
  getSkipInboxDeleteConfirm,
  setSkipInboxDeleteConfirm,
} from '../utils/inboxPrefs';
import type { InboxIndexEntry, OutboxIndexEntry } from '../types/Inbox';
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

  // 0 = Received (inbox), 1 = Sent (outbox).
  const [view, setView] = useState<0 | 1>(0);

  const [inboxEntries, setInboxEntries] = useState<InboxIndexEntry[]>([]);
  const [inboxLoading, setInboxLoading] = useState(false);
  const [inboxRefreshing, setInboxRefreshing] = useState(false);
  const [inboxError, setInboxError] = useState<string | null>(null);
  const [inboxLoadedOnce, setInboxLoadedOnce] = useState(false);
  const [skipDeleteConfirm, setSkipDeleteConfirm] = useState(false);

  const [sentEntries, setSentEntries] = useState<OutboxIndexEntry[]>([]);
  const [sentLoading, setSentLoading] = useState(false);
  const [sentRefreshing, setSentRefreshing] = useState(false);
  const [sentError, setSentError] = useState<string | null>(null);
  const [sentLoadedOnce, setSentLoadedOnce] = useState(false);

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

  const loadSent = useCallback(
    async (mode: 'initial' | 'refresh') => {
      if (!token) return;
      if (mode === 'initial') setSentLoading(true);
      else setSentRefreshing(true);
      setSentError(null);
      try {
        const response = await getSent(token);
        setSentEntries(response.entries);
      } catch (err) {
        setSentError(
          err instanceof TrailsApiError
            ? err.message
            : 'Could not load your sent trails.',
        );
      } finally {
        if (mode === 'initial') setSentLoading(false);
        else setSentRefreshing(false);
        setSentLoadedOnce(true);
      }
    },
    [token],
  );

  // Load the Sent list lazily the first time the user switches to it.
  useEffect(() => {
    if (view !== 1 || !isAuthenticated || !token) return;
    if (!sentLoadedOnce) {
      void loadSent('initial');
    }
  }, [view, isAuthenticated, token, sentLoadedOnce, loadSent]);

  const handleSentRowPress = useCallback(
    (entry: OutboxIndexEntry) => {
      navigation.navigate('TrailDetail', { trailId: entry.trailId });
    },
    [navigation],
  );

  const handleInboxRowPress = useCallback(
    (entry: InboxIndexEntry) => {
      // Optimistically clear the row's unread/new-notes state so the dot
      // disappears the instant we navigate. The server mark-read is owned by
      // TrailDetailScreen (so every entry point persists it, not just an inbox
      // tap); this is purely the local mirror, and the inbox self-heals from
      // the server on its next refresh if that write ever fails.
      //
      // The row prefers the server-derived `notification` block over `readAt`,
      // so the visible dot tracks that — patch both. Fire whenever a dot is
      // showing: an unopened trail OR an opened one with new notes.
      const dotShowing = entry.notification?.dot ?? entry.readAt === null;
      if (dotShowing) {
        const optimisticReadAt = entry.readAt ?? new Date().toISOString();
        const noteCount = entry.snapshot.noteCount ?? 0;
        setInboxEntries((prev) =>
          prev.map((e) =>
            e.trailId === entry.trailId
              ? {
                  ...e,
                  readAt: optimisticReadAt,
                  notesSeenCount: noteCount,
                  notification: e.notification
                    ? { ...e.notification, dot: false, unread: false, newNoteCount: 0 }
                    : e.notification,
                }
              : e,
          ),
        );
      }
      navigation.navigate('TrailDetail', { trailId: entry.trailId });
    },
    [navigation],
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

  const activeError = view === 0 ? inboxError : sentError;

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
        actionColor={theme.colors.accent}
        refreshing={view === 0 ? inboxRefreshing : sentRefreshing}
        onRefresh={() =>
          view === 0 ? void loadInbox('refresh') : void loadSent('refresh')
        }
      />

      <View style={styles.segmentWrap}>
        <SegmentedControl
          segments={['Received', 'Sent']}
          selectedIndex={view}
          onChange={(index) => setView(index as 0 | 1)}
        />
      </View>

      {activeError ? (
        <View style={styles.errorBanner}>
          <Text
            style={[
              styles.errorText,
              { color: theme.colors.error ?? '#ef4444' },
            ]}
          >
            {activeError}
          </Text>
        </View>
      ) : null}

      {view === 0 ? (
        authLoading || (inboxLoading && !inboxLoadedOnce) ? (
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
        )
      ) : authLoading || (sentLoading && !sentLoadedOnce) ? (
        <View style={styles.spinnerWrap}>
          <ActivityIndicator color={theme.colors.accent} />
        </View>
      ) : sentEntries.length === 0 ? (
        <EmptyContent
          iconColor={theme.colors.textSecondary}
          textColor={theme.colors.text}
          subtextColor={theme.colors.textSecondary}
          title="Nothing sent yet"
          subtitle="Trails you share with others will show up here, with everyone you've sent them to."
        />
      ) : (
        <FlatList
          data={sentEntries}
          keyExtractor={(item) => item.trailId}
          renderItem={({ item }) => (
            <SentRow entry={item} onPress={handleSentRowPress} />
          )}
          contentContainerStyle={{
            borderTopWidth: StyleSheet.hairlineWidth,
            borderTopColor: theme.colors.border,
          }}
          refreshControl={
            <RefreshControl
              refreshing={sentRefreshing}
              onRefresh={() => void loadSent('refresh')}
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
  segmentWrap: {
    paddingHorizontal: 16,
    paddingVertical: 12,
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
