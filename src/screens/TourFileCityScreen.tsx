import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Image,
} from 'react-native';
import { LoadingSpinner } from '../components/LoadingSpinner';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { useTheme } from '@principal-ade/industry-theme';
import { FileCityCanvas } from '../components/FileCity';
import type { CityData, HighlightLayer, FileTypeIconConfig } from '../components/FileCity';
import { getFileCityForRepo } from '../services/FileCityService';
import { getTour } from '../services/FeedApiService';
import type { FeedStackParamList } from '../navigation/types';
import type { IntroductionTour } from '@principal-ai/file-city-builder';

type RouteProps = RouteProp<FeedStackParamList, 'TourFileCity'>;

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const FILE_CITY_HEIGHT = SCREEN_HEIGHT * 0.5; // 50% for File City
const TOUR_PLAYER_HEIGHT = SCREEN_HEIGHT * 0.5; // 50% for tour player

const COMPLETED_TOURS_KEY = '@completed_tours';

async function markTourAsCompleted(owner: string, name: string, tourPath: string) {
  try {
    const tourId = `${owner}/${name}/${tourPath}`;
    const existing = await AsyncStorage.getItem(COMPLETED_TOURS_KEY);
    const completedTours: string[] = existing ? JSON.parse(existing) : [];

    if (!completedTours.includes(tourId)) {
      completedTours.push(tourId);
      await AsyncStorage.setItem(COMPLETED_TOURS_KEY, JSON.stringify(completedTours));
    }
  } catch (error) {
    console.error('[TourFileCityScreen] Error marking tour as completed:', error);
  }
}

export async function getCompletedTours(): Promise<Set<string>> {
  try {
    const existing = await AsyncStorage.getItem(COMPLETED_TOURS_KEY);
    const completedTours: string[] = existing ? JSON.parse(existing) : [];
    return new Set(completedTours);
  } catch (error) {
    console.error('[TourFileCityScreen] Error getting completed tours:', error);
    return new Set();
  }
}

export default function TourFileCityScreen() {
  const route = useRoute<RouteProps>();
  const navigation = useNavigation<StackNavigationProp<FeedStackParamList>>();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  const { owner, name, forkOwner, forkRepo, tourPath } = route.params;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cityData, setCityData] = useState<CityData | null>(null);
  const [ownerAvatarUrl, setOwnerAvatarUrl] = useState<string | null>(null);
  const [defaultHighlightLayers, setDefaultHighlightLayers] = useState<HighlightLayer[]>([]);
  const [iconMap, setIconMap] = useState<Map<string, FileTypeIconConfig>>(new Map());
  const [tour, setTour] = useState<IntroductionTour | null>(null);
  const [tourStarted, setTourStarted] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());

  // Load city data and tour
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setError(null);

        // Load File City data from the original repo
        const city = await getFileCityForRepo(owner, name);
        setCityData(city.cityData);
        setOwnerAvatarUrl(city.repoInfo.ownerAvatarUrl);
        setDefaultHighlightLayers(city.highlightLayers);
        setIconMap(city.iconMap);

        // Load tour from the fork
        const tourResult = await getTour(forkOwner, forkRepo, tourPath);
        setTour(tourResult.tour);

        setLoading(false);
      } catch (err) {
        console.error('[TourFileCityScreen] Error loading data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load tour');
        setLoading(false);
      }
    }

    loadData();
  }, [owner, name, forkOwner, forkRepo, tourPath]);

  const currentStep = tour?.steps[currentStepIndex];
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = tour ? currentStepIndex === tour.steps.length - 1 : false;

  // Navigation handlers
  const handleNext = () => {
    if (!isLastStep && tour) {
      const nextIndex = currentStepIndex + 1;
      setCurrentStepIndex(nextIndex);
      // Mark current step as completed
      if (currentStep) {
        setCompletedSteps(prev => new Set(prev).add(currentStep.id));
      }
    }
  };

  const handlePrevious = () => {
    if (!isFirstStep) {
      setCurrentStepIndex(currentStepIndex - 1);
    }
  };

  const handleStepDotPress = (index: number) => {
    setCurrentStepIndex(index);
  };

  const handleStartTour = () => {
    setTourStarted(true);
  };

  const handleExit = async () => {
    // Mark tour as completed if user finished all steps
    if (tourStarted && isLastStep) {
      await markTourAsCompleted(owner, name, tourPath);
    }
    navigation.goBack();
  };

  // Determine which highlight layers to use
  const tourHighlightLayers: HighlightLayer[] = currentStep?.highlightLayers?.map((layer) => ({
    id: layer.id,
    name: layer.name,
    color: layer.color,
    items: layer.items,
    opacity: layer.opacity,
    borderWidth: layer.borderWidth,
    renderStrategy: layer.renderStrategy as 'fill' | 'border' | undefined,
    enabled: true,
    priority: 0,
  })) || [];

  // Add implicit highlight for focusDirectory if set
  if (tourStarted && currentStep?.focusDirectory && currentStep.focusDirectory !== '') {
    // Normalize path to match district paths (no leading/trailing slashes)
    const normalizedPath = currentStep.focusDirectory.replace(/^\/+|\/+$/g, '');
    const focusLayer: HighlightLayer = {
      id: 'focus-directory-implicit',
      name: 'Focus Directory',
      color: theme.colors.primary,
      items: [
        {
          path: normalizedPath,
          type: 'directory' as const,
          renderStrategy: 'border',
        },
      ],
      opacity: 1,
      borderWidth: 4,
      enabled: true,
      priority: 10, // Higher priority so focus directory wins over explicit highlights
    };
    tourHighlightLayers.push(focusLayer);
  }

  // Use default highlight layers when tour hasn't started, tour layers when active
  const highlightLayers = tourStarted ? tourHighlightLayers : defaultHighlightLayers;
  const hasHighlights = tourHighlightLayers.length > 0;

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={[styles.loadingContainer]}>
          <LoadingSpinner size="large" color={theme.colors.primary} />
          <Text style={[styles.loadingText, { color: theme.colors.text }]}>
            Loading tour...
          </Text>
        </View>
      </View>
    );
  }

  if (error || !cityData || !tour) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={[styles.errorContainer]}>
          <Text style={[styles.errorText, { color: theme.colors.error }]}>
            {error || 'Failed to load tour'}
          </Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: theme.colors.primary }]}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.retryButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* File City Section */}
      <View style={[styles.fileCitySection, { height: FILE_CITY_HEIGHT, paddingTop: insets.top + 16 }]}>
        <FileCityCanvas
          cityData={cityData}
          highlightLayers={highlightLayers}
          iconMap={iconMap}
          backgroundColor={theme.colors.background}
          zoomToPath={tourStarted ? (currentStep?.focusDirectory || null) : null}
          isolationMode={tourStarted && hasHighlights ? 'transparent' : 'none'}
          showDirectoryLabels={true}
          enableZoom={true}
          enablePan={true}
          minZoom={0.5}
          maxZoom={5}
        />
      </View>

      {/* Tour Player Section */}
      <View style={[styles.tourPlayerSection, { height: TOUR_PLAYER_HEIGHT }]}>
        {!tourStarted ? (
          /* Tour Introduction */
          <>
            <View style={[styles.header, { backgroundColor: theme.colors.surface }]}>
              <View style={styles.headerTop}>
                <View style={styles.headerLeft}>
                  {ownerAvatarUrl && (
                    <Image
                      source={{ uri: ownerAvatarUrl }}
                      style={styles.headerAvatar}
                    />
                  )}
                  <TouchableOpacity
                    onPress={() => navigation.navigate('RepoFileCity', { owner, name, fullName: `${owner}/${name}` })}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.repoName, { color: theme.colors.text }]}>
                      {owner}/{name}
                    </Text>
                    <Text style={[styles.stepCounter, { color: theme.colors.textSecondary }]}>
                      {cityData.metadata.totalFiles} files
                    </Text>
                  </TouchableOpacity>
                </View>
                <TouchableOpacity onPress={handleExit} style={styles.exitButton}>
                  <Text style={[styles.exitButtonText, { color: theme.colors.textSecondary }]}>
                    ✕
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <ScrollView
              style={styles.contentScroll}
              contentContainerStyle={styles.contentScrollContainer}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.tourIntro}>
                <Text style={[styles.tourTitle, { color: theme.colors.text }]}>
                  {tour.title}
                </Text>
                {tour.description && (
                  <Text style={[styles.tourDescription, { color: theme.colors.textSecondary }]}>
                    {tour.description}
                  </Text>
                )}
                <Text style={[styles.tourMetadata, { color: theme.colors.textSecondary }]}>
                  {owner}
                </Text>
              </View>
            </ScrollView>

            <View style={[styles.footer, { backgroundColor: theme.colors.surface }]}>
              <TouchableOpacity
                style={[styles.startButton, { backgroundColor: theme.colors.primary }]}
                onPress={handleStartTour}
              >
                <Text style={styles.startButtonText}>Start Tour</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          /* Tour Steps */
          <>
        {/* Header with focus directory */}
        <View style={[styles.header, { backgroundColor: theme.colors.surface }]}>
          <View style={styles.headerTop}>
            <View style={styles.headerLeft}>
              {ownerAvatarUrl && (
                <Image
                  source={{ uri: ownerAvatarUrl }}
                  style={styles.headerAvatar}
                />
              )}
              <Text style={[styles.focusDirectory, { color: theme.colors.text }]}>
                {currentStep?.focusDirectory || name}
              </Text>
            </View>
            <TouchableOpacity onPress={handleExit} style={styles.exitButton}>
              <Text style={[styles.exitButtonText, { color: theme.colors.textSecondary }]}>
                ✕
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Tour content - scrollable */}
        <ScrollView
          style={styles.contentScroll}
          contentContainerStyle={styles.contentScrollContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Current step content */}
          {currentStep && (
            <View style={styles.stepContent}>
              <Text style={[styles.stepTitle, { color: theme.colors.text }]}>
                {currentStep.title}
              </Text>
              <Text style={[styles.stepDescription, { color: theme.colors.textSecondary }]}>
                {currentStep.description}
              </Text>
            </View>
          )}
        </ScrollView>

        {/* Footer with navigation */}
        <View style={[styles.footer, { backgroundColor: theme.colors.surface }]}>
          {/* Step dots */}
          <View style={styles.stepDots}>
            {tour.steps.map((step, index) => (
              <TouchableOpacity
                key={step.id}
                style={[
                  styles.stepDot,
                  {
                    backgroundColor:
                      index === currentStepIndex
                        ? theme.colors.primary
                        : completedSteps.has(step.id)
                        ? theme.colors.success
                        : theme.colors.border,
                  },
                ]}
                onPress={() => handleStepDotPress(index)}
              />
            ))}
          </View>

          {/* Navigation buttons */}
          <View style={styles.navigationButtons}>
            <TouchableOpacity
              style={[
                styles.navButton,
                {
                  backgroundColor: isFirstStep ? theme.colors.surface : theme.colors.primary,
                  borderColor: theme.colors.border,
                },
              ]}
              onPress={handlePrevious}
              disabled={isFirstStep}
            >
              <Text
                style={[
                  styles.navButtonText,
                  { color: isFirstStep ? theme.colors.textSecondary : '#fff' },
                ]}
              >
                Previous
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.navButton,
                { backgroundColor: theme.colors.primary },
              ]}
              onPress={isLastStep ? handleExit : handleNext}
            >
              <Text style={[styles.navButtonText, { color: '#fff' }]}>
                {isLastStep ? 'Finish' : 'Next'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
        </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },

  // Layout sections
  fileCitySection: {
    width: '100%',
  },
  tourPlayerSection: {
    width: '100%',
  },

  // Header
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  repoName: {
    fontSize: 15,
    fontWeight: '600',
  },
  stepCounter: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  focusDirectory: {
    fontSize: 14,
    fontWeight: '600',
  },
  exitButton: {
    padding: 4,
  },
  exitButtonText: {
    fontSize: 20,
    fontWeight: '300',
  },

  // Content
  contentScroll: {
    flex: 1,
  },
  contentScrollContainer: {
    padding: 16,
  },
  tourIntro: {
    marginBottom: 24,
  },
  tourTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  tourDescription: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 16,
  },
  tourMetadata: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  stepContent: {
    marginBottom: 16,
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
  },
  stepDescription: {
    fontSize: 16,
    lineHeight: 24,
  },

  // Footer
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  stepDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  navigationButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  navButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  navButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  startButton: {
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  startButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
});
