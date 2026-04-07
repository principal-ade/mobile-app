/**
 * HourlyActivityHeatmap
 *
 * Displays a granular activity heat map showing commit frequency
 * at 10-minute intervals. Each row represents an hour, with 6 blocks
 * per row (one per 10-minute window). Most recent at top, scrolling
 * down goes back in time.
 *
 * Adapted from web-ade for React Native.
 */

import React, { useMemo, useState, useEffect, useCallback, memo } from 'react';
import { View, Text, StyleSheet, Pressable, LayoutChangeEvent } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { useTheme } from '@principal-ade/industry-theme';

export interface CommitTimestamp {
  timestamp: Date | string;
  repoId?: string;
  authorLogin?: string;
  authorAvatarUrl?: string;
}

export interface HourlyActivityHeatmapProps {
  commits: CommitTimestamp[];
  loading?: boolean;
  onBlockClick?: (startTime: Date, endTime: Date, count: number) => void;
  selectedBlock?: string | null;
  /** Hour key (YYYY-M-D-H format) of the currently visible hour in the feed */
  activeHourKey?: string | null;
  /** Selected author logins to filter by (controlled) */
  selectedAuthorLogins?: string[] | null;
  /** Selected repo IDs to filter by (controlled) */
  selectedRepoIds?: string[] | null;
}

const HOUR_LABEL_WIDTH = 48;
const MIN_CELL_SIZE = 12;
const CELL_GAP = 2;
const BLOCKS_PER_HOUR = 6; // 10-minute blocks

const formatHour = (hour: number): string => {
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${displayHour} ${period}`;
};

type DayQuarter = 'Night' | 'Morning' | 'Afternoon' | 'Evening';

const getQuarter = (hour: number): DayQuarter => {
  if (hour >= 0 && hour < 6) return 'Night';
  if (hour >= 6 && hour < 12) return 'Morning';
  if (hour >= 12 && hour < 18) return 'Afternoon';
  return 'Evening';
};

const getGreeting = (quarter: DayQuarter): string => {
  switch (quarter) {
    case 'Night': return 'Welcome Night Owls';
    case 'Morning': return 'Good Morning';
    case 'Afternoon': return 'Good Afternoon';
    case 'Evening': return 'Good Evening';
  }
};

const getQuarterLabel = (quarter: DayQuarter): string => {
  switch (quarter) {
    case 'Night': return 'Night Shift';
    default: return quarter;
  }
};

const getHourKey = (date: Date): string => {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}-${date.getHours()}`;
};

const getBlockKey = (date: Date): string => {
  const blockIndex = Math.floor(date.getMinutes() / 10);
  return `${getHourKey(date)}-${blockIndex}`;
};

// Parse hex color to RGB
const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
  if (!hex.startsWith('#')) return null;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return { r, g, b };
};

export const HourlyActivityHeatmap: React.FC<HourlyActivityHeatmapProps> = memo(({
  commits,
  loading: _loading = false,
  onBlockClick,
  selectedBlock = null,
  activeHourKey = null,
  selectedAuthorLogins = null,
  selectedRepoIds = null,
}) => {
  const { theme } = useTheme();
  const isFocused = useIsFocused();
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [currentTime, setCurrentTime] = useState(() => new Date());

  // Convert props to Sets for efficient lookup
  const selectedAuthors = useMemo(
    () => (selectedAuthorLogins ? new Set(selectedAuthorLogins) : null),
    [selectedAuthorLogins]
  );
  const selectedRepos = useMemo(
    () => (selectedRepoIds ? new Set(selectedRepoIds) : null),
    [selectedRepoIds]
  );

  const elapsedMinutes = currentTime.getMinutes() % 10;
  const currentBlockKey = `${currentTime.getFullYear()}-${currentTime.getMonth()}-${currentTime.getDate()}-${currentTime.getHours()}-${Math.floor(currentTime.getMinutes() / 10)}`;

  // Filter commits based on selected authors and repos
  const filteredCommits = useMemo(() => {
    let filtered = commits;

    if (selectedAuthors && selectedAuthors.size > 0) {
      filtered = filtered.filter((c) => c.authorLogin && selectedAuthors.has(c.authorLogin));
    }

    if (selectedRepos && selectedRepos.size > 0) {
      filtered = filtered.filter((c) => c.repoId && selectedRepos.has(c.repoId));
    }

    return filtered;
  }, [commits, selectedAuthors, selectedRepos]);

  // Update current time every 10 seconds, only when focused
  useEffect(() => {
    if (!isFocused) return;

    // Update immediately when focused
    setCurrentTime(new Date());

    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 10000);
    return () => clearInterval(interval);
  }, [isFocused]);

  const onLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setDimensions({ width, height });
  }, []);

  const cellSize = useMemo(() => {
    if (dimensions.width === 0) return MIN_CELL_SIZE;
    const availableWidth = dimensions.width - HOUR_LABEL_WIDTH - (BLOCKS_PER_HOUR - 1) * CELL_GAP;
    const calculatedSize = availableWidth / BLOCKS_PER_HOUR;
    return Math.max(MIN_CELL_SIZE, Math.floor(calculatedSize));
  }, [dimensions.width]);

  const maxRows = useMemo(() => {
    // Cap at 24 hours
    return 24;
  }, []);

  const { blockMap, maxCount, quarterCounts } = useMemo(() => {
    const map = new Map<string, number>();
    const quarters = new Map<string, number>();
    let max = 0;

    filteredCommits.forEach(({ timestamp }) => {
      const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
      const key = getBlockKey(date);
      const count = (map.get(key) || 0) + 1;
      map.set(key, count);
      max = Math.max(max, count);

      // Count commits per quarter (date + quarter)
      const quarterKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}-${getQuarter(date.getHours())}`;
      quarters.set(quarterKey, (quarters.get(quarterKey) || 0) + 1);
    });

    return { blockMap: map, maxCount: max, quarterCounts: quarters };
  }, [filteredCommits]);

  const hourRows = useMemo(() => {
    const now = new Date();
    const rows: Array<{
      hourKey: string;
      hourLabel: string;
      date: Date;
      blocks: Array<{
        blockKey: string;
        blockIndex: number;
        startTime: Date;
        endTime: Date;
        count: number;
        isFuture: boolean;
        isCurrent: boolean;
      }>;
    }> = [];

    for (let i = 0; i < maxRows; i++) {
      const hourDate = new Date(now);
      hourDate.setHours(now.getHours() - i, 0, 0, 0);

      const hourKey = getHourKey(hourDate);
      const blocks = [];

      for (let blockIndex = 0; blockIndex < BLOCKS_PER_HOUR; blockIndex++) {
        const startTime = new Date(hourDate);
        startTime.setMinutes(blockIndex * 10, 0, 0);

        const endTime = new Date(startTime);
        endTime.setMinutes(startTime.getMinutes() + 10);

        const blockKey = `${hourKey}-${blockIndex}`;
        const count = blockMap.get(blockKey) || 0;
        const isFuture = startTime > now;
        const isCurrent = now >= startTime && now < endTime;

        blocks.push({
          blockKey,
          blockIndex,
          startTime,
          endTime,
          count,
          isFuture,
          isCurrent,
        });
      }

      rows.push({
        hourKey,
        hourLabel: formatHour(hourDate.getHours()),
        date: hourDate,
        blocks,
      });
    }

    return rows;
  }, [maxRows, blockMap, currentBlockKey]);

  const getColor = useCallback((count: number, isFuture: boolean): string => {
    if (isFuture) {
      return theme.colors.surface;
    }

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
  }, [theme.colors.surface, theme.colors.border, theme.colors.primary, maxCount]);

  const formatDate = (date: Date): string | null => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return null; // No label for today
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    }
  };

  const getSeparator = (
    currentRow: typeof hourRows[0],
    prevRow: typeof hourRows[0] | null,
    isFirst: boolean
  ): { label: string; commitCount: number; dateLabel?: string } | null => {
    const currentQuarter = getQuarter(currentRow.date.getHours());
    const prevQuarter = prevRow ? getQuarter(prevRow.date.getHours()) : null;
    const isNewDay = !prevRow || currentRow.date.toDateString() !== prevRow.date.toDateString();
    const isNewQuarter = !prevRow || currentQuarter !== prevQuarter;

    if (!isNewDay && !isNewQuarter) return null;

    const quarterKey = `${currentRow.date.getFullYear()}-${currentRow.date.getMonth()}-${currentRow.date.getDate()}-${currentQuarter}`;
    const commitCount = quarterCounts.get(quarterKey) || 0;

    // Only the first separator gets "Good Morning" style, rest just show quarter name
    const label = isFirst ? getGreeting(currentQuarter) : getQuarterLabel(currentQuarter);

    const dateLabel = formatDate(currentRow.date);
    if (isNewDay && dateLabel) {
      return { label, commitCount, dateLabel };
    }
    return { label, commitCount };
  };

  return (
    <View style={styles.container} onLayout={onLayout}>
      {/* Legend at top */}
      <View style={styles.legendTop}>
        <Text style={[styles.legendText, { color: theme.colors.textMuted }]}>Less</Text>
        {[0, 1, 2, 3, 4].map((level) => (
          <View
            key={level}
            style={[
              styles.legendBlock,
              {
                width: 10,
                height: 10,
                backgroundColor: getColor(level === 0 ? 0 : (level / 4) * (maxCount || 1), false),
              },
            ]}
          />
        ))}
        <Text style={[styles.legendText, { color: theme.colors.textMuted }]}>More</Text>
      </View>

      {/* Grid */}
      <View style={styles.grid}>
        {hourRows.map((row, rowIndex) => {
          const prevRow = rowIndex > 0 ? hourRows[rowIndex - 1] ?? null : null;
          const separator = getSeparator(row, prevRow, rowIndex === 0);

          return (
            <React.Fragment key={`${row.hourKey}-${rowIndex}`}>
              {/* Day or quarter separator */}
              {separator && (
                <View
                  style={[
                    styles.separator,
                    rowIndex > 0 && {
                      paddingTop: 8,
                      borderTopWidth: 1,
                      borderTopColor: theme.colors.border,
                      marginTop: 8,
                    },
                  ]}
                >
                  {separator.dateLabel && (
                    <Text style={[styles.dateLabel, { color: theme.colors.textMuted }]}>
                      {separator.dateLabel}
                    </Text>
                  )}
                  <View style={styles.separatorRow}>
                    <Text style={[styles.quarterLabel, { color: theme.colors.text }]}>
                      {separator.label}
                    </Text>
                    <Text style={[styles.commitCount, { color: theme.colors.textMuted }]}>
                      {separator.commitCount} commit{separator.commitCount !== 1 ? 's' : ''}
                    </Text>
                  </View>
                </View>
              )}

              {/* Hour row */}
              <View style={styles.hourRow}>
                {/* Hour label */}
                <Text
                  style={[
                    styles.hourLabel,
                    {
                      color: activeHourKey === row.hourKey ? theme.colors.primary : theme.colors.textMuted,
                      fontWeight: activeHourKey === row.hourKey ? '600' : '400',
                    },
                  ]}
                >
                  {row.hourLabel}
                </Text>

                {/* Blocks */}
                <View style={styles.blocksRow}>
                  {row.blocks.map((block) => {
                    const isSelected = selectedBlock === block.startTime.toISOString();

                    // Current block: render 3x3 mini-grid
                    if (block.isCurrent) {
                      const miniGap = 1;
                      // 3 cells per row, each with margin on all sides = 3 * miniGap total
                      const miniCellSize = (cellSize - miniGap * 3) / 3;

                      const commitMinutes = new Set<number>();
                      filteredCommits.forEach(({ timestamp }) => {
                        const commitDate = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
                        if (commitDate >= block.startTime && commitDate < block.endTime) {
                          const minuteInBlock = commitDate.getMinutes() % 10;
                          commitMinutes.add(minuteInBlock);
                        }
                      });

                      return (
                        <Pressable
                          key={block.blockKey}
                          style={[
                            styles.block,
                            {
                              width: cellSize,
                              height: cellSize,
                              backgroundColor: theme.colors.border,
                            },
                            isSelected && {
                              borderWidth: 2,
                              borderColor: theme.colors.primary,
                            },
                          ]}
                          onPress={() => onBlockClick?.(block.startTime, block.endTime, block.count)}
                        >
                          <View style={styles.miniGrid}>
                            {Array.from({ length: 9 }).map((_, i) => {
                              const miniRow = Math.floor(i / 3);
                              const col = i % 3;
                              const minute = (2 - miniRow) * 3 + col;

                              const hasCommit = commitMinutes.has(minute) || (minute === 8 && commitMinutes.has(9));
                              const isElapsed = minute < elapsedMinutes;

                              return (
                                <View
                                  key={i}
                                  style={{
                                    width: miniCellSize,
                                    height: miniCellSize,
                                    borderRadius: 1,
                                    backgroundColor: hasCommit
                                      ? theme.colors.primary
                                      : isElapsed
                                        ? theme.colors.textMuted
                                        : theme.colors.border,
                                    opacity: hasCommit ? 1 : isElapsed ? 0.5 : 1,
                                    margin: miniGap / 2,
                                  }}
                                />
                              );
                            })}
                          </View>
                        </Pressable>
                      );
                    }

                    return (
                      <Pressable
                        key={block.blockKey}
                        style={[
                          styles.block,
                          {
                            width: cellSize,
                            height: cellSize,
                            backgroundColor: getColor(block.count, block.isFuture),
                            opacity: block.isFuture ? 0.3 : 1,
                          },
                          isSelected && {
                            borderWidth: 2,
                            borderColor: theme.colors.primary,
                          },
                        ]}
                        onPress={() => {
                          if (!block.isFuture) {
                            onBlockClick?.(block.startTime, block.endTime, block.count);
                          }
                        }}
                        disabled={block.isFuture}
                      />
                    );
                  })}
                </View>
              </View>
            </React.Fragment>
          );
        })}
      </View>

      </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
  },
  grid: {
    flex: 1,
    gap: CELL_GAP,
  },
  separator: {
    paddingBottom: 4,
  },
  dateLabel: {
    fontSize: 10,
    marginBottom: 4,
  },
  separatorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  quarterLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  commitCount: {
    fontSize: 10,
  },
  hourRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: CELL_GAP,
  },
  hourLabel: {
    width: HOUR_LABEL_WIDTH,
    fontSize: 10,
    textAlign: 'right',
    paddingRight: 4,
  },
  blocksRow: {
    flexDirection: 'row',
    gap: CELL_GAP,
  },
  block: {
    borderRadius: 2,
  },
  miniGrid: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Legend at top
  legendTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginBottom: 12,
  },
  legendText: {
    fontSize: 10,
  },
  legendBlock: {
    borderRadius: 2,
  },
});

export default HourlyActivityHeatmap;
