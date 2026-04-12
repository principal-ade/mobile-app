import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { FileCityCanvas3D_Direct } from './FileCityCanvas3D_Direct';
import { generateMockCityData, generateMockHighlightLayers } from './mockData';

const meta: Meta<typeof FileCityCanvas3D_Direct> = {
  title: 'Components/FileCityCanvas3D_Direct',
  component: FileCityCanvas3D_Direct,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: `
# FileCityCanvas3D_Direct

3D File City using expo-three Renderer directly (bypassing React Three Fiber).

✅ **WORKING** - Uses the same approach as DirectThreeTest which renders successfully.

## Features
- 3D buildings with heights based on file metrics
- Auto-rotating camera around the city
- Highlight layers with color coding
- Isolation modes (transparent, collapse, hide)

## Why Direct Renderer?
React Three Fiber doesn't work in React Native, but expo-three's direct Renderer does!
        `,
      },
    },
  },
  decorators: [
    (Story) => (
      <View style={styles.container}>
        <Story />
      </View>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof FileCityCanvas3D_Direct>;

const simpleCityData = generateMockCityData({ complexity: 'simple' });
const mediumCityData = generateMockCityData({ complexity: 'medium' });

export const SimpleProject: Story = {
  args: {
    cityData: simpleCityData,
    backgroundColor: '#1a1a2e',
    heightScaling: 'logarithmic',
  },
  render: (args) => (
    <View style={styles.fullHeight}>
      <View style={styles.header}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>3D DIRECT</Text>
        </View>
        <Text style={styles.title}>Simple Project (3D Direct)</Text>
        <Text style={styles.subtitle}>
          {simpleCityData.metadata.totalFiles} files, {simpleCityData.metadata.totalDirectories} directories
        </Text>
        <Text style={styles.info}>Camera auto-rotates around city</Text>
      </View>
      <FileCityCanvas3D_Direct {...args} />
    </View>
  ),
};

export const MediumProject: Story = {
  args: {
    cityData: mediumCityData,
    backgroundColor: '#0f0f1a',
    heightScaling: 'logarithmic',
  },
  render: (args) => (
    <View style={styles.fullHeight}>
      <View style={styles.header}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>3D DIRECT</Text>
        </View>
        <Text style={styles.title}>Medium Project (3D Direct)</Text>
        <Text style={styles.subtitle}>
          {mediumCityData.metadata.totalFiles} files
        </Text>
      </View>
      <FileCityCanvas3D_Direct {...args} />
    </View>
  ),
};

export const WithHighlights: Story = {
  args: {
    cityData: mediumCityData,
    highlightLayers: generateMockHighlightLayers(mediumCityData),
    backgroundColor: '#1a1a2e',
    heightScaling: 'logarithmic',
    isolationMode: 'none',
  },
  render: (args) => (
    <View style={styles.fullHeight}>
      <View style={styles.header}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>HIGHLIGHTS</Text>
        </View>
        <Text style={styles.title}>With Highlight Layers</Text>
        <Text style={styles.subtitle}>TypeScript and Test files highlighted</Text>
      </View>
      <FileCityCanvas3D_Direct {...args} />
    </View>
  ),
};

export const IsolationTransparent: Story = {
  args: {
    cityData: mediumCityData,
    highlightLayers: generateMockHighlightLayers(mediumCityData),
    backgroundColor: '#1a1a2e',
    isolationMode: 'transparent',
  },
  render: (args) => (
    <View style={styles.fullHeight}>
      <View style={styles.header}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>ISOLATION</Text>
        </View>
        <Text style={styles.title}>Transparent Mode</Text>
        <Text style={styles.subtitle}>Non-highlighted buildings are transparent</Text>
      </View>
      <FileCityCanvas3D_Direct {...args} />
    </View>
  ),
};

export const IsolationCollapse: Story = {
  args: {
    cityData: mediumCityData,
    highlightLayers: generateMockHighlightLayers(mediumCityData),
    backgroundColor: '#1a1a2e',
    isolationMode: 'collapse',
  },
  render: (args) => (
    <View style={styles.fullHeight}>
      <View style={styles.header}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>ISOLATION</Text>
        </View>
        <Text style={styles.title}>Collapse Mode</Text>
        <Text style={styles.subtitle}>Non-highlighted buildings collapse to ground</Text>
      </View>
      <FileCityCanvas3D_Direct {...args} />
    </View>
  ),
};

export const IsolationHide: Story = {
  args: {
    cityData: mediumCityData,
    highlightLayers: generateMockHighlightLayers(mediumCityData),
    backgroundColor: '#1a1a2e',
    isolationMode: 'hide',
  },
  render: (args) => (
    <View style={styles.fullHeight}>
      <View style={styles.header}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>ISOLATION</Text>
        </View>
        <Text style={styles.title}>Hide Mode</Text>
        <Text style={styles.subtitle}>Only highlighted buildings shown</Text>
      </View>
      <FileCityCanvas3D_Direct {...args} />
    </View>
  ),
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  fullHeight: {
    flex: 1,
  },
  header: {
    padding: 16,
    backgroundColor: '#1a1a2e',
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a3e',
  },
  badge: {
    alignSelf: 'flex-start',
    marginBottom: 8,
    backgroundColor: '#10b98120',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#10b981',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    color: '#94a3b8',
    marginBottom: 2,
  },
  info: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 4,
  },
});
