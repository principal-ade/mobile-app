/**
 * SegmentedControl
 *
 * iOS-style segmented control component for switching between options.
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '@principal-ade/industry-theme';

export interface SegmentedControlProps {
  segments: string[];
  selectedIndex: number;
  onChange: (index: number) => void;
}

export const SegmentedControl: React.FC<SegmentedControlProps> = ({
  segments,
  selectedIndex,
  onChange,
}) => {
  const { theme } = useTheme();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
        },
      ]}
    >
      {segments.map((segment, index) => {
        const isSelected = index === selectedIndex;
        return (
          <TouchableOpacity
            key={segment}
            style={[
              styles.segment,
              isSelected && [
                styles.selectedSegment,
                { backgroundColor: theme.colors.primary },
              ],
            ]}
            onPress={() => onChange(index)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.segmentText,
                { color: isSelected ? '#fff' : theme.colors.text },
                isSelected && styles.selectedSegmentText,
              ]}
            >
              {segment}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderRadius: 8,
    borderWidth: 1,
    padding: 2,
  },
  segment: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedSegment: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  segmentText: {
    fontSize: 14,
    fontWeight: '500',
  },
  selectedSegmentText: {
    fontWeight: '600',
  },
});
