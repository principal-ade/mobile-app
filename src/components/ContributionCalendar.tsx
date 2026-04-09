/**
 * ContributionCalendar
 *
 * Displays a GitHub-style contribution calendar showing daily activity
 * for the last 3 months. Each day is represented by a small square,
 * with color intensity based on contribution count.
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useTheme } from '@principal-ade/industry-theme';

export interface DailyContribution {
  date: string; // YYYY-MM-DD
  count: number;
}

export interface ContributionCalendarProps {
  contributions: DailyContribution[];
  months?: number; // Number of months to show (default 5)
  showLabels?: boolean; // Show month and day labels (default true)
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
}) => {
  const { theme } = useTheme();

  const { weeks, maxCount, monthLabels, monthBoundaries } = useMemo(() => {
    const now = new Date();
    const daysToShow = months * 30; // Approximate

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
  }, [contributions, months]);

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

  return (
    <View style={styles.container}>
      <View style={styles.calendar}>
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
              <View style={styles.weeksGrid}>
              {weeks.map((week, weekIdx) => (
                <View
                  key={weekIdx}
                  style={styles.week}
                >
                  {week.days.map((day, dayIdx) => (
                    <View
                      key={dayIdx}
                      style={[
                        styles.day,
                        {
                          backgroundColor: day ? getColor(day.count) : 'transparent',
                        },
                      ]}
                    />
                  ))}
                </View>
              ))}
              </View>
            </View>
          </View>

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
    flex: 1,
  },
  day: {
    width: '100%',
    aspectRatio: 1,
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
