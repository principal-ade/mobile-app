/**
 * Sent row — a single sent-trail summary in the Trails tab's "Sent" view.
 *
 * The sender-side mirror of {@link InboxRow}, tuned to answer "what did I send
 * and who got it" at a glance. Unlike the inbox row there's no read-state,
 * note notification, or swipe-to-delete here — the outbox is the sender's own
 * list, with no per-recipient read tracking and (currently) no revoke route —
 * so this row is read-only and always fully muted.
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
import { useDisplayNames } from '../../hooks/useDisplayName';
import type { OutboxIndexEntry } from '../../types/Inbox';

export interface SentRowProps {
  entry: OutboxIndexEntry;
  onPress?: (entry: OutboxIndexEntry) => void;
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

// "TO Alice", "TO Alice, Bob", "TO Alice, Bob +3" — keep the line to a couple
// of names so it stays single-line next to the timestamp. `getName` resolves
// each login to a display name, falling back to the login itself.
const formatRecipients = (
  recipients: OutboxIndexEntry['recipients'],
  getName: (login: string) => string,
): string => {
  if (recipients.length === 0) return '';
  const shown = recipients.slice(0, 2).map((r) => getName(r.githubLogin));
  const overflow = recipients.length - shown.length;
  return overflow > 0 ? `${shown.join(', ')} +${overflow}` : shown.join(', ');
};

export const SentRow: React.FC<SentRowProps> = ({ entry, onPress }) => {
  const { theme } = useTheme();
  // Only the first couple of recipients are shown, so only resolve those —
  // no need to fetch names for a long tail that renders as "+N".
  const getName = useDisplayNames(
    entry.recipients.slice(0, 2).map((r) => r.githubLogin),
  );

  const repoLabel = `${entry.owner}/${entry.repo}`;
  const recipientLabel = formatRecipients(entry.recipients, getName);

  return (
    <Pressable
      onPress={onPress ? () => onPress(entry) : undefined}
      style={({ pressed }) => [
        styles.row,
        {
          backgroundColor: pressed
            ? theme.colors.backgroundSecondary
            : theme.colors.background,
          borderBottomColor: theme.colors.border,
        },
      ]}
    >
      <View style={styles.body}>
        <View style={styles.headerLine}>
          <Text
            style={[
              styles.title,
              {
                color: theme.colors.textSecondary,
                fontFamily: theme.fonts.body,
                fontWeight: String(
                  theme.fontWeights.medium,
                ) as TextStyle['fontWeight'],
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
        {recipientLabel ? (
          <Text
            style={[
              styles.meta,
              { color: theme.colors.textTertiary, fontFamily: theme.fonts.monospace },
            ]}
            numberOfLines={1}
          >
            TO{' '}
            <Text style={{ color: theme.colors.textSecondary }}>
              {recipientLabel}
            </Text>
          </Text>
        ) : null}
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
    // Align with InboxRow's text column: 16 padding + 12 leading dot gutter.
    paddingLeft: 28,
    paddingRight: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
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
