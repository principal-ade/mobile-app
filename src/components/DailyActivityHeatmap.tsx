/**
 * DailyActivityHeatmap
 *
 * Displays a 7-day activity heatmap showing commit frequency
 * in 6-hour chunks. Each row represents a time period (Night,
 * Morning, Afternoon, Evening), and each column represents a day.
 * Most recent day is on the right.
 */

import React, { useMemo, memo } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useTheme } from '@principal-ade/industry-theme';

export interface CommitTimestamp {
  timestamp: Date | string;
  repoId?: string;
  authorLogin?: string;
  authorAvatarUrl?: string;
}

export interface DailyActivityHeatmapProps {
  commits: CommitTimestamp[];
  onBlockClick?: (date: Date, quarter: string, count: number) => void;
}

type Quarter = 'Night' | 'Morning' | 'Afternoon' | 'Evening';

const QUARTERS: Quarter[] = ['Evening', 'Afternoon', 'Morning', 'Night'];

const getQuarter = (hour: number): Quarter => {
  if (hour >= 0 && hour < 6) return 'Night';
  if (hour >= 6 && hour < 12) return 'Morning';
  if (hour >= 12 && hour < 18) return 'Afternoon';
  return 'Evening';
};

const getQuarterLabel = (quarter: Quarter): string => {
  switch (quarter) {
    case 'Night': return '12am-6am';
    case 'Morning': return '6am-12pm';
    case 'Afternoon': return '12pm-6pm';
    case 'Evening': return '6pm-12am';
  }
};

const getQuarterKey = (date: Date, quarter: Quarter): string => {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}-${quarter}`;
};

const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
  if (!hex.startsWith('#')) return null;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return { r, g, b };
};

const getDayHeader = (date: Date): { weekday: string; day: number } => {
  const weekdays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  return {
    weekday: weekdays[date.getDay()],
    day: date.getDate(),
  };
};

export const DailyActivityHeatmap: React.FC<DailyActivityHeatmapProps> = memo(({
  commits,
  onBlockClick,
}) => {
  const { theme } = useTheme();

  const DAYS = 7;

  const { dayMap, maxCount, days } = useMemo(() => {
    const map = new Map<string, number>();
    const dayDates: Date[] = [];
    let max = 0;

    const now = new Date();
    now.setHours(0, 0, 0, 0);

    for (let i = 0; i < DAYS; i++) {
      const dayDate = new Date(now);
      dayDate.setDate(dayDate.getDate() - i);
      dayDates.push(dayDate);

      QUARTERS.forEach((quarter) => {
        map.set(getQuarterKey(dayDate, quarter), 0);
      });
    }

    commits.forEach(({ timestamp }) => {
      const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
      const quarter = getQuarter(date.getHours());
      const key = getQuarterKey(date, quarter);
      const count = (map.get(key) || 0) + 1;
      map.set(key, count);
      max = Math.max(max, count);
    });

    return { dayMap: map, maxCount: max, days: dayDates };
  }, [commits]);

  const getColor = (count: number): string => {
    if (count === 0) {
      return theme.colors.border;
    }

    const primaryColor = theme.colors.primary;
    const intensity = maxCount > 0
      ? Math.min(4, Math.ceil((count / maxCount) * 4))
      : 0;

    const opacities = [0.2, 0.4, 0.6, 0.8, 1.0];
    const opacity = opacities[intensity];

    const rgb = hexToRgb(primaryColor);
    if (rgb) {
      return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity})`;
    }

    return primaryColor;
  };

  return (
    <View style={styles.container}>
      <View style={styles.grid}>
        {/* Header row with day labels */}
        <View style={styles.headerRow}>
          {[...days].reverse().map((dayDate, dayIdx) => {
            const { weekday, day } = getDayHeader(dayDate);
            return (
              <View key={dayIdx} style={styles.dayHeader}>
                <Text style={[styles.dayLabel, { color: theme.colors.text }]}>
                  {weekday}
                </Text>
                <Text style={[styles.dayNumber, { color: theme.colors.textMuted }]}>
                  {day}
                </Text>
              </View>
            );
          })}
          <View style={styles.quarterLabelCell}>
            <Text style={[styles.activityLabel, { color: theme.colors.text, marginTop: 6 }]}>
              Activity
            </Text>
          </View>
        </View>

        {/* Quarter rows */}
        {QUARTERS.map((quarter) => (
          <View key={quarter} style={styles.quarterRow}>
            {[...days].reverse().map((dayDate, dayIdx) => {
              const count = dayMap.get(getQuarterKey(dayDate, quarter)) || 0;

              return (
                <Pressable
                  key={dayIdx}
                  style={[
                    styles.block,
                    { backgroundColor: getColor(count) },
                  ]}
                  onPress={() => onBlockClick?.(dayDate, quarter, count)}
                >
                  {count > 0 && (
                    <Text style={[styles.blockCount, { color: theme.colors.text }]}>
                      {count}
                    </Text>
                  )}
                </Pressable>
              );
            })}
            <View style={styles.quarterLabelCell}>
              <Text style={[styles.quarterLabel, { color: theme.colors.textMuted }]}>
                {quarter}
              </Text>
              <Text style={[styles.quarterTime, { color: theme.colors.textMuted }]}>
                {getQuarterLabel(quarter)}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {},
  grid: {
    gap: 4,
  },
  headerRow: {
    flexDirection: 'row',
    marginBottom: 8,
    gap: 4,
  },
  quarterLabelCell: {
    width: 60,
    alignItems: 'flex-end',
  },
  activityLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginBottom: 4,
  },
  dayHeader: {
    flex: 1,
    alignItems: 'center',
  },
  dayLabel: {
    fontSize: 10,
    fontWeight: '500',
  },
  dayNumber: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 1,
  },
  quarterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  quarterLabel: {
    fontSize: 10,
    fontWeight: '500',
  },
  quarterTime: {
    fontSize: 8,
  },
  block: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 40,
  },
  blockCount: {
    fontSize: 10,
    fontWeight: '600',
  },
});

export default DailyActivityHeatmap;
