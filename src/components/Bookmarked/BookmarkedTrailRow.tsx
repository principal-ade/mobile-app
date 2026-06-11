/**
 * Bookmarked trail row — a single entry in the Bookmarked tab's Trails segment.
 *
 * Visual cousin of `InboxRow`: wrapping title, a "BY {author}" line, the
 * "{owner}/{repo}" on its own line, and a relative timestamp. No unread dot,
 * no summary preview. Entries flagged `gone: true` by the server render
 * dimmed with a "no longer available" suffix on the repo line.
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
import type { BookmarkedTrailEntry } from '../../types/Bookmarks';

export interface BookmarkedTrailRowProps {
  entry: BookmarkedTrailEntry;
  onPress?: (entry: BookmarkedTrailEntry) => void;
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

export const BookmarkedTrailRow: React.FC<BookmarkedTrailRowProps> = ({
  entry,
  onPress,
}) => {
  const { theme } = useTheme();
  const isGone = entry.gone === true;
  const titleColor = isGone ? theme.colors.textTertiary : theme.colors.text;
  const titleWeight = String(
    theme.fontWeights.semibold,
  ) as TextStyle['fontWeight'];

  const repoLabel = `${entry.owner}/${entry.repo}`;
  const author = entry.snapshot.createdBy.githubLogin;

  return (
    <Pressable
      onPress={isGone || !onPress ? undefined : () => onPress(entry)}
      style={({ pressed }) => [
        styles.row,
        {
          borderBottomColor: theme.colors.border,
          backgroundColor: pressed
            ? theme.colors.backgroundSecondary
            : 'transparent',
          opacity: isGone ? 0.6 : 1,
        },
      ]}
    >
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
            {formatRelative(entry.bookmarkedAt)}
          </Text>
        </View>
        <Text
          style={[
            styles.meta,
            {
              color: theme.colors.textTertiary,
              fontFamily: theme.fonts.monospace,
            },
          ]}
          numberOfLines={1}
        >
          BY{' '}
          <Text style={{ color: theme.colors.textSecondary }}>{author}</Text>
        </Text>
        <Text
          style={[
            styles.meta,
            {
              color: theme.colors.textTertiary,
              fontFamily: theme.fonts.monospace,
            },
          ]}
          numberOfLines={1}
        >
          {repoLabel}
          {isGone ? '   NO LONGER AVAILABLE' : ''}
        </Text>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  row: {
    paddingVertical: 14,
    paddingHorizontal: 16,
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
});
