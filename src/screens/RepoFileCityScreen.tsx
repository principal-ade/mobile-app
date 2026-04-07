import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';

// Custom warning icon (no emoji)
function WarningIcon({ color, size = 48 }: { color: string; size?: number }) {
  return (
    <View style={[warningStyles.wrapper, { width: size, height: size }]}>
      <View
        style={[
          warningStyles.triangle,
          {
            borderLeftWidth: size * 0.5,
            borderRightWidth: size * 0.5,
            borderBottomWidth: size * 0.85,
            borderLeftColor: 'transparent',
            borderRightColor: 'transparent',
            borderBottomColor: color,
          },
        ]}
      />
      <View
        style={[
          warningStyles.exclamation,
          {
            backgroundColor: '#fff',
            width: size * 0.08,
            height: size * 0.3,
            top: size * 0.35,
          },
        ]}
      />
      <View
        style={[
          warningStyles.dot,
          {
            backgroundColor: '#fff',
            width: size * 0.08,
            height: size * 0.08,
            borderRadius: size * 0.04,
            bottom: size * 0.2,
          },
        ]}
      />
    </View>
  );
}

const warningStyles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  triangle: {
    width: 0,
    height: 0,
  },
  exclamation: {
    position: 'absolute',
    borderRadius: 1,
  },
  dot: {
    position: 'absolute',
  },
});
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useTheme } from '@principal-ade/industry-theme';
import { FileCityCanvas } from '../components/FileCity';
import type { CityBuilding, CityDistrict, CityData, HighlightLayer } from '../components/FileCity';
import { getFileCityForRepo } from '../services/FileCityService';
import type { RootStackParamList } from '../navigation/types';

type RouteProps = RouteProp<RootStackParamList, 'RepoFileCity'>;

export function RepoFileCityScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const route = useRoute<RouteProps>();

  const { owner, name, fullName } = route.params;

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cityData, setCityData] = useState<CityData | null>(null);
  const [highlightLayers, setHighlightLayers] = useState<HighlightLayer[]>([]);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [isTruncated, setIsTruncated] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function fetchFileCity() {
      setIsLoading(true);
      setError(null);

      try {
        const result = await getFileCityForRepo(owner, name);

        if (cancelled) return;

        setCityData(result.cityData);
        setHighlightLayers(result.highlightLayers);
        setIsTruncated(result.truncated);
      } catch (err) {
        if (cancelled) return;

        console.error('Error fetching file city:', err);
        setError(
          err instanceof Error
            ? err.message
            : 'Failed to load repository structure'
        );
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    fetchFileCity();

    return () => {
      cancelled = true;
    };
  }, [owner, name]);

  const handleBuildingPress = (building: CityBuilding) => {
    setSelectedPath(building.path);
  };

  const handleDistrictPress = (district: CityDistrict) => {
    setSelectedPath(district.path);
  };

  const handleRetry = () => {
    setCityData(null);
    setError(null);
    setIsLoading(true);
    // Re-trigger the effect by changing a dependency
    // The effect will re-run because we're setting loading to true
    getFileCityForRepo(owner, name)
      .then((result) => {
        setCityData(result.cityData);
        setHighlightLayers(result.highlightLayers);
        setIsTruncated(result.truncated);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error('Error on retry:', err);
        setError(
          err instanceof Error
            ? err.message
            : 'Failed to load repository structure'
        );
        setIsLoading(false);
      });
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
        <View style={styles.headerCenter}>
          <Text
            style={[styles.title, { color: theme.colors.text }]}
            numberOfLines={1}
          >
            {fullName}
          </Text>
        </View>
        <View style={styles.placeholder} />
      </View>

      {/* Content */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
            Building city from repository...
          </Text>
          <Text style={[styles.loadingSubtext, { color: theme.colors.textSecondary }]}>
            Fetching file tree for {fullName}
          </Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <WarningIcon color={theme.colors.error} size={48} />
          <Text style={[styles.errorText, { color: theme.colors.error }]}>
            {error}
          </Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: theme.colors.primary }]}
            onPress={handleRetry}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : cityData ? (
        <>
          {/* Stats Bar */}
          <View style={[styles.statsBar, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.statsRow}>
              <Text style={[styles.statsText, { color: theme.colors.textSecondary }]}>
                {cityData.metadata.totalFiles} files • {cityData.metadata.totalDirectories} directories
              </Text>
              {isTruncated && (
                <Text style={[styles.truncatedBadge, { color: theme.colors.warning }]}>
                  (truncated)
                </Text>
              )}
            </View>
            {selectedPath && (
              <Text
                style={[styles.selectedPath, { color: theme.colors.primary }]}
                numberOfLines={1}
              >
                {selectedPath}
              </Text>
            )}
          </View>

          {/* File City Canvas */}
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
        </>
      ) : null}
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
    minWidth: 60,
  },
  backText: {
    fontSize: 17,
    fontWeight: '500',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
  },
  placeholder: {
    width: 60,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 15,
    textAlign: 'center',
  },
  loadingSubtext: {
    marginTop: 8,
    fontSize: 13,
    textAlign: 'center',
    opacity: 0.7,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  statsBar: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statsText: {
    fontSize: 13,
  },
  truncatedBadge: {
    fontSize: 11,
    fontStyle: 'italic',
  },
  selectedPath: {
    fontSize: 12,
    fontFamily: 'Menlo',
    marginTop: 4,
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

export default RepoFileCityScreen;
