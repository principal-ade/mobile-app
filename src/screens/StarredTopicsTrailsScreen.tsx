import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@principal-ade/industry-theme';
import { LucideIcon } from '../components/LucideIcon';

type TabKey = 'topics' | 'trails';

export function StarredTopicsTrailsScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<TabKey>('topics');

  const isTopics = activeTab === 'topics';

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.colors.background, paddingTop: insets.top },
      ]}
    >
      <TabToggle
        active={activeTab}
        onChange={setActiveTab}
        accentColor={theme.colors.accent}
        textColor={theme.colors.text}
        mutedColor={theme.colors.textTertiary}
        borderColor={theme.colors.border}
      />

      <EmptyContent
        iconColor={theme.colors.textSecondary}
        textColor={theme.colors.text}
        subtextColor={theme.colors.textSecondary}
        iconName={isTopics ? 'Hash' : 'Footprints'}
        title={isTopics ? 'No starred topics yet' : 'No starred trails yet'}
        subtitle={
          isTopics
            ? 'Topics you star will show up here so you can jump back to them.'
            : 'Trails you star will show up here so you can come back to them later.'
        }
      />
    </View>
  );
}

interface TabToggleProps {
  active: TabKey;
  onChange: (key: TabKey) => void;
  accentColor: string;
  textColor: string;
  mutedColor: string;
  borderColor: string;
}

const TabToggle: React.FC<TabToggleProps> = ({
  active,
  onChange,
  accentColor,
  textColor,
  mutedColor,
  borderColor,
}) => {
  const items: { key: TabKey; label: string }[] = [
    { key: 'topics', label: 'Topics' },
    { key: 'trails', label: 'Trails' },
  ];
  return (
    <View
      style={[
        styles.toggleRow,
        { borderBottomColor: borderColor, borderBottomWidth: StyleSheet.hairlineWidth },
      ]}
    >
      {items.map((item) => {
        const isActive = item.key === active;
        const color = isActive ? textColor : mutedColor;
        return (
          <Pressable
            key={item.key}
            onPress={() => onChange(item.key)}
            style={styles.toggleItem}
          >
            <Text
              style={[
                styles.toggleLabel,
                {
                  color,
                  fontWeight: String(
                    isActive ? '600' : '500',
                  ) as TextStyle['fontWeight'],
                },
              ]}
            >
              {item.label}
            </Text>
            <View
              style={[
                styles.toggleUnderline,
                {
                  backgroundColor: isActive ? accentColor : 'transparent',
                },
              ]}
            />
          </Pressable>
        );
      })}
    </View>
  );
};

interface EmptyContentProps {
  iconColor: string;
  textColor: string;
  subtextColor: string;
  iconName: 'Hash' | 'Footprints';
  title: string;
  subtitle: string;
}

const EmptyContent: React.FC<EmptyContentProps> = ({
  iconColor,
  textColor,
  subtextColor,
  iconName,
  title,
  subtitle,
}) => (
  <View style={styles.content}>
    <View style={styles.iconContainer}>
      <LucideIcon name={iconName} size={64} color={iconColor} />
    </View>
    <Text style={[styles.title, { color: textColor }]}>{title}</Text>
    <Text style={[styles.subtitle, { color: subtextColor }]}>{subtitle}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  toggleRow: {
    flexDirection: 'row',
  },
  toggleItem: {
    flex: 1,
    paddingTop: 12,
    paddingBottom: 0,
    alignItems: 'center',
  },
  toggleLabel: {
    fontSize: 14,
    paddingBottom: 10,
  },
  toggleUnderline: {
    height: 2,
    alignSelf: 'stretch',
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

export default StarredTopicsTrailsScreen;
