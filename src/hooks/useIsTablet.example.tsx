/**
 * Example usage of useIsTablet and useDeviceType hooks
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useIsTablet, useDeviceType } from './useIsTablet';

// Example 1: Simple conditional rendering
export function ResponsiveLayout() {
  const isTablet = useIsTablet();

  return (
    <View style={styles.container}>
      {isTablet ? (
        <TabletLayout />
      ) : (
        <PhoneLayout />
      )}
    </View>
  );
}

// Example 2: Conditional styling
export function ResponsiveCard() {
  const isTablet = useIsTablet();

  return (
    <View style={[
      styles.card,
      isTablet && styles.cardTablet
    ]}>
      <Text>Responsive Card</Text>
    </View>
  );
}

// Example 3: Using detailed device info
export function DetailedResponsiveView() {
  const { isTablet, isPad, width, orientation } = useDeviceType();

  return (
    <View style={styles.container}>
      <Text>Device Type: {isTablet ? 'Tablet' : 'Phone'}</Text>
      <Text>Is iPad: {isPad ? 'Yes' : 'No'}</Text>
      <Text>Width: {width}px</Text>
      <Text>Orientation: {orientation}</Text>
    </View>
  );
}

// Example 4: Multi-column layout for tablets
export function GridLayout() {
  const isTablet = useIsTablet();

  return (
    <View style={[
      styles.grid,
      { flexDirection: isTablet ? 'row' : 'column' }
    ]}>
      {/* Grid items - could use columns = isTablet ? 3 : 1 for grid layout */}
    </View>
  );
}

// Mock components for examples
const TabletLayout = () => (
  <View style={styles.tabletLayout}>
    <View style={styles.sidebar}>
      <Text>Sidebar</Text>
    </View>
    <View style={styles.mainContent}>
      <Text>Main Content</Text>
    </View>
  </View>
);

const PhoneLayout = () => (
  <View style={styles.phoneLayout}>
    <Text>Phone Layout</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  card: {
    padding: 16,
    margin: 8,
  },
  cardTablet: {
    padding: 24,
    margin: 16,
    maxWidth: 600,
  },
  tabletLayout: {
    flex: 1,
    flexDirection: 'row',
  },
  sidebar: {
    width: 300,
    backgroundColor: '#f0f0f0',
  },
  mainContent: {
    flex: 1,
  },
  phoneLayout: {
    flex: 1,
  },
  grid: {
    flex: 1,
    flexWrap: 'wrap',
  },
});
