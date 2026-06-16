/**
 * A teammate avatar for step 4 (team coverage): a colored circle with the
 * member's initials. Used both in the fixed avatar row (tap to isolate a
 * teammate's coverage) and in the "understood by" list when a file is tapped.
 */

import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import type { TeamMember } from '../../data/learnTrailsCity';

interface LearnTrailsAvatarProps {
  member: TeamMember;
  size?: number;
  /** Draw a ring in the member's color (the currently isolated teammate). */
  selected?: boolean;
  /** Fade back when another teammate is isolated. */
  dimmed?: boolean;
  onPress?: () => void;
}

export function LearnTrailsAvatar({
  member,
  size = 44,
  selected = false,
  dimmed = false,
  onPress,
}: LearnTrailsAvatarProps) {
  const ring = selected ? 2.5 : 0;
  const circle = (
    <View
      style={[
        styles.circle,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: member.color,
          borderWidth: ring,
          opacity: dimmed ? 0.35 : 1,
        },
      ]}
    >
      <Text style={[styles.initials, { fontSize: size * 0.36 }]}>{member.initials}</Text>
    </View>
  );

  if (!onPress) return circle;
  return (
    <TouchableOpacity activeOpacity={0.8} onPress={onPress}>
      {circle}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  circle: {
    alignItems: 'center',
    justifyContent: 'center',
    // Ring color comes from the swatch itself reading lighter — use a bright
    // overlay border so the selected state reads on any member color.
    borderColor: '#ffffff',
  },
  initials: {
    color: '#0b1020',
    fontWeight: '800',
  },
});
