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

import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  LayoutChangeEvent,
  Platform,
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
import type { TrailMarkerSnippet } from '../../types/Trail';
import type { TrailFileReader } from '../../services/TrailFileContentService';
import {
  LEARN_CITY,
  SINGLE_TRAIL_LAYER,
  COVERAGE_LAYERS,
  TRAIL_MARKERS,
  TRAIL_COLOR,
  TRAIL_FRAME,
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

const MONO = Platform.select({ ios: 'Courier', android: 'monospace', default: 'monospace' });

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
  // Which stop is focused in step 1 (drives the zoom); null = frame the trail.
  const [activeStop, setActiveStop] = useState<number | null>(null);
  // Step 3: which coverage trails the user has toggled on (by layer id).
  const [enabledTrails, setEnabledTrails] = useState<Set<string>>(new Set());

  const goToStep = (next: 0 | 1 | 2) => {
    setOpenedFile(null);
    setOpenOrigin(null);
    setActiveStop(null);
    setEnabledTrails(new Set());
    setStep(next);
  };

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
    if (step === 1) return [SINGLE_TRAIL_LAYER];
    if (step === 2) return COVERAGE_LAYERS.filter((l) => enabledTrails.has(l.id));

    // Step 0: outline the borders of folders that are open in the tree, plus
    // fill the tapped file as the current selection.
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
        items: [{ path: openedFile.path, type: 'file', renderStrategy: 'fill' }],
      });
    }
    return layers;
  }, [step, openedFile, enabledTrails, openFolders]);

  const markerTrail = step === 1 ? TRAIL_MARKERS.map((m) => m.path) : undefined;
  const isolationMode = step === 1 ? 'transparent' : 'none';
  const zoomToPath =
    step === 1
      ? activeStop != null
        ? TRAIL_MARKERS[activeStop].path // zoom to the tapped stop
        : TRAIL_FRAME // frame the whole trail (markers' common dir)
      : null;

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
              collapsedByDefault
              onFilePress={toggleFile}
              onVisibleFilesChange={handleVisibleFiles}
              onOpenFoldersChange={handleOpenFolders}
            />
          )}

          {step === 1 && (
            <View style={styles.stopList}>
              {TRAIL_MARKERS.map((m, i) => {
                const active = activeStop === i;
                return (
                  <TouchableOpacity
                    key={m.path}
                    activeOpacity={0.8}
                    onPress={() => setActiveStop(active ? null : i)}
                    style={[
                      styles.stopRow,
                      {
                        backgroundColor: active ? theme.colors.background : 'transparent',
                        borderColor: active ? TRAIL_COLOR : theme.colors.border,
                      },
                    ]}
                  >
                    <View style={[styles.stopBadge, { backgroundColor: TRAIL_COLOR }]}>
                      <Text style={styles.stopBadgeText}>{i + 1}</Text>
                    </View>
                    <View style={styles.stopText}>
                      <Text style={[styles.stopLabel, { color: theme.colors.text }]}>
                        {m.label}
                      </Text>
                      <Text style={[styles.stopPath, { color: theme.colors.textSecondary, fontFamily: MONO }]}>
                        {m.path}
                      </Text>
                      {active && (
                        <Text style={[styles.stopNote, { color: theme.colors.textSecondary }]}>
                          {m.note}
                        </Text>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
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
  // Stop list
  stopList: {
    gap: 10,
  },
  stopRow: {
    flexDirection: 'row',
    gap: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  stopBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopBadgeText: {
    color: '#0b1020',
    fontSize: 13,
    fontWeight: '800',
  },
  stopText: {
    flex: 1,
    gap: 2,
  },
  stopLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  stopPath: {
    fontSize: 12,
  },
  stopNote: {
    fontSize: 13.5,
    lineHeight: 19,
    marginTop: 4,
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
