/**
 * Inbox row — a single received-trail summary in the Trails tab list.
 *
 * Compact list cell tuned to answer "what is this and who sent it" at a
 * glance, without pulling in `TrailBriefCard`'s full detail-screen surface.
 *
 * Renders the four server-derived notification states (see web-ade's
 * `deriveInboxNotification`): never-opened shows a dot by the title with the
 * whole "N notes" accented; opened/all-seen is fully muted with no dot;
 * opened-with-new-notes drops the dot to the notes line and accents only the
 * "(N new)" suffix while the title stays muted. Clients render, they don't
 * re-derive — the `entry.notification` block is the source of truth, with a
 * `readAt` fallback for pre-feature responses.
 */

import React from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  type TextStyle,
} from 'react-native';
import { useTheme } from '@principal-ade/industry-theme';
import type { InboxIndexEntry } from '../../types/Inbox';

export interface InboxRowProps {
  entry: InboxIndexEntry;
  onPress?: (entry: InboxIndexEntry) => void;
}

const formatRelative = (iso: string): string => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const diffMs = Date.now() - d.getTime();
  const sec = Math.round(diffMs / 1000);
  if (sec < 45) return 'just now';
  const min = Math.round(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.round(hr / 24);
  if (day < 7) return `${day}d ago`;
  const wk = Math.round(day / 7);
  if (wk < 5) return `${wk}w ago`;
  const mo = Math.round(day / 30);
  if (mo < 12) return `${mo}mo ago`;
  const yr = Math.round(day / 365);
  return `${yr}y ago`;
};

export const InboxRow: React.FC<InboxRowProps> = ({ entry, onPress }) => {
  const { theme } = useTheme();

  // Prefer the server-derived notification state; fall back to the bare read
  // flag for pre-feature responses that don't carry it. Mirrors web-ade's
  // deriveInboxNotification fallbacks (electron's InboxLeftPanel does the same).
  const notif = entry.notification;
  const dot = notif?.dot ?? entry.readAt === null;
  const noteCount = notif?.noteCount ?? entry.snapshot.noteCount ?? 0;
  const newNoteCount = notif?.newNoteCount ?? 0;
  // Unopened ⇒ the whole "N notes" is accented (all unread); opened-with-new
  // ⇒ only the "(N new)" suffix is, while the total stays muted.
  const allNotesNew = notif?.unread ?? entry.readAt === null;
  // When the dot is only about new notes (the trail itself was already
  // opened), drop it to the notes line so it reads as "the notes are new, not
  // the trail" — matching electron.
  const notesOnlyDot = dot && !allNotesNew;

  // The title reflects whether the trail itself was opened, not the dot: an
  // opened trail with new notes (state 4) reads muted with the accent moved to
  // the "(N new)" badge on the notes line.
  const titleColor = allNotesNew
    ? theme.colors.text
    : theme.colors.textSecondary;
  const titleWeight = String(
    allNotesNew ? theme.fontWeights.semibold : theme.fontWeights.medium,
  ) as TextStyle['fontWeight'];

  const repoLabel = `${entry.owner}/${entry.repo}`;

  return (
    <Pressable
      onPress={onPress ? () => onPress(entry) : undefined}
      style={({ pressed }) => [
        styles.row,
        {
          borderBottomColor: theme.colors.border,
          backgroundColor: pressed
            ? theme.colors.backgroundSecondary
            : 'transparent',
        },
      ]}
    >
      <View style={styles.leading}>
        <View
          style={[
            styles.unreadDot,
            {
              // Sits by the title for a new/unread trail, or drops to the
              // notes line when only the notes are new.
              marginTop: notesOnlyDot ? 26 : 6,
              backgroundColor: dot ? theme.colors.accent : 'transparent',
            },
          ]}
        />
      </View>
      <View style={styles.body}>
        <View style={styles.headerLine}>
          <Text
            style={[
              styles.title,
              {
                color: titleColor,
                fontFamily: theme.fonts.body,
                fontWeight: titleWeight,
              },
            ]}
          >
            {entry.snapshot.title}
          </Text>
          <Text
            style={[
              styles.timestamp,
              {
                color: theme.colors.textTertiary,
                fontFamily: theme.fonts.monospace,
              },
            ]}
          >
            {formatRelative(entry.sentAt)}
          </Text>
        </View>
        <Text
          style={[
            styles.meta,
            { color: theme.colors.textTertiary, fontFamily: theme.fonts.monospace },
          ]}
          numberOfLines={1}
        >
          FROM{' '}
          <Text style={{ color: theme.colors.textSecondary }}>
            {entry.sender.githubLogin}
          </Text>
          {noteCount > 0 ? (
            <Text>
              {'   '}
              <Text
                style={{
                  color: allNotesNew
                    ? theme.colors.accent
                    : theme.colors.textSecondary,
                }}
              >
                {noteCount} {noteCount === 1 ? 'note' : 'notes'}
              </Text>
              {!allNotesNew && newNoteCount > 0 ? (
                <Text style={{ color: theme.colors.accent }}>
                  {' '}
                  ({newNoteCount} new)
                </Text>
              ) : null}
            </Text>
          ) : null}
        </Text>
        <Text
          style={[
            styles.meta,
            { color: theme.colors.textTertiary, fontFamily: theme.fonts.monospace },
          ]}
          numberOfLines={1}
        >
          {repoLabel}
        </Text>
        {entry.comment ? (
          <Text
            style={[
              styles.comment,
              { color: theme.colors.textSecondary, fontFamily: theme.fonts.body },
            ]}
            numberOfLines={2}
          >
            “{entry.comment}”
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  leading: {
    width: 12,
    alignItems: 'flex-start',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  body: {
    flex: 1,
    minWidth: 0,
  },
  headerLine: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  title: {
    flex: 1,
    fontSize: 15,
  },
  timestamp: {
    fontSize: 11,
    letterSpacing: 0.5,
  },
  meta: {
    fontSize: 11,
    letterSpacing: 0.4,
    marginTop: 4,
  },
  comment: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 6,
    fontStyle: 'italic',
  },
});
