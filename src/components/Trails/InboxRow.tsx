/**
 * Inbox row — a single received-trail summary in the Trails tab list.
 *
 * Compact list cell tuned to answer "what is this and who sent it" at a
 * glance, without pulling in `TrailBriefCard`'s full detail-screen
 * surface. Unread rows surface a small dot in the leading slot; read
 * rows drop to a muted state.
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
  const isUnread = entry.readAt === null;
  const titleColor = isUnread ? theme.colors.text : theme.colors.textSecondary;
  const titleWeight = String(
    isUnread ? theme.fontWeights.semibold : theme.fontWeights.medium,
  ) as TextStyle['fontWeight'];

  const repoLabel = `${entry.owner}/${entry.repo}`;
  const summary = entry.snapshot.summaryPreview;

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
              backgroundColor: isUnread
                ? theme.colors.accent
                : 'transparent',
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
            numberOfLines={1}
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
          {'   '}
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
        {summary ? (
          <Text
            style={[
              styles.summary,
              { color: theme.colors.textTertiary, fontFamily: theme.fonts.body },
            ]}
            numberOfLines={2}
          >
            {summary}
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
    width: 16,
    paddingTop: 6,
    alignItems: 'center',
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
  summary: {
    fontSize: 12,
    lineHeight: 16,
    marginTop: 4,
  },
});
