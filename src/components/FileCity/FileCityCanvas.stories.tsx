import React, { useState } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { FileCityCanvas } from './FileCityCanvas';
import { generateMockCityData, generateMockHighlightLayers } from './mockData';

const meta: Meta<typeof FileCityCanvas> = {
  title: 'Components/FileCity/FileCityCanvas',
  component: FileCityCanvas,
  parameters: {
    layout: 'fullscreen',
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
type Story = StoryObj<typeof FileCityCanvas>;

// Generate mock data
const simpleCityData = generateMockCityData({ complexity: 'simple' });
const mediumCityData = generateMockCityData({ complexity: 'medium' });
const complexCityData = generateMockCityData({ complexity: 'complex' });

// ============================================================================
// Stories
// ============================================================================

export const SimpleProject: Story = {
  args: {
    cityData: simpleCityData,
    backgroundColor: '#1a1a2e',
    defaultBuildingColor: '#A1A7AE',
    defaultDistrictColor: '#4B5155',
    buildingBorderRadius: 2,
    showDirectoryLabels: true,
    enableZoom: true,
    enablePan: true,
  },
  render: (args) => {
    const [selectedPath, setSelectedPath] = useState<string | null>(null);

    return (
      <View style={styles.fullHeight}>
        <View style={styles.header}>
          <Text style={styles.title}>Simple Project</Text>
          <Text style={styles.subtitle}>
            {simpleCityData.metadata.totalFiles} files, {simpleCityData.metadata.totalDirectories} directories
          </Text>
          {selectedPath && (
            <Text style={styles.selected}>Selected: {selectedPath}</Text>
          )}
        </View>
        <View style={styles.canvasContainer}>
          <FileCityCanvas
            {...args}
            onBuildingPress={(building) => {
              setSelectedPath(building.path);
              console.log('Building pressed:', building.path);
            }}
            onDistrictPress={(district) => {
              setSelectedPath(district.path);
              console.log('District pressed:', district.path);
            }}
          />
        </View>
      </View>
    );
  },
};

export const MediumProject: Story = {
  args: {
    cityData: mediumCityData,
    backgroundColor: '#0f0f1a',
    defaultBuildingColor: '#A1A7AE',
    defaultDistrictColor: '#3a3a4a',
    buildingBorderRadius: 3,
    showDirectoryLabels: true,
    enableZoom: true,
    enablePan: true,
  },
  render: (args) => {
    const [selectedPath, setSelectedPath] = useState<string | null>(null);

    return (
      <View style={styles.fullHeight}>
        <View style={styles.header}>
          <Text style={styles.title}>Medium Project</Text>
          <Text style={styles.subtitle}>
            {mediumCityData.metadata.totalFiles} files, {mediumCityData.metadata.totalDirectories} directories
          </Text>
          {selectedPath && (
            <Text style={styles.selected}>Selected: {selectedPath}</Text>
          )}
        </View>
        <View style={styles.canvasContainer}>
          <FileCityCanvas
            {...args}
            onBuildingPress={(building) => setSelectedPath(building.path)}
            onDistrictPress={(district) => setSelectedPath(district.path)}
          />
        </View>
      </View>
    );
  },
};

export const ComplexProject: Story = {
  args: {
    cityData: complexCityData,
    backgroundColor: '#0a0a14',
    defaultBuildingColor: '#A1A7AE',
    defaultDistrictColor: '#2a2a3a',
    buildingBorderRadius: 2,
    showDirectoryLabels: true,
    enableZoom: true,
    enablePan: true,
  },
  render: (args) => {
    const [selectedPath, setSelectedPath] = useState<string | null>(null);

    return (
      <View style={styles.fullHeight}>
        <View style={styles.header}>
          <Text style={styles.title}>Complex Project</Text>
          <Text style={styles.subtitle}>
            {complexCityData.metadata.totalFiles} files, {complexCityData.metadata.totalDirectories} directories
          </Text>
          {selectedPath && (
            <Text style={styles.selected}>Selected: {selectedPath}</Text>
          )}
        </View>
        <View style={styles.canvasContainer}>
          <FileCityCanvas
            {...args}
            onBuildingPress={(building) => setSelectedPath(building.path)}
            onDistrictPress={(district) => setSelectedPath(district.path)}
          />
        </View>
      </View>
    );
  },
};

export const WithHighlightLayers: Story = {
  args: {
    cityData: mediumCityData,
    highlightLayers: generateMockHighlightLayers(mediumCityData),
    backgroundColor: '#1a1a2e',
    buildingBorderRadius: 2,
    showDirectoryLabels: true,
    enableZoom: true,
    enablePan: true,
  },
  render: (args) => {
    return (
      <View style={styles.fullHeight}>
        <View style={styles.header}>
          <Text style={styles.title}>With Highlight Layers</Text>
          <Text style={styles.subtitle}>
            TypeScript files (blue border) and Test files (green border) are highlighted
          </Text>
        </View>
        <View style={styles.canvasContainer}>
          <FileCityCanvas {...args} />
        </View>
      </View>
    );
  },
};

export const DarkTheme: Story = {
  args: {
    cityData: mediumCityData,
    backgroundColor: '#000000',
    defaultBuildingColor: '#6b7280',
    defaultDistrictColor: '#1f2937',
    buildingBorderRadius: 4,
    districtBorderRadius: 4,
    showDirectoryLabels: true,
    enableZoom: true,
    enablePan: true,
  },
  render: (args) => (
    <View style={styles.fullHeight}>
      <View style={[styles.header, { backgroundColor: '#000' }]}>
        <Text style={styles.title}>Dark Theme</Text>
        <Text style={styles.subtitle}>Sleek dark appearance with rounded corners</Text>
      </View>
      <View style={styles.canvasContainer}>
        <FileCityCanvas {...args} />
      </View>
    </View>
  ),
};

export const LightTheme: Story = {
  args: {
    cityData: mediumCityData,
    backgroundColor: '#f8fafc',
    defaultBuildingColor: '#94a3b8',
    defaultDistrictColor: '#e2e8f0',
    buildingBorderRadius: 2,
    showDirectoryLabels: true,
    enableZoom: true,
    enablePan: true,
  },
  render: (args) => (
    <View style={styles.fullHeight}>
      <View style={[styles.header, { backgroundColor: '#f8fafc' }]}>
        <Text style={[styles.title, { color: '#1e293b' }]}>Light Theme</Text>
        <Text style={[styles.subtitle, { color: '#64748b' }]}>
          Light mode for daytime use
        </Text>
      </View>
      <View style={styles.canvasContainer}>
        <FileCityCanvas {...args} />
      </View>
    </View>
  ),
};

export const ZoomDisabled: Story = {
  args: {
    cityData: simpleCityData,
    backgroundColor: '#1a1a2e',
    enableZoom: false,
    enablePan: true,
    showDirectoryLabels: true,
  },
  render: (args) => (
    <View style={styles.fullHeight}>
      <View style={styles.header}>
        <Text style={styles.title}>Zoom Disabled</Text>
        <Text style={styles.subtitle}>Pinch to zoom is disabled, but panning works</Text>
      </View>
      <View style={styles.canvasContainer}>
        <FileCityCanvas {...args} />
      </View>
    </View>
  ),
};

export const PanDisabled: Story = {
  args: {
    cityData: simpleCityData,
    backgroundColor: '#1a1a2e',
    enableZoom: true,
    enablePan: false,
    showDirectoryLabels: true,
  },
  render: (args) => (
    <View style={styles.fullHeight}>
      <View style={styles.header}>
        <Text style={styles.title}>Pan Disabled</Text>
        <Text style={styles.subtitle}>Panning is disabled, but pinch to zoom works</Text>
      </View>
      <View style={styles.canvasContainer}>
        <FileCityCanvas {...args} />
      </View>
    </View>
  ),
};

// ============================================================================
// Styles
// ============================================================================

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
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    color: '#94a3b8',
  },
  selected: {
    fontSize: 11,
    color: '#3b82f6',
    marginTop: 4,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  canvasContainer: {
    flex: 1,
  },
});
