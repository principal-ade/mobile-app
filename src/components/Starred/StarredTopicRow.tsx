/**
 * Starred topic row — a single entry in the Starred tab's Topics segment.
 *
 * Same visual rhythm as `StarredTrailRow`, with the snapshot's
 * `descriptionPreview` and a "{trailCount} trails" meta hint instead of
 * "{owner}/{repo}". `onPress` is optional — tapping topic rows is a no-op
 * until a mobile topic detail screen exists (build-spec step 5).
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
import type { StarredTopicEntry } from '../../types/Stars';

export interface StarredTopicRowProps {
  entry: StarredTopicEntry;
  onPress?: (entry: StarredTopicEntry) => void;
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

export const StarredTopicRow: React.FC<StarredTopicRowProps> = ({
  entry,
  onPress,
}) => {
  const { theme } = useTheme();
  const isGone = entry.gone === true;
  const titleColor = isGone ? theme.colors.textTertiary : theme.colors.text;
  const titleWeight = String(
    theme.fontWeights.semibold,
  ) as TextStyle['fontWeight'];

  const trailCountLabel =
    entry.snapshot.trailCount === 1
      ? '1 TRAIL'
      : `${entry.snapshot.trailCount} TRAILS`;
  const preview = entry.snapshot.descriptionPreview;

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
            {formatRelative(entry.starredAt)}
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
          {trailCountLabel}
          {isGone ? '   NO LONGER AVAILABLE' : ''}
        </Text>
        {preview ? (
          <Text
            style={[
              styles.summary,
              {
                color: theme.colors.textTertiary,
                fontFamily: theme.fonts.body,
              },
            ]}
            numberOfLines={2}
          >
            {preview}
          </Text>
        ) : null}
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
  summary: {
    fontSize: 12,
    lineHeight: 16,
    marginTop: 4,
  },
});
