/**
 * ContributionCalendar
 *
 * Displays a GitHub-style contribution calendar showing daily activity
 * for the last 3 months. Each day is represented by a small square,
 * with color intensity based on contribution count.
 */

import React, { useMemo, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Animated } from 'react-native';
import { useTheme } from '@principal-ade/industry-theme';

export interface DailyContribution {
  date: string; // YYYY-MM-DD
  count: number;
}

export interface ContributionCalendarProps {
  contributions: DailyContribution[];
  months?: number; // Number of months to show (default 5)
  showLabels?: boolean; // Show month and day labels (default true)
  loading?: boolean; // Show shimmer loading state
  maxHeight?: number; // Maximum height to fit within (overrides months if set)
  layout?: 'weeks' | 'grid'; // Layout mode: weeks (default) or grid
  gridColumns?: number; // Number of columns for grid layout (default 14)
  gridRows?: number; // Number of rows for grid layout (default 14)
}

interface WeekData {
  days: (DailyContribution | null)[];
}

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
  if (!hex.startsWith('#')) return null;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return { r, g, b };
};

export const ContributionCalendar: React.FC<ContributionCalendarProps> = ({
  contributions,
  months = 5,
  showLabels = true,
  loading = false,
  maxHeight,
  layout = 'weeks',
  gridColumns = 14,
  gridRows = 14,
}) => {
  const { theme } = useTheme();
  const shimmerAnim = useRef(new Animated.Value(0)).current;
  const [measuredHeight, setMeasuredHeight] = React.useState<number | null>(null);
  const [measuredWidth, setMeasuredWidth] = React.useState<number | null>(null);

  // Calculate day size based on layout mode
  const daySize = useMemo(() => {
    const gap = 1.5;

    if (layout === 'grid') {
      // Grid layout: fit gridRows × gridColumns
      const heightToUse = measuredHeight || maxHeight;
      const widthToUse = measuredWidth;

      if (heightToUse && widthToUse) {
        const verticalGaps = (gridRows - 1) * gap;
        const horizontalGaps = (gridColumns - 1) * gap;
        const availableHeight = heightToUse - verticalGaps;
        const availableWidth = widthToUse - horizontalGaps;

        // Use the smaller dimension to ensure squares fit
        const heightBasedSize = Math.floor(availableHeight / gridRows);
        const widthBasedSize = Math.floor(availableWidth / gridColumns);
        return Math.min(heightBasedSize, widthBasedSize);
      }

      return 12; // Default
    }

    // Weeks layout: fit 7 days vertically
    const totalGaps = 6 * gap; // 6 gaps between 7 days
    const heightToUse = measuredHeight || maxHeight;

    if (heightToUse) {
      const availableHeight = heightToUse - totalGaps;
      const size = Math.floor(availableHeight / 7);
      return size;
    }

    // Default size when no height constraint
    return 12;
  }, [layout, measuredHeight, measuredWidth, maxHeight, gridRows, gridColumns]);

  useEffect(() => {
    if (loading) {
      shimmerAnim.setValue(0);
      const animation = Animated.loop(
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        })
      );
      animation.start();
      return () => animation.stop();
    }
  }, [loading, shimmerAnim]);

  // Calculate how many weeks to show (for weeks layout)
  const weeksToShow = useMemo(() => {
    if (layout === 'grid') {
      return 0; // Not used in grid mode
    }

    if (maxHeight) {
      // When maxHeight is set, show ALL available contribution data
      // We'll fit the data horizontally with scroll
      if (contributions.length === 0) {
        // Default to 5 months worth for skeleton
        return Math.floor((5 * 30) / 7);
      }
      // Calculate from the actual contribution data range
      return Math.ceil(contributions.length / 7) + 4; // Add extra weeks for padding
    }

    // Normal mode: use months parameter
    return Math.floor((months * 30) / 7);
  }, [layout, maxHeight, contributions.length, months]);

  // Calculate grid data (for grid layout)
  const { gridData, maxCount: gridMaxCount } = useMemo(() => {
    if (layout !== 'grid') {
      return { gridData: [], maxCount: 0 };
    }

    const totalCells = gridRows * gridColumns;
    const now = new Date();

    // Create a map of contributions by date
    const contribMap = new Map<string, number>();
    let max = 0;

    contributions.forEach(({ date, count }) => {
      contribMap.set(date, count);
      max = Math.max(max, count);
    });

    // Build grid array (most recent dates first, filling from bottom-right)
    const grid: (DailyContribution | null)[][] = [];

    for (let row = 0; row < gridRows; row++) {
      grid[row] = [];
      for (let col = 0; col < gridColumns; col++) {
        const cellIndex = row * gridColumns + col;
        const daysAgo = totalCells - cellIndex - 1;
        const date = new Date(now);
        date.setDate(date.getDate() - daysAgo);
        const dateStr = date.toISOString().split('T')[0];
        const count = contribMap.get(dateStr) || 0;

        grid[row][col] = { date: dateStr, count };
      }
    }

    return { gridData: grid, maxCount: max };
  }, [layout, contributions, gridRows, gridColumns]);

  const { weeks, maxCount, monthLabels, monthBoundaries } = useMemo(() => {
    if (layout === 'grid') {
      return { weeks: [], maxCount: gridMaxCount, monthLabels: [], monthBoundaries: new Set<number>() };
    }
    const now = new Date();
    const daysToShow = weeksToShow * 7;

    // Start from the beginning of the week containing the start date
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - daysToShow);
    startDate.setHours(0, 0, 0, 0);

    // Adjust to previous Sunday
    const dayOfWeek = startDate.getDay();
    startDate.setDate(startDate.getDate() - dayOfWeek);

    // Create a map of contributions by date
    const contribMap = new Map<string, number>();
    let max = 0;

    contributions.forEach(({ date, count }) => {
      contribMap.set(date, count);
      max = Math.max(max, count);
    });

    // Build weeks array
    const weeksData: WeekData[] = [];
    const monthRanges: { month: string; startWeek: number; endWeek: number }[] = [];
    const monthBoundaryIndices = new Set<number>();
    let currentDate = new Date(startDate);
    let currentWeek: (DailyContribution | null)[] = [];
    let lastMonth = -1;
    let currentMonthStart = 0;

    while (currentDate <= now) {
      const dateStr = currentDate.toISOString().split('T')[0];
      const count = contribMap.get(dateStr) || 0;

      // Track month changes
      const month = currentDate.getMonth();
      if (month !== lastMonth) {
        // Close out the previous month
        if (lastMonth !== -1 && monthRanges.length > 0) {
          monthRanges[monthRanges.length - 1].endWeek = weeksData.length - 1;
        }

        // Start new month
        if (currentDate.getDate() <= 7) {
          currentMonthStart = weeksData.length;
          monthRanges.push({
            month: MONTH_NAMES[month],
            startWeek: currentMonthStart,
            endWeek: currentMonthStart, // Will be updated
          });

          // Mark this week index as a month boundary (except the first week)
          if (weeksData.length > 0) {
            monthBoundaryIndices.add(weeksData.length);
          }
        }
        lastMonth = month;
      }

      currentWeek.push({ date: dateStr, count });

      // If we've completed a week (Sunday)
      if (currentDate.getDay() === 6) {
        weeksData.push({ days: currentWeek });
        currentWeek = [];
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Add remaining days
    if (currentWeek.length > 0) {
      // Fill remaining days with null
      while (currentWeek.length < 7) {
        currentWeek.push(null);
      }
      weeksData.push({ days: currentWeek });
    }

    // Close out the last month
    if (monthRanges.length > 0) {
      monthRanges[monthRanges.length - 1].endWeek = weeksData.length - 1;
    }

    // Calculate centered positions for month labels
    const monthLabelsData = monthRanges.map(({ month, startWeek, endWeek }) => {
      const centerWeek = (startWeek + endWeek) / 2;
      return {
        month,
        weekIndex: centerWeek,
      };
    });

    return {
      weeks: weeksData,
      maxCount: max,
      monthLabels: monthLabelsData,
      monthBoundaries: monthBoundaryIndices,
    };
  }, [contributions, weeksToShow]);

  const getColor = (count: number): string => {
    if (count === 0) {
      return theme.colors.border;
    }

    const primaryColor = theme.colors.primary;
    const intensity = maxCount > 0
      ? Math.min(4, Math.ceil((count / maxCount) * 4))
      : 0;

    const opacities = [0.25, 0.45, 0.65, 0.85, 1.0];
    const opacity = opacities[intensity];

    const rgb = hexToRgb(primaryColor);
    if (rgb) {
      return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity})`;
    }

    return primaryColor;
  };

  // Generate skeleton weeks for loading state
  const skeletonWeeks = useMemo(() => {
    return Array.from({ length: weeksToShow }, (_, i) => ({
      days: Array.from({ length: 7 }, (_, j) => ({ weekIdx: i, dayIdx: j }))
    }));
  }, [weeksToShow]);

  // Get a lighter version of the primary color for shimmer
  const getShimmerColor = () => {
    const rgb = hexToRgb(theme.colors.primary);
    if (rgb) {
      return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.2)`;
    }
    return theme.colors.border;
  };

  // Create wave shimmer opacity for each block based on position
  const getWaveOpacity = (weekIdx: number, dayIdx: number) => {
    const totalBlocks = skeletonWeeks.length;
    const blockPosition = weekIdx / Math.max(totalBlocks - 1, 1);

    return shimmerAnim.interpolate({
      inputRange: [0, blockPosition, Math.min(blockPosition + 0.3, 1), 1],
      outputRange: [0.2, 0.7, 0.2, 0.2],
      extrapolate: 'clamp',
    });
  };

  if (loading) {
    return (
      <View
        style={[
          styles.container,
          // Fill available space when we need to measure (no maxHeight prop)
          !maxHeight && { flex: 1, marginVertical: 0, paddingHorizontal: 0 },
          // Remove padding for grid layout
          layout === 'grid' && { paddingHorizontal: 0, marginVertical: 0 }
        ]}
        onLayout={(e) => {
          const { height, width } = e.nativeEvent.layout;
          if (height > 0 && height !== measuredHeight) {
            setMeasuredHeight(height);
          }
          if (width > 0 && width !== measuredWidth) {
            setMeasuredWidth(width);
          }
        }}
      >
        <View style={styles.calendar}>
          <View style={styles.grid}>
            {/* Day labels column */}
            {showLabels && (
              <View style={styles.dayLabelsColumn}>
                <View style={styles.monthLabelSpacer} />
                {DAYS_OF_WEEK.map((day, idx) => (
                  <View key={idx} style={styles.dayLabelCell}>
                    {idx % 2 === 1 && (
                      <Text style={[styles.dayLabel, { color: theme.colors.textTertiary }]}>
                        {day}
                      </Text>
                    )}
                  </View>
                ))}
              </View>
            )}

            {/* Skeleton grid */}
            <View style={styles.weeksContainer}>
              {showLabels && <View style={styles.monthLabelsRow} />}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={[styles.weeksGrid, { justifyContent: 'flex-end', flexGrow: 1 }]}
              >
                {skeletonWeeks.map((week, weekIdx) => (
                  <View key={weekIdx} style={[styles.week, { width: daySize }]}>
                    {week.days.map((_, dayIdx) => (
                      <Animated.View
                        key={dayIdx}
                        style={[
                          styles.day,
                          { width: daySize, height: daySize },
                          {
                            backgroundColor: getShimmerColor(),
                            opacity: getWaveOpacity(weekIdx, dayIdx),
                          },
                        ]}
                      />
                    ))}
                  </View>
                ))}
              </ScrollView>
            </View>
          </View>

          {/* Legend */}
          {showLabels && (
            <View style={styles.legend}>
              <Text style={[styles.legendLabel, { color: theme.colors.textTertiary }]}>
                Less
              </Text>
              {[0, 1, 2, 3, 4].map((level) => {
                const legendOpacity = shimmerAnim.interpolate({
                  inputRange: [0, level / 4, Math.min(level / 4 + 0.3, 1), 1],
                  outputRange: [0.2, 0.7, 0.2, 0.2],
                  extrapolate: 'clamp',
                });

                return (
                  <Animated.View
                    key={level}
                    style={[
                      styles.legendBlock,
                      {
                        backgroundColor: getShimmerColor(),
                        opacity: legendOpacity,
                      },
                    ]}
                  />
                );
              })}
              <Text style={[styles.legendLabel, { color: theme.colors.textTertiary }]}>
                More
              </Text>
            </View>
          )}
        </View>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.container,
        // Fill available space when we need to measure (no maxHeight prop)
        !maxHeight && { flex: 1, marginVertical: 0, paddingHorizontal: 0 },
        // Remove padding for grid layout
        layout === 'grid' && { paddingHorizontal: 0, marginVertical: 0 }
      ]}
      onLayout={(e) => {
        const { height, width } = e.nativeEvent.layout;
        if (height > 0 && height !== measuredHeight) {
          setMeasuredHeight(height);
        }
        if (width > 0 && width !== measuredWidth) {
          setMeasuredWidth(width);
        }
      }}
    >
      <View style={styles.calendar}>
          {layout === 'grid' ? (
            // Grid layout: 2D grid of squares
            <View style={styles.gridContainer}>
              {gridData.map((row, rowIdx) => (
                <View key={rowIdx} style={[styles.gridRow, { gap: 1.5 }]}>
                  {row.map((day, colIdx) => (
                    <View
                      key={colIdx}
                      style={[
                        styles.day,
                        { width: daySize, height: daySize },
                        {
                          backgroundColor: day ? getColor(day.count) : 'transparent',
                        },
                      ]}
                    />
                  ))}
                </View>
              ))}
            </View>
          ) : (
            // Weeks layout: traditional horizontal scrolling weeks
            <View style={styles.grid}>
              {/* Day labels column */}
              {showLabels && (
                <View style={styles.dayLabelsColumn}>
                  {/* Spacer to align with month labels */}
                  <View style={styles.monthLabelSpacer} />
                  {DAYS_OF_WEEK.map((day, idx) => (
                    <View key={idx} style={styles.dayLabelCell}>
                      {idx % 2 === 1 && (
                        <Text style={[styles.dayLabel, { color: theme.colors.textTertiary }]}>
                          {day}
                        </Text>
                      )}
                    </View>
                  ))}
                </View>
              )}

              {/* Contribution grid */}
              <View style={styles.weeksContainer}>
              {/* Month labels positioned above weeks */}
              {showLabels && (
                <View style={styles.monthLabelsRow}>
                  {monthLabels.map(({ month, weekIndex }, idx) => {
                    // Account for gaps: each week + gap, position at center
                    // leftPercent should position the CENTER of the label at the center of the month
                    const leftPercent = ((weekIndex + 0.5) / weeks.length) * 100;
                    return (
                      <View
                        key={idx}
                        style={[
                          styles.monthLabel,
                          {
                            left: `${leftPercent}%`,
                          },
                        ]}
                      >
                        <Text style={[styles.monthText, { color: theme.colors.textSecondary }]}>
                          {month}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              )}

              {/* Weeks grid */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={[styles.weeksGrid, { justifyContent: 'flex-end', flexGrow: 1 }]}
              >
              {weeks.map((week, weekIdx) => (
                <View
                  key={weekIdx}
                  style={[
                    styles.week,
                    { width: daySize }
                  ]}
                >
                  {week.days.map((day, dayIdx) => (
                    <View
                      key={dayIdx}
                      style={[
                        styles.day,
                        { width: daySize, height: daySize },
                        {
                          backgroundColor: day ? getColor(day.count) : 'transparent',
                        },
                      ]}
                    />
                  ))}
                </View>
              ))}
              </ScrollView>
            </View>
          </View>
          )}

          {/* Legend */}
          {showLabels && (
          <View style={styles.legend}>
            <Text style={[styles.legendLabel, { color: theme.colors.textTertiary }]}>
              Less
            </Text>
            {[0, 1, 2, 3, 4].map((level) => (
              <View
                key={level}
                style={[
                  styles.legendBlock,
                  {
                    backgroundColor:
                      level === 0
                        ? theme.colors.border
                        : (() => {
                            const opacities = [0, 0.25, 0.45, 0.65, 0.85, 1.0];
                            const rgb = hexToRgb(theme.colors.primary);
                            return rgb
                              ? `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacities[level]})`
                              : theme.colors.primary;
                          })(),
                  },
                ]}
              />
            ))}
            <Text style={[styles.legendLabel, { color: theme.colors.textTertiary }]}>
              More
            </Text>
          </View>
          )}
        </View>
      </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
    paddingHorizontal: 16,
  },
  calendar: {
    paddingTop: 4,
    flex: 1,
  },
  gridContainer: {
    flex: 1,
    gap: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gridRow: {
    flexDirection: 'row',
  },
  monthLabelsRow: {
    height: 18,
    position: 'relative',
    marginBottom: 4,
  },
  monthLabel: {
    position: 'absolute',
    top: 0,
    alignItems: 'center',
    width: 30,
    marginLeft: -15, // Half of width to center
  },
  monthText: {
    fontSize: 9,
    fontWeight: '600',
    textAlign: 'center',
  },
  grid: {
    flexDirection: 'row',
    flex: 1,
  },
  dayLabelsColumn: {
    width: 16,
    gap: 1.5,
  },
  monthLabelSpacer: {
    height: 22, // monthLabelsRow height (18) + marginBottom (4)
  },
  dayLabelCell: {
    flex: 1,
    justifyContent: 'center',
  },
  dayLabel: {
    fontSize: 7,
    fontWeight: '500',
  },
  weeksContainer: {
    flex: 1,
    position: 'relative',
  },
  weeksGrid: {
    flexDirection: 'row',
    gap: 1.5,
  },
  week: {
    gap: 1.5,
  },
  day: {
    borderRadius: 1.5,
  },
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 2,
  },
  legendLabel: {
    fontSize: 8,
    marginHorizontal: 3,
  },
  legendBlock: {
    width: 9,
    height: 9,
    borderRadius: 1.5,
  },
});

export default ContributionCalendar;
