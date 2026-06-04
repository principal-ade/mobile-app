import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LucideIcon } from '../LucideIcon';

/**
 * Shared chrome for the Inbox and Recently Visited tabs — a simple titled
 * header plus the empty / unauthenticated states. Kept in one place so the two
 * trail-list screens stay visually in sync after the Recently Visited mode was
 * split out of the Inbox tab into its own tab.
 */

interface ScreenHeaderProps {
  title: string;
  textColor: string;
  borderColor: string;
}

export const ScreenHeader: React.FC<ScreenHeaderProps> = ({
  title,
  textColor,
  borderColor,
}) => (
  <View
    style={[
      styles.header,
      { borderBottomColor: borderColor, borderBottomWidth: StyleSheet.hairlineWidth },
    ]}
  >
    <Text style={[styles.headerTitle, { color: textColor }]}>{title}</Text>
  </View>
);

interface EmptyContentProps {
  iconColor: string;
  textColor: string;
  subtextColor: string;
  title: string;
  subtitle: string;
}

export const EmptyContent: React.FC<EmptyContentProps> = ({
  iconColor,
  textColor,
  subtextColor,
  title,
  subtitle,
}) => (
  <View style={styles.content}>
    <View style={styles.iconContainer}>
      <LucideIcon name="Footprints" size={64} color={iconColor} />
    </View>
    <Text style={[styles.title, { color: textColor }]}>{title}</Text>
    <Text style={[styles.subtitle, { color: subtextColor }]}>{subtitle}</Text>
  </View>
);

interface EmptyStateProps {
  insetsTop: number;
  backgroundColor: string;
  textColor: string;
  subtextColor: string;
  iconColor: string;
  title: string;
  subtitle: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  insetsTop,
  backgroundColor,
  textColor,
  subtextColor,
  iconColor,
  title,
  subtitle,
}) => (
  <View style={[styles.container, { backgroundColor, paddingTop: insetsTop }]}>
    <EmptyContent
      iconColor={iconColor}
      textColor={textColor}
      subtextColor={subtextColor}
      title={title}
      subtitle={subtitle}
    />
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  iconContainer: {
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    maxWidth: 320,
  },
});
