/**
 * A caption card shown over the map during step 2's scheduled trail playback.
 * One card per stop; the parent keys it by stop index so Reanimated plays an
 * enter/exit as the schedule advances from one marker to the next.
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import type { Theme } from '@principal-ade/industry-theme';

interface LearnTrailsStopCardProps {
  index: number;
  label: string;
  note: string;
  color: string;
  theme: Theme;
}

export function LearnTrailsStopCard({
  index,
  label,
  note,
  color,
  theme,
}: LearnTrailsStopCardProps) {
  return (
    <Animated.View
      entering={FadeIn.duration(320)}
      exiting={FadeOut.duration(200)}
      style={[
        styles.card,
        { backgroundColor: theme.colors.backgroundSecondary, borderColor: color },
      ]}
    >
      <View style={styles.header}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{index + 1}</Text>
        </View>
        <Text numberOfLines={1} style={[styles.label, { color: theme.colors.text }]}>
          {label}
        </Text>
      </View>
      <Text style={[styles.note, { color: theme.colors.textSecondary }]}>{note}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    gap: 8,
    // Soft lift off the map.
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  // Match the map's numbered markers: a white badge with a dark border and a
  // dark number (the trail color lives on the connector, not the badge fill).
  badge: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#0b1020',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#0b1020',
    fontSize: 13,
    fontWeight: '800',
  },
  label: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
  },
  note: {
    fontSize: 13.5,
    lineHeight: 19,
  },
});
