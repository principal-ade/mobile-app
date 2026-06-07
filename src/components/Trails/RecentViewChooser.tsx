/**
 * RecentViewChooser — bottom-sheet shown when the Recent tab is long-pressed.
 * Lets the user switch the Recent view between a compact list and full-bleed
 * cards. Reads/writes the shared RecentTrailsViewContext.
 */

import React from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@principal-ade/industry-theme';
import { LucideIcon } from '../LucideIcon';
import { useRecentTrailsView } from '../../context/RecentTrailsViewContext';
import type { RecentTrailsViewMode } from '../../utils/recentTrailsStorage';

interface RecentViewChooserProps {
  visible: boolean;
  onClose: () => void;
}

const OPTIONS: {
  mode: RecentTrailsViewMode;
  label: string;
  description: string;
  icon: string;
}[] = [
  {
    mode: 'list',
    label: 'List',
    description: 'Compact rows — title, repo, last visited',
    icon: 'List',
  },
  {
    mode: 'cards',
    label: 'Cards',
    description: 'Full-screen cards with File City',
    icon: 'Grid3x3',
  },
];

export function RecentViewChooser({ visible, onClose }: RecentViewChooserProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { viewMode, setViewMode } = useRecentTrailsView();

  const choose = (mode: RecentTrailsViewMode) => {
    setViewMode(mode);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[
            styles.sheet,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
              paddingBottom: insets.bottom + 12,
            },
          ]}
          // Swallow taps so pressing inside the sheet doesn't dismiss it.
          onPress={() => {}}
        >
          <View style={styles.grabber}>
            <View
              style={[styles.grabberBar, { backgroundColor: theme.colors.border }]}
            />
          </View>
          <Text style={[styles.heading, { color: theme.colors.textSecondary }]}>
            RECENT VIEW
          </Text>

          {OPTIONS.map((opt) => {
            const selected = opt.mode === viewMode;
            return (
              <Pressable
                key={opt.mode}
                onPress={() => choose(opt.mode)}
                style={({ pressed }) => [
                  styles.option,
                  {
                    backgroundColor: pressed
                      ? theme.colors.backgroundSecondary
                      : 'transparent',
                  },
                ]}
              >
                <LucideIcon
                  name={opt.icon}
                  size={22}
                  color={selected ? theme.colors.primary : theme.colors.textSecondary}
                />
                <View style={styles.optionText}>
                  <Text
                    style={[
                      styles.optionLabel,
                      {
                        color: selected ? theme.colors.primary : theme.colors.text,
                      },
                    ]}
                  >
                    {opt.label}
                  </Text>
                  <Text
                    style={[
                      styles.optionDescription,
                      { color: theme.colors.textTertiary },
                    ]}
                  >
                    {opt.description}
                  </Text>
                </View>
                {selected && (
                  <LucideIcon name="Check" size={20} color={theme.colors.primary} />
                )}
              </Pressable>
            );
          })}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    paddingHorizontal: 12,
    paddingTop: 8,
  },
  grabber: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  grabberBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
  },
  heading: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    paddingHorizontal: 12,
    paddingTop: 4,
    paddingBottom: 8,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  optionText: {
    flex: 1,
  },
  optionLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  optionDescription: {
    fontSize: 12,
    marginTop: 2,
  },
});

export default RecentViewChooser;
