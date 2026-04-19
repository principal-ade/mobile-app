/**
 * ContributionGrid
 *
 * Barebones contribution grid component with no built-in spacing, margins, or labels.
 * Parent component controls all layout. Designed for flexible reuse in different contexts.
 */

import React, { useMemo, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Animated } from 'react-native';
import { useTheme } from '@principal-ade/industry-theme';
import { hexToRgb, getIntensityColor } from '../utils/heatmapUtils';

export interface DailyContribution {
  date: string; // YYYY-MM-DD
  count: number;
}

export interface ContributionGridProps {
  contributions: DailyContribution[];
  layout?: 'weeks' | 'grid'; // Layout mode (default: 'weeks')
  gridColumns?: number; // Number of columns for grid layout (default: 14)
  gridRows?: number; // Number of rows for grid layout (default: 14)
  months?: number; // Number of months to show for weeks layout (default: 5)
  loading?: boolean; // Show shimmer loading state
  gap?: number; // Gap between cells (default: 1.5)
  daySize?: number; // Size of each cell (auto-calculated if not provided)
  emptyColor?: string; // Override for empty cells
  primaryColor?: string; // Override for filled cells
  scrollToEnd?: boolean; // Scroll to the end (most recent) on mount (default: false)
}

interface WeekData {
  days: (DailyContribution | null)[];
}

export const ContributionGrid: React.FC<ContributionGridProps> = ({
  contributions,
  layout = 'weeks',
  gridColumns = 14,
  gridRows = 14,
  months = 5,
  loading = false,
  gap = 1.5,
  daySize: providedDaySize,
  emptyColor,
  primaryColor,
  scrollToEnd = false,
}) => {
  const { theme } = useTheme();
  const shimmerAnim = useRef(new Animated.Value(0)).current;
  const scrollViewRef = useRef<ScrollView>(null);
  const [measuredHeight, setMeasuredHeight] = React.useState<number | null>(null);
  const [measuredWidth, setMeasuredWidth] = React.useState<number | null>(null);

  const baseColor = primaryColor || theme.colors.primary;
  const borderColor = emptyColor || theme.colors.border;

  // Calculate day size based on layout mode and measured dimensions
  const daySize = useMemo(() => {
    if (providedDaySize) {
      return providedDaySize;
    }

    if (layout === 'grid') {
      // Grid layout: fit gridRows × gridColumns
      if (measuredHeight && measuredWidth) {
        const verticalGaps = (gridRows - 1) * gap;
        const horizontalGaps = (gridColumns - 1) * gap;
        const availableHeight = measuredHeight - verticalGaps;
        const availableWidth = measuredWidth - horizontalGaps;

        // Use the smaller dimension to ensure squares fit
        const heightBasedSize = Math.floor(availableHeight / gridRows);
        const widthBasedSize = Math.floor(availableWidth / gridColumns);
        return Math.min(heightBasedSize, widthBasedSize);
      }
      return 12; // Default
    }

    // Weeks layout: fit 7 days vertically
    const totalGaps = 6 * gap; // 6 gaps between 7 days
    if (measuredHeight) {
      const availableHeight = measuredHeight - totalGaps;
      const size = Math.floor(availableHeight / 7);
      return size;
    }

    // Default size when no height constraint
    return 12;
  }, [layout, measuredHeight, measuredWidth, gap, gridRows, gridColumns, providedDaySize]);

  // Shimmer animation for loading state
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

  // Scroll to end on mount (for weeks layout)
  useEffect(() => {
    if (scrollToEnd && !loading && layout === 'weeks' && scrollViewRef.current && daySize > 0) {
      // Use a small delay to ensure content is laid out
      const timer = setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: false });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [scrollToEnd, loading, layout, daySize]);

  // Calculate weeks to show (for weeks layout)
  const weeksToShow = useMemo(() => {
    if (layout === 'grid') {
      return 0; // Not used in grid mode
    }
    return Math.floor((months * 30) / 7);
  }, [layout, months]);

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

  // Calculate weeks data (for weeks layout)
  const { weeks, maxCount } = useMemo(() => {
    if (layout === 'grid') {
      return { weeks: [], maxCount: gridMaxCount };
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
    let currentDate = new Date(startDate);
    let currentWeek: (DailyContribution | null)[] = [];

    while (currentDate <= now) {
      const dateStr = currentDate.toISOString().split('T')[0];
      const count = contribMap.get(dateStr) || 0;

      currentWeek.push({ date: dateStr, count });

      // If we've completed a week (Saturday)
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

    return { weeks: weeksData, maxCount: max };
  }, [contributions, weeksToShow, layout, gridMaxCount]);

  const getColor = (count: number): string => {
    return getIntensityColor(count, maxCount, baseColor, borderColor);
  };

  // Get lighter version of primary color for shimmer
  const getShimmerColor = () => {
    const rgb = hexToRgb(baseColor);
    if (rgb) {
      return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.2)`;
    }
    return borderColor;
  };

  // Get month letter for a date (first letter of month name)
  const getMonthLetter = (dateStr: string): string | null => {
    const date = new Date(dateStr);
    const dayOfMonth = date.getDate();

    // Only show on first day of month
    if (dayOfMonth !== 1) {
      return null;
    }

    const monthNames = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
    return monthNames[date.getMonth()];
  };

  // Create wave shimmer opacity for each block based on position
  const getWaveOpacity = (weekIdx: number, _dayIdx: number) => {
    const totalBlocks = weeksToShow;
    const blockPosition = weekIdx / Math.max(totalBlocks - 1, 1);

    return shimmerAnim.interpolate({
      inputRange: [0, blockPosition, Math.min(blockPosition + 0.3, 1), 1],
      outputRange: [0.2, 0.7, 0.2, 0.2],
      extrapolate: 'clamp',
    });
  };

  // Generate skeleton weeks for loading state
  const skeletonWeeks = useMemo(() => {
    return Array.from({ length: weeksToShow }, (_, i) => ({
      days: Array.from({ length: 7 }, (_, j) => ({ weekIdx: i, dayIdx: j }))
    }));
  }, [weeksToShow]);

  if (loading) {
    return (
      <View
        style={styles.container}
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
        {layout === 'grid' ? (
          // Grid layout skeleton
          <View style={styles.gridContainer}>
            {Array.from({ length: gridRows }).map((_, rowIdx) => (
              <View key={rowIdx} style={[styles.gridRow, { gap }]}>
                {Array.from({ length: gridColumns }).map((_, colIdx) => (
                  <Animated.View
                    key={colIdx}
                    style={[
                      styles.day,
                      { width: daySize, height: daySize },
                      {
                        backgroundColor: getShimmerColor(),
                        opacity: 0.5,
                      },
                    ]}
                  />
                ))}
              </View>
            ))}
          </View>
        ) : (
          // Weeks layout skeleton
          <ScrollView
            ref={scrollViewRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={[styles.weeksGrid, { gap }]}
          >
            {skeletonWeeks.map((week, weekIdx) => (
              <View key={weekIdx} style={[styles.week, { width: daySize, gap }]}>
                {week.days.map(({ dayIdx }) => (
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
        )}
      </View>
    );
  }

  return (
    <View
      style={styles.container}
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
      {layout === 'grid' ? (
        // Grid layout: 2D grid of squares
        <View style={styles.gridContainer}>
          {gridData.map((row, rowIdx) => (
            <View key={rowIdx} style={[styles.gridRow, { gap }]}>
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
        // Weeks layout: horizontal scrolling weeks
        <ScrollView
          ref={scrollViewRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[styles.weeksGrid, { gap }]}
        >
          {weeks.map((week, weekIdx) => {
            const weekHeight = (daySize * 7) + (gap * 6);
            return (
            <View key={weekIdx} style={[styles.week, { width: daySize, height: weekHeight, gap }]}>
              {week.days.map((day, dayIdx) => {
                const monthLetter = day ? getMonthLetter(day.date) : null;
                return (
                  <View
                    key={dayIdx}
                    style={[
                      styles.dayContainer,
                      { width: daySize, height: daySize },
                    ]}
                  >
                    <View
                      style={[
                        styles.day,
                        { width: daySize, height: daySize },
                        {
                          backgroundColor: day ? getColor(day.count) : 'transparent',
                        },
                      ]}
                    />
                    {monthLetter && (
                      <Text
                        style={[
                          styles.monthLabel,
                          {
                            fontSize: Math.max(daySize * 0.5, 8),
                            color: theme.colors.text,
                          },
                        ]}
                      >
                        {monthLetter}
                      </Text>
                    )}
                  </View>
                );
              })}
            </View>
          );
          })}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gridContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gridRow: {
    flexDirection: 'row',
  },
  weeksGrid: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  week: {
  },
  dayContainer: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  day: {
    borderRadius: 1.5,
  },
  monthLabel: {
    position: 'absolute',
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default ContributionGrid;
