/**
 * "Learn about trails" — the no-account-needed detour reached from the
 * Welcome screen. One scroll: a short explanation of what a trail is,
 * then a tappable sample-trail card that opens the real brief
 * (`SampleTrailScreen`) so the concept lands by example rather than copy.
 */

import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';
import { useTheme } from '@principal-ade/industry-theme';

import { LucideIcon } from '../../components/LucideIcon';
import { SAMPLE_TRAIL_PAYLOAD } from '../../data/sampleTrail';
import type { RootStackParamList } from '../../navigation/types';

const POINTS: Array<{ icon: string; title: string; body: string }> = [
  {
    icon: 'Pin',
    title: 'Markers pin the path',
    body: 'Each stop points at a file and line range — the exact places that matter, in the order they matter.',
  },
  {
    icon: 'FileText',
    title: 'Notes carry the reasoning',
    body: 'Authors and reviewers leave notes on stops, so the "why" travels with the code instead of getting lost in chat.',
  },
  {
    icon: 'Check',
    title: 'Sign-offs close the loop',
    body: 'Share a trail to ask for a look; teammates sign off once the direction checks out.',
  },
];

export function LearnTrailsScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();

  return (
    <ScrollView
      style={{ backgroundColor: theme.colors.background }}
      contentContainerStyle={[
        styles.content,
        { paddingBottom: insets.bottom + 32 },
      ]}
    >
      <Text style={[styles.heading, { color: theme.colors.text }]}>
        What's a trail?
      </Text>
      <Text style={[styles.intro, { color: theme.colors.textSecondary }]}>
        A trail is a guided walk through a codebase — a sequence of stops that
        explains how something works or what needs a second look, with the
        reasoning attached to the code itself.
      </Text>

      <View style={styles.points}>
        {POINTS.map((p) => (
          <View key={p.title} style={styles.point}>
            <View
              style={[
                styles.pointIcon,
                { backgroundColor: theme.colors.backgroundSecondary },
              ]}
            >
              <LucideIcon name={p.icon} size={20} color={theme.colors.primary} />
            </View>
            <View style={styles.pointText}>
              <Text style={[styles.pointTitle, { color: theme.colors.text }]}>
                {p.title}
              </Text>
              <Text
                style={[styles.pointBody, { color: theme.colors.textSecondary }]}
              >
                {p.body}
              </Text>
            </View>
          </View>
        ))}
      </View>

      <Text style={[styles.tryLabel, { color: theme.colors.textSecondary }]}>
        TRY ONE
      </Text>
      <TouchableOpacity
        activeOpacity={0.85}
        style={[
          styles.sampleCard,
          {
            backgroundColor: theme.colors.backgroundSecondary,
            borderColor: theme.colors.border,
          },
        ]}
        onPress={() => navigation.navigate('SampleTrail')}
        accessibilityRole="button"
        accessibilityLabel="Open the sample trail"
      >
        <View style={styles.sampleHeader}>
          <LucideIcon name="Footprints" size={18} color={theme.colors.primary} />
          <Text
            style={[styles.sampleEyebrow, { color: theme.colors.primary }]}
          >
            Sample trail
          </Text>
        </View>
        <Text style={[styles.sampleTitle, { color: theme.colors.text }]}>
          {SAMPLE_TRAIL_PAYLOAD.title}
        </Text>
        <Text
          style={[styles.sampleMeta, { color: theme.colors.textSecondary }]}
        >
          {SAMPLE_TRAIL_PAYLOAD.markers.length} stops · by{' '}
          {SAMPLE_TRAIL_PAYLOAD.author}
        </Text>
        <View style={styles.sampleCta}>
          <Text style={[styles.sampleCtaText, { color: theme.colors.primary }]}>
            Tap to explore
          </Text>
          <Text style={[styles.sampleCtaArrow, { color: theme.colors.primary }]}>
            ›
          </Text>
        </View>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 24,
    paddingTop: 12,
  },
  heading: {
    fontSize: 26,
    fontWeight: '700',
    marginBottom: 10,
  },
  intro: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 28,
  },
  points: {
    gap: 22,
    marginBottom: 36,
  },
  point: {
    flexDirection: 'row',
    gap: 14,
  },
  pointIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pointText: {
    flex: 1,
    gap: 3,
  },
  pointTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  pointBody: {
    fontSize: 14,
    lineHeight: 21,
  },
  tryLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 10,
  },
  sampleCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    padding: 18,
    gap: 8,
  },
  sampleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  sampleEyebrow: {
    fontSize: 13,
    fontWeight: '600',
  },
  sampleTitle: {
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 24,
  },
  sampleMeta: {
    fontSize: 14,
  },
  sampleCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginTop: 4,
  },
  sampleCtaText: {
    fontSize: 15,
    fontWeight: '600',
  },
  sampleCtaArrow: {
    fontSize: 20,
    fontWeight: '600',
    lineHeight: 22,
  },
});
