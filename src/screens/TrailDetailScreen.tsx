/**
 * Screen that resolves a trail share id to its payload and renders the
 * brief card. Reached from the Search tab's clipboard double-tap when
 * the clipboard contains a `…/trail/<uuid>` URL, or from the Trails tab's
 * inbox / recently-visited row taps.
 *
 * Layout: the card fills the screen and owns its own scroll. Tapping a
 * stop expands that row in place via `expandInline` — sourcePath and
 * description render inside the row, no pinned bottom panel.
 */

import React from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import type { StackScreenProps } from '@react-navigation/stack';
import { useTheme } from '@principal-ade/industry-theme';

import { TrailBriefCard } from '../components/Trails/TrailBriefCard';
import { trailPayloadToBriefProps } from '../components/Trails/trailBriefAdapter';
import { TrailShareModal } from '../components/Trails/TrailShareModal';
import { LucideIcon } from '../components/LucideIcon';
import { apiConfig } from '../utils/config';
import { useAuth } from '../hooks/useAuth';
import {
  createNote,
  deleteNote,
  getTrailById,
  recordTrailVisit,
  TrailsApiError,
  updateNote,
} from '../services/TrailsApiService';
import { bookmarkTrail, removeBookmarkTrail } from '../services/BookmarksApiService';
import { createTrailFileReader } from '../services/TrailFileContentService';
import type { PasteStackParamList } from '../navigation/types';
import type { TrailFetchResponse } from '../services/TrailsApiService';
import type { TrailNote } from '../types/Trail';

type Props = StackScreenProps<PasteStackParamList, 'TrailDetail'>;

// Web copy of the URL keeps the share link consistent across surfaces.
// `apiConfig.baseUrl` ends in `/api`; strip it to get the user-facing origin
// to prefix `/trail/<id>` with. Mirrors TopicDetailScreen's WEB_ORIGIN.
const WEB_ORIGIN = apiConfig.baseUrl.replace(/\/api\/?$/, '');

export const TrailDetailScreen: React.FC<Props> = ({ navigation, route }) => {
  const { trailId } = route.params;
  const { theme } = useTheme();
  const { token, user } = useAuth();
  const currentUserLogin = user?.login;
  const [shareVisible, setShareVisible] = React.useState(false);
  const [state, setState] = React.useState<
    | { status: 'loading' }
    | { status: 'ok'; data: TrailFetchResponse }
    | { status: 'error'; message: string }
  >({ status: 'loading' });
  // Tracks an in-flight bookmark/removeBookmark so the toggle can't double-fire while
  // the optimistic update is reconciling.
  const [bookmarkInFlight, setBookmarkInFlight] = React.useState(false);
  // Monotonic counter for optimistic note ids — unique without Math.random.
  const tempIdRef = React.useRef(0);

  React.useEffect(() => {
    let cancelled = false;
    setState({ status: 'loading' });
    getTrailById(trailId, token ?? undefined)
      .then((data) => {
        if (cancelled) return;
        setState({ status: 'ok', data });
        // Fire-and-forget visit recording so the user's "recently
        // visited" list reflects this open. Anonymous viewers (no
        // token) are tracked separately on the server via a cookie
        // that mobile won't have — skip the call rather than send a
        // request the server will reject.
        if (token) {
          void recordTrailVisit(trailId, token).catch(() => {
            // Non-critical — silently ignore so a flaky visits write
            // never blocks the brief from rendering.
          });
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const message =
          err instanceof TrailsApiError
            ? err.message
            : err instanceof Error
              ? err.message
              : 'Unable to load trail';
        setState({ status: 'error', message });
      });
    return () => {
      cancelled = true;
    };
  }, [trailId, token]);

  const isBookmarked = state.status === 'ok' ? state.data.bookmarked : false;
  const canBookmark = state.status === 'ok' && !!token;
  // Sharing is available as soon as the trail resolves — the link is just the
  // id, no auth needed (public trails resolve for anyone; private ones gate on
  // the web side, same as the existing topic share link).
  const canShare = state.status === 'ok';

  const toggleBookmark = React.useCallback(async () => {
    if (state.status !== 'ok' || !token || bookmarkInFlight) return;
    const previous = state.data.bookmarked;
    // Optimistic flip — revert on failure. The toggle is idempotent on the
    // server side; a failed call leaves the index untouched.
    setState({ status: 'ok', data: { ...state.data, bookmarked: !previous } });
    setBookmarkInFlight(true);
    try {
      if (previous) {
        await removeBookmarkTrail(trailId, token);
      } else {
        await bookmarkTrail(trailId, token);
      }
    } catch {
      setState((s) =>
        s.status === 'ok'
          ? { status: 'ok', data: { ...s.data, bookmarked: previous } }
          : s,
      );
    } finally {
      setBookmarkInFlight(false);
    }
  }, [state, token, trailId, bookmarkInFlight]);

  // Apply an immutable update to the loaded payload's notes array. No-op
  // unless the trail is loaded. The single funnel every optimistic note
  // mutation goes through.
  const patchNotes = React.useCallback(
    (updater: (notes: TrailNote[]) => TrailNote[]) => {
      setState((s) =>
        s.status === 'ok'
          ? {
              ...s,
              data: {
                ...s.data,
                payload: {
                  ...s.data.payload,
                  notes: updater(s.data.payload.notes ?? []),
                },
              },
            }
          : s,
      );
    },
    [],
  );

  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () =>
        canShare || canBookmark ? (
          <View style={styles.headerRight}>
            {canShare ? (
              <Pressable
                onPress={() => setShareVisible(true)}
                hitSlop={12}
                style={({ pressed }) => [
                  styles.headerButton,
                  { opacity: pressed ? 0.5 : 1 },
                ]}
                accessibilityLabel="Share trail"
                accessibilityRole="button"
              >
                <LucideIcon
                  name="QrCode"
                  size={21}
                  color={theme.colors.textSecondary}
                />
              </Pressable>
            ) : null}
            {canBookmark ? (
              <Pressable
                onPress={() => void toggleBookmark()}
                hitSlop={12}
                disabled={bookmarkInFlight}
                style={({ pressed }) => [
                  styles.headerButton,
                  { opacity: pressed || bookmarkInFlight ? 0.5 : 1 },
                ]}
                accessibilityLabel={
                  isBookmarked ? 'Remove bookmark' : 'Bookmark trail'
                }
                accessibilityRole="button"
              >
                <BookmarkIcon
                  size={22}
                  color={
                    isBookmarked
                      ? theme.colors.accent
                      : theme.colors.textSecondary
                  }
                  filled={isBookmarked}
                />
              </Pressable>
            ) : null}
          </View>
        ) : undefined,
    });
  }, [
    navigation,
    canShare,
    canBookmark,
    isBookmarked,
    bookmarkInFlight,
    toggleBookmark,
    theme.colors.accent,
    theme.colors.textSecondary,
  ]);

  // Host file reader for slice-snippet source — fetches from GitHub at the
  // commit the trail was authored against, gated by the viewer's token.
  // Memoized on the stable provenance primitives (not `state.data`, which
  // gets a new identity on every bookmark toggle) so the card's snippet
  // effects don't refire on unrelated state changes.
  const okOwner = state.status === 'ok' ? state.data.owner : null;
  const okRepo = state.status === 'ok' ? state.data.repo : null;
  const okRef =
    state.status === 'ok' ? state.data.payload.authoredAt?.sha : undefined;
  const readFile = React.useMemo(() => {
    if (!okOwner || !okRepo) return undefined;
    return createTrailFileReader({
      owner: okOwner,
      repo: okRepo,
      ref: okRef,
      token: token ?? undefined,
    });
  }, [okOwner, okRepo, okRef, token]);

  if (state.status === 'loading') {
    return (
      <View
        style={[
          styles.center,
          { backgroundColor: theme.colors.background },
        ]}
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

  const { payload } = state.data;
  const briefProps = trailPayloadToBriefProps(payload);
  const canWriteNotes = !!token && !!currentUserLogin;

  // Optimistic create: append a temp marker note, fire the write, then
  // swap the temp for the server note (so its real id is available for a
  // later edit/delete). The composer closes instantly, so on failure we
  // roll the temp back and surface the error via an alert.
  const doCreate = async (markerId: string, body: string) => {
    if (!token || !currentUserLogin) return;
    const tempId = `temp-note-${tempIdRef.current++}`;
    const now = new Date().toISOString();
    const optimistic: TrailNote = {
      id: tempId,
      kind: 'marker',
      scope: { markerId },
      body,
      author: currentUserLogin,
      createdAt: now,
      updatedAt: now,
    };
    patchNotes((notes) => [...notes, optimistic]);
    try {
      const saved = await createNote(trailId, token, {
        kind: 'marker',
        scope: { markerId },
        body,
        author: currentUserLogin,
      });
      patchNotes((notes) => notes.map((n) => (n.id === tempId ? saved : n)));
    } catch (e) {
      patchNotes((notes) => notes.filter((n) => n.id !== tempId));
      Alert.alert(
        'Could not add note',
        e instanceof Error ? e.message : 'Try again.',
      );
    }
  };

  // Optimistic edit: swap the body locally, persist, reconcile with the
  // server note; restore the previous body and alert on failure.
  const doEdit = async (noteId: string, body: string) => {
    if (state.status !== 'ok' || !token) return;
    const previous = state.data.payload.notes?.find((n) => n.id === noteId);
    patchNotes((notes) =>
      notes.map((n) => (n.id === noteId ? { ...n, body } : n)),
    );
    try {
      const saved = await updateNote(trailId, noteId, token, body);
      patchNotes((notes) => notes.map((n) => (n.id === noteId ? saved : n)));
    } catch (e) {
      if (previous) {
        patchNotes((notes) =>
          notes.map((n) => (n.id === noteId ? previous : n)),
        );
      }
      Alert.alert(
        'Could not save note',
        e instanceof Error ? e.message : 'Try again.',
      );
    }
  };

  // Optimistic delete: drop the note locally, persist, re-insert at its
  // original index on failure (and surface the error inline since there's
  // no composer in the delete flow).
  const doDelete = async (noteId: string) => {
    if (state.status !== 'ok' || !token) return;
    const notes = state.data.payload.notes ?? [];
    const index = notes.findIndex((n) => n.id === noteId);
    if (index < 0) return;
    const removed = notes[index];
    patchNotes((curr) => curr.filter((n) => n.id !== noteId));
    try {
      await deleteNote(trailId, noteId, token);
    } catch (e) {
      patchNotes((curr) => {
        const next = [...curr];
        next.splice(Math.min(index, next.length), 0, removed);
        return next;
      });
      Alert.alert(
        'Could not delete note',
        e instanceof Error ? e.message : 'Try again.',
      );
    }
  };

  const handleDeleteNote = (noteId: string) => {
    Alert.alert('Delete note?', 'This removes your note from the trail.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => void doDelete(noteId),
      },
    ]);
  };

  return (
    <View
      style={[styles.root, { backgroundColor: theme.colors.background }]}
    >
      <TrailBriefCard
        {...briefProps}
        presentation="screen"
        expandInline
        readFile={readFile}
        currentUserLogin={currentUserLogin}
        onCreateNote={canWriteNotes ? doCreate : undefined}
        onUpdateNote={canWriteNotes ? doEdit : undefined}
        onDeleteNote={canWriteNotes ? handleDeleteNote : undefined}
      />
      <TrailShareModal
        visible={shareVisible}
        onClose={() => setShareVisible(false)}
        url={`${WEB_ORIGIN}/trail/${trailId}`}
        title={payload.title}
      />
    </View>
  );
};

/**
 * Header bookmark icon — supports a filled state, which the shared `LucideIcon`
 * doesn't (it hardcodes `fill: 'none'`). Same path as the Lucide Bookmark, just
 * with a togglable fill so the active state reads at a glance.
 */
const BOOKMARK_PATH = 'M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z';

const BookmarkIcon: React.FC<{ size: number; color: string; filled: boolean }> = ({
  size,
  color,
  filled,
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path
      d={BOOKMARK_PATH}
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      fill={filled ? color : 'none'}
    />
  </Svg>
);

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
