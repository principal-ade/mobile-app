/**
 * Renders the bundled sample trail as a real brief, for logged-out users
 * exploring "Learn about trails". It mirrors `TrailDetailScreen`'s layout
 * (full-bleed `TrailBriefCard`, card owns its scroll) but reads from the
 * in-memory `sampleTrail` fixture instead of `getTrailById` — no token, no
 * network. Read-only: no bookmark, share, or note callbacks are wired,
 * since there's no account yet.
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '@principal-ade/industry-theme';

import { TrailBriefCard } from '../../components/Trails/TrailBriefCard';
import {
  SAMPLE_TRAIL_BRIEF_PROPS,
  sampleTrailReadFile,
} from '../../data/sampleTrail';

export function SampleTrailScreen() {
  const { theme } = useTheme();
  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <TrailBriefCard
        {...SAMPLE_TRAIL_BRIEF_PROPS}
        presentation="screen"
        expandInline
        readFile={sampleTrailReadFile}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
