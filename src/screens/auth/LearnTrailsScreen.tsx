/**
 * "Learn about trails" — the no-account-needed detour reached from the
 * Welcome screen. A guided, 3-step visual walkthrough over ONE mock "file
 * city" that morphs in place:
 *
 *   1. This is a file city — buildings are files; tap one to open it.
 *   2. A trail is a path of markers — one numbered trail over the city.
 *   3. Many trails map the codebase — several trails fill in as coverage.
 *
 * The finale links to the real bundled `SampleTrail`. All data is offline
 * fixture (see `data/learnTrailsCity.ts`); no token, no network.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  LayoutChangeEvent,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';
import { useTheme } from '@principal-ade/industry-theme';
import type { Theme } from '@principal-ade/industry-theme';

import { FileCityCanvas, getFileColor } from '../../components/FileCity';
import type {
  BuildingScreenRect,
  CityBuilding,
  FileCityCanvasHandle,
  HighlightLayer,
} from '../../components/FileCity';
import { FileTree } from '../../components/FileTree';
import { LearnTrailsFilePreview } from './LearnTrailsFilePreview';
import type { PreviewOrigin } from './LearnTrailsFilePreview';
import { LearnTrailsStopCard } from './LearnTrailsStopCard';
import { LearnTrailsLeaderLine } from './LearnTrailsLeaderLine';
import type { TrailMarkerSnippet } from '../../types/Trail';
import type { TrailFileReader } from '../../services/TrailFileContentService';
import {
  LEARN_CITY,
  COVERAGE_LAYERS,
  TRAIL_MARKERS,
  TRAIL_COLOR,
  learnFileContents,
} from '../../data/learnTrailsCity';
import type { RootStackParamList } from '../../navigation/types';

const STEPS = [
  {
    title: 'This is a file city',
    body: "Every building is a file; every block a folder. It's your whole repo, seen from above.",
  },
  {
    title: 'A trail is a path of markers',
    body: 'A trail pins a few files in order. Follow the numbered markers to walk one flow through the code.',
  },
  {
    title: 'Many trails map the codebase',
    body: "As your team lays more trails, the map fills in — a living picture of what's understood and reviewed.",
  },
] as const;

// Per-stop reveal choreography for step 2: light the file, then the number,
// then draw a line to the card, then the card. Timings are ms after the stop
// becomes active; the user advances to the next stop with the "Next step" button.
const STOP_PHASES = ['highlight', 'number', 'line', 'card'] as const;
type StopPhase = (typeof STOP_PHASES)[number];
const PHASE_AT = { number: 700, line: 1300, card: 1850 };
// Approximate caption-card height, used to aim the leader line at the card.
const CARD_H = 104;

export function LearnTrailsScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();

  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [openedFile, setOpenedFile] = useState<CityBuilding | null>(null);
  // Where the file preview grows from (the tapped square, in canvas-local px).
  const [openOrigin, setOpenOrigin] = useState<PreviewOrigin | null>(null);
  // Map area size, measured so the preview can size/center itself over it.
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  // Bumped to ask the open preview to animate itself closed (re-tap to hide).
  const [closeSignal, setCloseSignal] = useState(0);
  // Files currently visible in the tree; the rest get greyed on the map.
  const [visibleFiles, setVisibleFiles] = useState<Set<string> | null>(null);
  // Folders currently open in the tree; their borders get highlighted on the map.
  const [openFolders, setOpenFolders] = useState<Set<string>>(new Set());
  const canvasRef = useRef<FileCityCanvasHandle | null>(null);

  const handleVisibleFiles = useCallback((v: Set<string>) => setVisibleFiles(v), []);
  const handleOpenFolders = useCallback((v: Set<string>) => setOpenFolders(v), []);

  // Buildings whose tree row is hidden under a collapsed folder → grey on map.
  const dimmedPaths = useMemo(() => {
    if (step !== 0 || !visibleFiles) return undefined;
    const dimmed = new Set<string>();
    for (const b of LEARN_CITY.buildings) {
      if (!visibleFiles.has(b.path)) dimmed.add(b.path);
    }
    return dimmed;
  }, [step, visibleFiles]);
  // Step 1: the stop being revealed (null before the walkthrough starts), and
  // whether the walkthrough has been started at all.
  const [activeStop, setActiveStop] = useState<number | null>(null);
  const [started, setStarted] = useState(false);
  // Sub-phase within the current stop's reveal, and the leader line to draw.
  const [stopPhase, setStopPhase] = useState<StopPhase>('highlight');
  const [leaderLine, setLeaderLine] = useState<{
    stopX: number;
    stopY: number;
    cardX: number;
    cardEdgeY: number;
  } | null>(null);
  // Step 3: which coverage trails the user has toggled on (by layer id).
  const [enabledTrails, setEnabledTrails] = useState<Set<string>>(new Set());

  const goToStep = (next: 0 | 1 | 2) => {
    setOpenedFile(null);
    setOpenOrigin(null);
    setActiveStop(null);
    setStarted(false);
    setStopPhase('highlight');
    setLeaderLine(null);
    setEnabledTrails(new Set());
    setStep(next);
  };

  // Begin the walkthrough at the first stop.
  const startTour = useCallback(() => {
    setStopPhase('highlight');
    setLeaderLine(null);
    setActiveStop(0);
    setStarted(true);
  }, []);

  // Advance to the next stop (user-driven). Reset the reveal in the same update
  // so the next stop's card/line don't flash for a frame at the old phase.
  const nextStop = useCallback(() => {
    if (activeStop == null || activeStop >= TRAIL_MARKERS.length - 1) return;
    setStopPhase('highlight');
    setLeaderLine(null);
    setActiveStop(activeStop + 1);
  }, [activeStop]);

  // Per-stop reveal sequence: highlight → number → draw line → card. No
  // auto-advance — the user moves on with the "Next step" button.
  useEffect(() => {
    if (step !== 1 || !started || activeStop == null) return;

    setStopPhase('highlight');
    setLeaderLine(null);
    const timers: ReturnType<typeof setTimeout>[] = [];

    timers.push(setTimeout(() => setStopPhase('number'), PHASE_AT.number));
    timers.push(
      setTimeout(() => {
        // Elbow connector from the stop's building to the card's near edge.
        const rect = canvasRef.current?.getBuildingRect(TRAIL_MARKERS[activeStop].path);
        if (rect && canvasSize.width && canvasSize.height) {
          const atBottom = activeStop === 0; // first card sits at the bottom
          setLeaderLine({
            stopX: rect.x + rect.width / 2,
            stopY: rect.y + rect.height / 2,
            cardX: canvasSize.width / 2,
            cardEdgeY: atBottom ? canvasSize.height - 16 - CARD_H : 16 + CARD_H,
          });
        }
        setStopPhase('line');
      }, PHASE_AT.line),
    );
    timers.push(setTimeout(() => setStopPhase('card'), PHASE_AT.card));

    return () => timers.forEach(clearTimeout);
  }, [step, started, activeStop, canvasSize.width, canvasSize.height]);

  const phaseIdx = STOP_PHASES.indexOf(stopPhase);

  // Highlights light up as soon as a stop is active; the numbered markers lag
  // one sub-phase behind (they appear after the highlight).
  const highlightRevealed = step === 1 && activeStop != null ? activeStop + 1 : 0;
  const markerRevealed =
    step === 1 && activeStop != null ? activeStop + (phaseIdx >= 1 ? 1 : 0) : 0;

  const onCanvasLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setCanvasSize({ width, height });
  }, []);

  // Open a file's preview. A building tap supplies the square's on-screen rect;
  // a tree-row tap has none (it may be off-screen), so grow from the map center.
  const openFile = useCallback(
    (building: CityBuilding, rect?: BuildingScreenRect) => {
      setOpenOrigin(
        rect ?? {
          x: canvasSize.width / 2 - 14,
          y: canvasSize.height / 2 - 14,
          width: 28,
          height: 28,
        },
      );
      setOpenedFile(building);
    },
    [canvasSize.width, canvasSize.height],
  );

  const closeFile = useCallback(() => {
    setOpenedFile(null);
    setOpenOrigin(null);
  }, []);

  // Tree-row tap: animate closed if already open, else ask the canvas to fire
  // its press for that building so the preview grows from the real square (the
  // canvas knows the building's live on-screen position). Falls back to a
  // center grow if the canvas hasn't mounted / the path isn't found.
  const toggleFile = useCallback(
    (building: CityBuilding) => {
      if (openedFile?.path === building.path) {
        setCloseSignal((n) => n + 1);
        return;
      }
      if (!canvasRef.current?.pressBuildingByPath(building.path)) openFile(building);
    },
    [openedFile, openFile],
  );

  const toggleTrail = (id: string) =>
    setEnabledTrails((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  // Offline reader for the tutorial's faux source — lets the real
  // `TrailCodeSnippet` (line numbers + syntax highlighting) render the preview.
  const readFile = useCallback<TrailFileReader>(
    (path) => Promise.resolve(learnFileContents(path)),
    [],
  );
  const openedSnippet = useMemo<TrailMarkerSnippet | null>(() => {
    if (!openedFile) return null;
    const lineCount = learnFileContents(openedFile.path).split('\n').length;
    return { kind: 'slice', startLine: 1, endLine: lineCount, focusLine: 1, contextLines: 0 };
  }, [openedFile]);

  // Per-step canvas configuration.
  const highlightLayers = useMemo<HighlightLayer[]>(() => {
    if (step === 1) {
      // Only the stops revealed so far light up — the trail fills in as we walk.
      const paths = TRAIL_MARKERS.slice(0, highlightRevealed).map((m) => m.path);
      if (paths.length === 0) return [];
      return [
        {
          id: 'auth-trail',
          name: 'Sign-in flow',
          enabled: true,
          color: TRAIL_COLOR,
          opacity: 1,
          borderWidth: 2,
          priority: 100,
          items: paths.map((path) => ({
            path,
            type: 'file' as const,
            renderStrategy: 'border' as const,
          })),
        },
      ];
    }
    if (step === 2) return COVERAGE_LAYERS.filter((l) => enabledTrails.has(l.id));

    // Step 0: outline the borders of folders that are open in the tree, plus
    // outline the tapped file as the current selection.
    const layers: HighlightLayer[] = [];
    if (openFolders.size > 0) {
      layers.push({
        id: 'open-folders',
        name: 'Open folders',
        enabled: true,
        color: TRAIL_COLOR,
        opacity: 1,
        borderWidth: 2,
        priority: 60,
        items: [...openFolders].map((path) => ({
          path,
          type: 'directory' as const,
          renderStrategy: 'border' as const,
        })),
      });
    }
    if (openedFile) {
      layers.push({
        id: 'opened',
        name: 'Selected file',
        enabled: true,
        color: TRAIL_COLOR,
        opacity: 1,
        borderWidth: 2,
        priority: 100,
        items: [{ path: openedFile.path, type: 'file', renderStrategy: 'border' }],
      });
    }
    return layers;
  }, [step, highlightRevealed, openedFile, enabledTrails, openFolders]);

  const markerTrail =
    step === 1 ? TRAIL_MARKERS.slice(0, markerRevealed).map((m) => m.path) : undefined;
  const isolationMode = step === 1 ? 'transparent' : 'none';
  // The map holds completely still through the walkthrough — the markers,
  // trail, and cards reveal over a static city, with no camera movement.
  const zoomToPath = null;

  const stepInfo = STEPS[step];

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* ── The city (persistent; only props change per step) ── */}
      <View style={styles.canvasWrap} onLayout={onCanvasLayout}>
        <FileCityCanvas
          ref={canvasRef}
          cityData={LEARN_CITY}
          backgroundColor={theme.colors.background}
          highlightLayers={highlightLayers}
          isolationMode={isolationMode}
          markerTrail={markerTrail}
          markerTrailColor={TRAIL_COLOR}
          zoomToPath={zoomToPath}
          enableZoom={step !== 1}
          enablePan={step !== 1}
          dimmedPaths={dimmedPaths}
          onBuildingPress={step === 0 ? openFile : undefined}
        />

        {/* File preview grows out of the tapped square, over the map. */}
        {step === 0 && openedFile && openOrigin && openedSnippet && (
          <LearnTrailsFilePreview
            key={openedFile.path}
            building={openedFile}
            snippet={openedSnippet}
            color={openedFile.color || getFileColor(openedFile.path)}
            origin={openOrigin}
            canvasSize={canvasSize}
            readFile={readFile}
            accentColor={TRAIL_COLOR}
            theme={theme}
            onClose={closeFile}
            closeSignal={closeSignal}
          />
        )}

        {/* Step 1 reveal: line drawn from the stop to the card (phase ≥ line). */}
        {step === 1 && started && leaderLine && phaseIdx >= STOP_PHASES.indexOf('line') && (
          <LearnTrailsLeaderLine
            key={`line-${activeStop}`}
            stopX={leaderLine.stopX}
            stopY={leaderLine.stopY}
            cardX={leaderLine.cardX}
            cardEdgeY={leaderLine.cardEdgeY}
            color={theme.colors.textSecondary}
            width={canvasSize.width}
            height={canvasSize.height}
          />
        )}

        {/* Step 1 reveal: caption card (phase = card). The first stop's marker
            sits up top, so its card drops to the bottom to avoid covering it;
            later cards sit at the top. */}
        {step === 1 && started && activeStop != null && stopPhase === 'card' && (
          <View
            style={[
              styles.stopCardWrap,
              activeStop === 0 ? styles.stopCardBottom : styles.stopCardTop,
            ]}
            pointerEvents="none"
          >
            <LearnTrailsStopCard
              key={activeStop}
              index={activeStop}
              total={TRAIL_MARKERS.length}
              label={TRAIL_MARKERS[activeStop].label}
              note={TRAIL_MARKERS[activeStop].note}
              color={TRAIL_COLOR}
              theme={theme}
            />
          </View>
        )}
      </View>

      {/* ── Teaching panel ── */}
      <View
        style={[
          styles.panel,
          {
            backgroundColor: theme.colors.backgroundSecondary,
            borderColor: theme.colors.border,
            paddingBottom: insets.bottom + 12,
          },
        ]}
      >
        <Text style={[styles.title, { color: theme.colors.text }]}>{stepInfo.title}</Text>
        <Text style={[styles.body, { color: theme.colors.textSecondary }]}>{stepInfo.body}</Text>

        <ScrollView
          style={styles.stepArea}
          contentContainerStyle={styles.stepAreaContent}
          showsVerticalScrollIndicator={false}
        >
          {step === 0 && (
            <FileTree
              city={LEARN_CITY}
              selectedPath={openedFile?.path ?? null}
              onFilePress={toggleFile}
              onVisibleFilesChange={handleVisibleFiles}
              onOpenFoldersChange={handleOpenFolders}
            />
          )}

          {step === 1 && (
            <View style={styles.startWrap}>
              {!started ? (
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={startTour}
                  style={[styles.startButton, { borderColor: TRAIL_COLOR }]}
                >
                  <Text style={[styles.startButtonText, { color: TRAIL_COLOR }]}>Start</Text>
                </TouchableOpacity>
              ) : (
                <>
                  <Text style={[styles.playingText, { color: theme.colors.textSecondary }]}>
                    {`Stop ${(activeStop ?? 0) + 1} of ${TRAIL_MARKERS.length}`}
                  </Text>
                  {activeStop != null && activeStop < TRAIL_MARKERS.length - 1 ? (
                    <TouchableOpacity
                      activeOpacity={0.85}
                      onPress={nextStop}
                      style={[styles.startButton, { borderColor: TRAIL_COLOR }]}
                    >
                      <Text style={[styles.startButtonText, { color: TRAIL_COLOR }]}>
                        Next step
                      </Text>
                    </TouchableOpacity>
                  ) : (
                    <Text style={[styles.playingText, { color: theme.colors.textSecondary }]}>
                      That's the whole trail — continue below.
                    </Text>
                  )}
                </>
              )}
            </View>
          )}

          {step === 2 && (
            <View style={styles.legend}>
              <Text style={[styles.legendHint, { color: theme.colors.textSecondary }]}>
                Tap a trail to lay it over the city.
              </Text>
              {COVERAGE_LAYERS.map((layer) => {
                const on = enabledTrails.has(layer.id);
                return (
                  <TouchableOpacity
                    key={layer.id}
                    activeOpacity={0.8}
                    onPress={() => toggleTrail(layer.id)}
                    style={[
                      styles.legendRow,
                      {
                        borderColor: on ? layer.color : theme.colors.border,
                        backgroundColor: on ? theme.colors.background : 'transparent',
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.legendSwatch,
                        on
                          ? { backgroundColor: layer.color }
                          : { borderWidth: 2, borderColor: layer.color },
                      ]}
                    />
                    <Text
                      style={[
                        styles.legendName,
                        { color: on ? theme.colors.text : theme.colors.textSecondary },
                      ]}
                    >
                      {layer.name}
                    </Text>
                    <Text
                      style={[
                        styles.legendToggle,
                        { color: on ? layer.color : theme.colors.textSecondary },
                      ]}
                    >
                      {on ? 'On' : 'Off'}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </ScrollView>

        {/* ── Nav row + progress ── */}
        <View style={styles.navRow}>
          <View style={styles.navSideLeft}>
            {step > 0 && (
              <TouchableOpacity
                style={styles.navLink}
                onPress={() => goToStep((step - 1) as 0 | 1)}
              >
                <Text style={[styles.navLinkText, { color: theme.colors.textSecondary }]}>
                  Back
                </Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.navSideRight}>
            {step < 2 ? (
              <TouchableOpacity
                style={[styles.primaryButton, { backgroundColor: theme.colors.primary }]}
                onPress={() => goToStep((step + 1) as 1 | 2)}
              >
                <Text style={[styles.primaryButtonText, { color: theme.colors.background }]}>
                  Next
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.primaryButton, { backgroundColor: theme.colors.primary }]}
                onPress={() => navigation.navigate('SampleTrail')}
              >
                <Text style={[styles.primaryButtonText, { color: theme.colors.background }]}>
                  Try a real trail ›
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <ProgressBar step={step} theme={theme} />
      </View>
    </View>
  );
}

function ProgressBar({ step, theme }: { step: number; theme: Theme }) {
  return (
    <View style={styles.progress}>
      {STEPS.map((_, i) => (
        <View
          key={i}
          style={[
            styles.progressSeg,
            { backgroundColor: i <= step ? theme.colors.primary : theme.colors.border },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  canvasWrap: {
    flex: 1,
    overflow: 'hidden',
  },
  panel: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: 0,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 12,
    height: '52%',
  },
  progress: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 14,
  },
  progressSeg: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  title: {
    fontSize: 21,
    fontWeight: '700',
    marginBottom: 6,
  },
  body: {
    fontSize: 15,
    lineHeight: 21,
  },
  stepArea: {
    flex: 1,
    marginTop: 14,
  },
  stepAreaContent: {
    flexGrow: 1,
    paddingBottom: 4,
  },
  // Step 1: scheduled-playback card position (over the map) + Start control.
  stopCardWrap: {
    position: 'absolute',
    left: 16,
    right: 16,
  },
  stopCardTop: {
    top: 16,
  },
  stopCardBottom: {
    bottom: 16,
  },
  startWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 12,
  },
  startButton: {
    height: 46,
    minWidth: 160,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  startButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },
  playingText: {
    fontSize: 14,
    fontWeight: '500',
  },
  // Legend (toggleable trails)
  legend: {
    gap: 10,
  },
  legendHint: {
    fontSize: 13.5,
    marginBottom: 2,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  legendSwatch: {
    width: 14,
    height: 14,
    borderRadius: 4,
  },
  legendName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
  },
  legendToggle: {
    fontSize: 13,
    fontWeight: '700',
  },
  // Nav
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  // Equal-flex sides keep the centered step dots fixed regardless of the
  // button labels' widths.
  navSideLeft: {
    flex: 1,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  navSideRight: {
    flex: 1,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  navLink: {
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  navLinkText: {
    fontSize: 15,
    fontWeight: '500',
  },
  primaryButton: {
    height: 46,
    borderRadius: 12,
    paddingHorizontal: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
