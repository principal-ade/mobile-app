import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '@principal-ade/industry-theme';
import { FileCityCanvas, generateMockCityData, generateMockHighlightLayers } from '../components/FileCity';
import type { CityBuilding, CityDistrict } from '../components/FileCity';

type Complexity = 'simple' | 'medium' | 'complex';

export function FileCityDemoScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const [complexity, setComplexity] = useState<Complexity>('medium');
  const [selectedPath, setSelectedPath] = useState<string | null>(null);

  const cityData = React.useMemo(
    () => generateMockCityData({ complexity }),
    [complexity]
  );

  const highlightLayers = React.useMemo(
    () => generateMockHighlightLayers(cityData),
    [cityData]
  );

  const handleBuildingPress = (building: CityBuilding) => {
    setSelectedPath(building.path);
  };

  const handleDistrictPress = (district: CityDistrict) => {
    setSelectedPath(district.path);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={[styles.backText, { color: theme.colors.primary }]}>
            ‹ Back
          </Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.colors.text }]}>
          File City Demo
        </Text>
        <View style={styles.placeholder} />
      </View>

      {/* Complexity Selector */}
      <View style={[styles.controls, { backgroundColor: theme.colors.surface }]}>
        <Text style={[styles.controlLabel, { color: theme.colors.textSecondary }]}>
          Complexity:
        </Text>
        <View style={styles.buttonGroup}>
          {(['simple', 'medium', 'complex'] as Complexity[]).map((c) => (
            <TouchableOpacity
              key={c}
              style={[
                styles.complexityButton,
                {
                  backgroundColor: complexity === c ? theme.colors.primary : 'transparent',
                  borderColor: theme.colors.border,
                },
              ]}
              onPress={() => setComplexity(c)}
            >
              <Text
                style={[
                  styles.buttonText,
                  { color: complexity === c ? '#fff' : theme.colors.text },
                ]}
              >
                {c.charAt(0).toUpperCase() + c.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Stats */}
      <View style={[styles.stats, { backgroundColor: theme.colors.surface }]}>
        <Text style={[styles.statsText, { color: theme.colors.textSecondary }]}>
          {cityData.metadata.totalFiles} files, {cityData.metadata.totalDirectories} directories
        </Text>
        {selectedPath && (
          <Text
            style={[styles.selectedText, { color: theme.colors.primary }]}
            numberOfLines={1}
          >
            Selected: {selectedPath}
          </Text>
        )}
      </View>

      {/* Canvas */}
      <View style={styles.canvasContainer}>
        <FileCityCanvas
          cityData={cityData}
          highlightLayers={highlightLayers}
          backgroundColor={theme.colors.background}
          defaultDistrictColor="#4B5155"
          buildingBorderRadius={0}
          showDirectoryLabels={false}
          enableZoom={true}
          enablePan={true}
          onBuildingPress={handleBuildingPress}
          onDistrictPress={handleDistrictPress}
        />
      </View>

      {/* Instructions */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 8 }]}>
        <Text style={[styles.instructions, { color: theme.colors.textSecondary }]}>
          Pinch to zoom • Drag to pan • Tap to select
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  backText: {
    fontSize: 17,
    fontWeight: '500',
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
  },
  placeholder: {
    width: 60,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 12,
  },
  controlLabel: {
    fontSize: 14,
  },
  buttonGroup: {
    flexDirection: 'row',
    gap: 8,
  },
  complexityButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
  },
  buttonText: {
    fontSize: 13,
    fontWeight: '500',
  },
  stats: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  statsText: {
    fontSize: 12,
  },
  selectedText: {
    fontSize: 11,
    marginTop: 4,
    fontFamily: 'Menlo',
  },
  canvasContainer: {
    flex: 1,
  },
  footer: {
    paddingVertical: 8,
    alignItems: 'center',
  },
  instructions: {
    fontSize: 12,
  },
});

export default FileCityDemoScreen;
