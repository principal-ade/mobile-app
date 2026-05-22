/**
 * One row in the Trails tab's "Recently Visited" listing — mirrors the
 * shape of {@link InboxRow} so the two list modes feel like the same
 * surface, just sourced from different manifests. No unread dot here
 * (visits don't have a read/unread state); the leading slot is empty
 * and the row leans on the title + "{visits}× • {relative}" meta line.
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
import type { TrailRecentlyVisitedEntry } from '../../services/TrailsApiService';

export interface RecentlyVisitedRowProps {
  entry: TrailRecentlyVisitedEntry;
  onPress?: (entry: TrailRecentlyVisitedEntry) => void;
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

export const RecentlyVisitedRow: React.FC<RecentlyVisitedRowProps> = ({
  entry,
  onPress,
}) => {
  const { theme } = useTheme();
  const repoLabel = `${entry.owner}/${entry.repo}`;
  const visitsLabel =
    entry.visitCount === 1 ? '1 visit' : `${entry.visitCount} visits`;
  const titleWeight = String(
    theme.fontWeights.semibold,
  ) as TextStyle['fontWeight'];

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
      <View style={styles.body}>
        <View style={styles.headerLine}>
          <Text
            style={[
              styles.title,
              {
                color: theme.colors.text,
                fontFamily: theme.fonts.body,
                fontWeight: titleWeight,
              },
            ]}
            numberOfLines={1}
          >
            {entry.title}
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
            {formatRelative(entry.lastVisitedAt)}
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
          {entry.createdByLogin ? (
            <>
              FROM{' '}
              <Text style={{ color: theme.colors.textSecondary }}>
                {entry.createdByLogin}
              </Text>
              {'   '}
            </>
          ) : null}
          {repoLabel}
          {'   '}
          {visitsLabel}
        </Text>
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
