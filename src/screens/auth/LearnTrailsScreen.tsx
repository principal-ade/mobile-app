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
  learnFileContents,
} from '../../data/learnTrailsCity';
import type { RootStackParamList } from '../../navigation/types';

const STEPS = [
  {
    title: 'This is a file city view',
    body: 'It is just like a folders on your computer. Open and close them to get a feel for the layout',
  },
  {
    title: 'A trail provides understanding',
    body: 'Walking you through a feature with references. Just like a trail through nature.',
  },
  {
    title: 'Many trails map the codebase',
    body: "As your team lays more trails, the map fills in — a living picture of what's understood and reviewed.",
  },
] as const;

// Per-stop reveal choreography for step 1: the breadcrumb is an ordered list of
// path nodes (ancestor folders, then the file) that MORPHS from the previous
// stop to the next instead of resetting — it retracts only the diverging tail
// (file, then the folders the two paths don't share) back to the common prefix,
// then extends into the new tail. e.g. src/hooks/useAuth.ts → src/services/auth.ts:
//   undo useAuth.ts → undo hooks → (src kept) → show services → show auth.ts
// then the leader line, then the caption card. Each tick fires REVEAL_STEP_MS
// after the previous; the user advances stops with the "Next step" button.
const REVEAL_STEP_MS = 850;
// Approximate caption-card height, used to aim the leader line at the card.
const CARD_H = 104;
// Top inset for top-positioned caption cards.
const CARD_TOP = 16;
// Step 2 renders the city in flat grey so coverage reads purely as colored
// (covered) vs grey (uncovered) — the file colors are intentionally hidden.
const COVERAGE_GREY = '#4b5563';

type PathNode = { path: string; name: string; type: 'dir' | 'file' };

/** Cumulative ancestor folders of a file path: 'a/b/c.ts' → ['a', 'a/b']. */
function ancestorFolders(path: string): string[] {
  const segs = path.split('/');
  const folders: string[] = [];
  for (let i = 0; i < segs.length - 1; i++) folders.push(segs.slice(0, i + 1).join('/'));
  return folders;
}

/** The breadcrumb's full node list for a stop: ancestor folders, then the file. */
function stopNodes(path: string): PathNode[] {
  const folders: PathNode[] = ancestorFolders(path).map((p) => ({
    path: p,
    name: p.split('/').pop() ?? p,
    type: 'dir',
  }));
  return [...folders, { path, name: path.split('/').pop() ?? path, type: 'file' }];
}

/** Length of the shared leading run of two node lists (compared by path). */
function commonPrefixLen(a: PathNode[], b: PathNode[]): number {
  let i = 0;
  while (i < a.length && i < b.length && a[i].path === b[i].path) i++;
  return i;
}

/**
 * The sequence of breadcrumb frames morphing `prev` into `target`: retract the
 * tail one node at a time down to the shared prefix, then extend to `target`.
 */
function morphFrames(prev: PathNode[], target: PathNode[]): PathNode[][] {
  const common = commonPrefixLen(prev, target);
  const frames: PathNode[][] = [];
  for (let len = prev.length - 1; len >= common; len--) frames.push(prev.slice(0, len));
  for (let len = common + 1; len <= target.length; len++) frames.push(target.slice(0, len));
  return frames;
}

// Comprehension: share of the city's files covered by at least one trail — the
// union of every coverage trail's files over the total building count.
const COMPREHENSION_PCT = (() => {
  const covered = new Set<string>();
  for (const layer of COVERAGE_LAYERS) for (const item of layer.items) covered.add(item.path);
  const total = LEARN_CITY.buildings.length;
  return total ? Math.round((covered.size / total) * 100) : 0;
})();

type TrailStep = { path: string; label: string; note: string };

/**
 * The clickable steps for a coverage trail. The sign-in trail reuses the rich
 * walkthrough markers (labels + notes); every other trail derives each step
 * from its file path — name as the label, parent folder as the note.
 */
function trailSteps(trail: HighlightLayer): TrailStep[] {
  if (trail.id === 'cov-signin') {
    return TRAIL_MARKERS.map((m) => ({ path: m.path, label: m.label, note: m.note }));
  }
  return trail.items.map((it) => ({
    path: it.path,
    label: it.path.split('/').pop() ?? it.path,
    note: it.path.split('/').slice(0, -1).join('/'),
  }));
}

export function LearnTrailsScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();

  // The single-trail accent (steps 0/1, buttons, preview, stop card) tracks the
  // theme's primary color so the tutorial trail matches the rest of the app.
  const trailColor = theme.colors.primary;
  // Step 2's coverage palette keeps its distinct per-trail colors, but the
  // shared "Sign-in flow" trail re-uses the same primary accent as steps 0/1.
  const coverageLayers = useMemo<HighlightLayer[]>(
    () =>
      COVERAGE_LAYERS.map((l) =>
        l.id === 'cov-signin' ? { ...l, color: trailColor } : l,
      ),
    [trailColor],
  );
  // Step 2 uses a flat-grey copy of the city so coverage shows as colored vs grey
  // (the toggled trails fill covered buildings with their color; the rest stay grey).
  const greyCity = useMemo(
    () => ({
      ...LEARN_CITY,
      buildings: LEARN_CITY.buildings.map((b) => ({ ...b, color: COVERAGE_GREY })),
    }),
    [],
  );

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
  // The breadcrumb's current node list (morphs between stops), and whether the
  // leader line / caption card have appeared for the active stop yet.
  const [pathNodes, setPathNodes] = useState<PathNode[]>([]);
  const [lineShown, setLineShown] = useState(false);
  const [cardShown, setCardShown] = useState(false);
  // Set once the last stop has been revealed — switches the panel into "review"
  // mode (a tappable list of the trail's stops).
  const [finished, setFinished] = useState(false);
  const [leaderLine, setLeaderLine] = useState<{
    stopX: number;
    stopY: number;
    cardX: number;
    cardEdgeY: number;
  } | null>(null);
  // Step 3 (coverage): the trail drilled into (by layer id), and which of its
  // steps is selected. All trails are always lit; drilling just reveals steps.
  const [coverageTrailId, setCoverageTrailId] = useState<string | null>(null);
  const [coverageStep, setCoverageStep] = useState<number | null>(null);

  const goToStep = (next: 0 | 1 | 2) => {
    setOpenedFile(null);
    setOpenOrigin(null);
    setActiveStop(null);
    setStarted(false);
    setPathNodes([]);
    setLineShown(false);
    setCardShown(false);
    setFinished(false);
    setLeaderLine(null);
    setCoverageTrailId(null);
    setCoverageStep(null);
    setStep(next);
  };

  // Elbow connector from a building to its caption card's near edge.
  const computeLeaderLine = useCallback(
    (path: string, atBottom: boolean) => {
      const rect = canvasRef.current?.getBuildingRect(path);
      if (!rect || !canvasSize.width || !canvasSize.height) return null;
      return {
        stopX: rect.x + rect.width / 2,
        stopY: rect.y + rect.height / 2,
        cardX: canvasSize.width / 2,
        cardEdgeY: atBottom ? canvasSize.height - 16 - CARD_H : CARD_TOP + CARD_H,
      };
    },
    [canvasSize.width, canvasSize.height],
  );

  // Begin the walkthrough at the first stop (breadcrumb grows from empty).
  const startTour = useCallback(() => {
    setPathNodes([]);
    setLineShown(false);
    setCardShown(false);
    setFinished(false);
    setLeaderLine(null);
    setActiveStop(0);
    setStarted(true);
  }, []);

  // Review mode: jump straight to a stop's card (no morph) when its row is
  // tapped in the finished list.
  const selectStop = useCallback(
    (index: number) => {
      setActiveStop(index);
      setPathNodes(stopNodes(TRAIL_MARKERS[index].path));
      const line = computeLeaderLine(TRAIL_MARKERS[index].path, index === 0);
      setLeaderLine(line);
      setLineShown(line != null);
      setCardShown(true);
    },
    [computeLeaderLine],
  );

  // Advance to the next stop (user-driven). The breadcrumb is left as-is so the
  // effect can morph it into the next stop's path rather than resetting it.
  const nextStop = useCallback(() => {
    if (activeStop == null || activeStop >= TRAIL_MARKERS.length - 1) return;
    setLineShown(false);
    setCardShown(false);
    setLeaderLine(null);
    setActiveStop(activeStop + 1);
  }, [activeStop]);

  // Per-stop reveal: morph the breadcrumb from the previous stop's path into the
  // active stop's (retract the diverging tail to the shared prefix, then extend),
  // one node per tick, then draw the leader line, then the card. No auto-advance.
  useEffect(() => {
    // In review mode (finished), stop selection is driven by selectStop, not by
    // the morph animation.
    if (step !== 1 || !started || activeStop == null || finished) return;

    const target = stopNodes(TRAIL_MARKERS[activeStop].path);
    const prev = activeStop === 0 ? [] : stopNodes(TRAIL_MARKERS[activeStop - 1].path);
    const frames = morphFrames(prev, target);
    const isLast = activeStop === TRAIL_MARKERS.length - 1;

    setLineShown(false);
    setCardShown(false);
    setLeaderLine(null);
    setPathNodes(prev); // start from the previous stop's full path (no-op if already there)

    const timers: ReturnType<typeof setTimeout>[] = [];
    frames.forEach((frame, idx) => {
      timers.push(setTimeout(() => setPathNodes(frame), (idx + 1) * REVEAL_STEP_MS));
    });

    const afterFrames = (frames.length + 1) * REVEAL_STEP_MS;
    timers.push(
      setTimeout(() => {
        setLeaderLine(computeLeaderLine(TRAIL_MARKERS[activeStop].path, activeStop === 0));
        setLineShown(true);
      }, afterFrames),
    );
    timers.push(
      setTimeout(() => {
        setCardShown(true);
        if (isLast) setFinished(true); // last stop revealed → enter review mode
      }, afterFrames + REVEAL_STEP_MS),
    );

    return () => timers.forEach(clearTimeout);
  }, [step, started, activeStop, finished, computeLeaderLine]);

  const activePath =
    step === 1 && activeStop != null ? TRAIL_MARKERS[activeStop].path : null;
  // The active stop's file is "reached" once the breadcrumb has fully extended
  // to it — that's when its numbered badge joins the trail.
  const fileReached =
    activePath != null && pathNodes.some((n) => n.type === 'file' && n.path === activePath);

  // Files lit so far: every completed stop, plus the active stop once its
  // breadcrumb has reached the file. Drives the numbered trail badges. In review
  // mode the whole trail is shown.
  const highlightRevealed = finished
    ? TRAIL_MARKERS.length
    : step === 1 && activeStop != null
      ? activeStop + (fileReached ? 1 : 0)
      : 0;

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

  // Step 3 (coverage) — the trail currently drilled into and its clickable steps.
  const drilledTrail =
    step === 2 && coverageTrailId
      ? coverageLayers.find((l) => l.id === coverageTrailId) ?? null
      : null;
  const drilledSteps = useMemo(
    () => (drilledTrail ? trailSteps(drilledTrail) : []),
    [drilledTrail],
  );
  const selectedCoverageStep =
    coverageStep != null && drilledSteps[coverageStep] ? drilledSteps[coverageStep] : null;

  const drillTrail = useCallback((id: string) => {
    setCoverageTrailId(id);
    setCoverageStep(null);
    setCardShown(false);
    setLineShown(false);
    setLeaderLine(null);
  }, []);

  const backFromTrail = useCallback(() => {
    setCoverageTrailId(null);
    setCoverageStep(null);
    setCardShown(false);
    setLineShown(false);
    setLeaderLine(null);
  }, []);

  // Tap a coverage step → open its card on the map (no morph; like the review).
  const selectCoverageStep = useCallback(
    (i: number) => {
      const stepPath = drilledSteps[i]?.path;
      if (!stepPath) return;
      setCoverageStep(i);
      const line = computeLeaderLine(stepPath, i === 0);
      setLeaderLine(line);
      setLineShown(line != null);
      setCardShown(true);
    },
    [drilledSteps, computeLeaderLine],
  );

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
      // The morphing breadcrumb path — ancestor folders + the current file —
      // as a single highlight layer. It retracts/extends node-by-node between
      // stops (the numbered trail badges below carry the persistent trail).
      if (pathNodes.length === 0) return [];
      return [
        {
          id: 'trail-path',
          name: 'Path to file',
          enabled: true,
          color: trailColor,
          opacity: 1,
          borderWidth: 2,
          priority: 100,
          items: pathNodes.map((n) => ({
            path: n.path,
            type: n.type === 'dir' ? ('directory' as const) : ('file' as const),
            renderStrategy: 'border' as const,
          })),
        },
      ];
    }
    if (step === 2) {
      // All coverage trails stay lit; a selected step gets a bright border so it
      // reads as "the one you're looking at" over its trail-colored fill.
      const layers: HighlightLayer[] = [...coverageLayers];
      if (selectedCoverageStep) {
        layers.push({
          id: 'cov-selected',
          name: 'Selected step',
          enabled: true,
          color: '#ffffff',
          opacity: 1,
          borderWidth: 2,
          priority: 200,
          items: [
            { path: selectedCoverageStep.path, type: 'file', renderStrategy: 'border' },
          ],
        });
      }
      return layers;
    }

    // Step 0: outline the borders of folders that are open in the tree, plus
    // outline the tapped file as the current selection.
    const layers: HighlightLayer[] = [];
    if (openFolders.size > 0) {
      layers.push({
        id: 'open-folders',
        name: 'Open folders',
        enabled: true,
        color: theme.colors.accent,
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
        color: trailColor,
        opacity: 1,
        borderWidth: 2,
        priority: 100,
        items: [{ path: openedFile.path, type: 'file', renderStrategy: 'border' }],
      });
    }
    return layers;
  }, [step, pathNodes, openedFile, openFolders, trailColor, coverageLayers, selectedCoverageStep, theme.colors.accent]);

  // Numbered badges: the revealed trail in step 1; the drilled trail's steps in
  // step 2 (so a coverage trail's stops are numbered once you open it).
  const markerTrail =
    step === 1
      ? TRAIL_MARKERS.slice(0, highlightRevealed).map((m) => m.path)
      : step === 2 && drilledSteps.length > 0
        ? drilledSteps.map((s) => s.path)
        : undefined;
  const markerTrailColor = step === 2 && drilledTrail ? drilledTrail.color : trailColor;
  const isolationMode = step === 1 ? 'transparent' : 'none';
  // The map holds completely still through the walkthrough — the markers,
  // trail, and cards reveal over a static city, with no camera movement.
  const zoomToPath = null;

  const stepInfo = STEPS[step];
  // While mid-walkthrough (not yet on the last stop), hide the Back/Next nav so
  // the only control is "Next step". The nav returns on the final stop so the
  // user can continue to step 2.
  const walkingTrail =
    step === 1 &&
    started &&
    !finished &&
    activeStop != null &&
    activeStop < TRAIL_MARKERS.length - 1;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* ── The city (persistent; only props change per step) ── */}
      <View style={styles.canvasWrap} onLayout={onCanvasLayout}>
        <FileCityCanvas
          ref={canvasRef}
          cityData={step === 2 ? greyCity : LEARN_CITY}
          backgroundColor={theme.colors.background}
          highlightLayers={highlightLayers}
          isolationMode={isolationMode}
          markerTrail={markerTrail}
          markerTrailColor={markerTrailColor}
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
            accentColor={trailColor}
            theme={theme}
            onClose={closeFile}
            closeSignal={closeSignal}
          />
        )}

        {/* Step 1 reveal: line drawn from the stop to the card, once the
            breadcrumb has reached the file. */}
        {step === 1 && started && leaderLine && lineShown && (
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

        {/* Step 1 reveal: caption card (final tick). The first stop's marker
            sits up top, so its card drops to the bottom to avoid covering it;
            later cards sit at the top. */}
        {step === 1 && started && activeStop != null && cardShown && (
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
              label={TRAIL_MARKERS[activeStop].label}
              note={TRAIL_MARKERS[activeStop].note}
              color={trailColor}
              theme={theme}
            />
          </View>
        )}

        {/* Step 2: leader line + caption card for the selected coverage step. */}
        {step === 2 && leaderLine && lineShown && (
          <LearnTrailsLeaderLine
            key={`cov-line-${coverageStep}`}
            stopX={leaderLine.stopX}
            stopY={leaderLine.stopY}
            cardX={leaderLine.cardX}
            cardEdgeY={leaderLine.cardEdgeY}
            color={theme.colors.textSecondary}
            width={canvasSize.width}
            height={canvasSize.height}
          />
        )}
        {step === 2 && cardShown && coverageStep != null && selectedCoverageStep && (
          <View
            style={[
              styles.stopCardWrap,
              coverageStep === 0 ? styles.stopCardBottom : styles.stopCardTop,
            ]}
            pointerEvents="none"
          >
            <LearnTrailsStopCard
              key={`cov-${coverageStep}`}
              index={coverageStep}
              label={selectedCoverageStep.label}
              note={selectedCoverageStep.note}
              color={drilledTrail?.color ?? trailColor}
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
        {step === 1 && started ? (
          /* Once the walkthrough starts, the title/body give way to the path
             breadcrumb, morphing folder › folder › file (left-aligned). */
          <View style={[styles.breadcrumbRow, styles.breadcrumbHeader]}>
            {pathNodes.map((node, i) => (
              <React.Fragment key={node.path}>
                {i > 0 && (
                  <Text style={[styles.crumbSep, { color: theme.colors.textTertiary }]}>›</Text>
                )}
                <Text
                  style={[
                    styles.crumb,
                    node.type === 'file' && styles.crumbFile,
                    { color: trailColor },
                  ]}
                >
                  {node.name}
                </Text>
              </React.Fragment>
            ))}
          </View>
        ) : (
          <>
            <Text style={[styles.title, { color: theme.colors.accent }]}>
              {/* Accent title, but the word "trail(s)" picks up the primary trail color. */}
              {stepInfo.title.split(/(trails?)/i).map((part, i) =>
                /^trails?$/i.test(part) ? (
                  <Text key={i} style={{ color: trailColor }}>
                    {part}
                  </Text>
                ) : (
                  part
                ),
              )}
            </Text>
            <Text style={[styles.body, { color: theme.colors.textSecondary }]}>
              {stepInfo.body}
            </Text>
          </>
        )}

        {/* Coverage payoff: how much of the city the trails light up. */}
        {step === 2 && (
          <View style={styles.comprehension}>
            <View style={styles.comprehensionHead}>
              <Text style={[styles.comprehensionPct, { color: trailColor }]}>
                {COMPREHENSION_PCT}%
              </Text>
              <Text style={[styles.comprehensionLabel, { color: theme.colors.textSecondary }]}>
                comprehension — files these trails cover
              </Text>
            </View>
            <View style={[styles.comprehensionTrack, { backgroundColor: theme.colors.border }]}>
              <View
                style={[
                  styles.comprehensionFill,
                  { width: `${COMPREHENSION_PCT}%`, backgroundColor: trailColor },
                ]}
              />
            </View>
          </View>
        )}

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

          {step === 1 &&
            (finished ? (
              /* Review mode: the trail's stops as a tappable list — tap a row to
                 reopen that stop's card on the map. */
              <View style={styles.stepList}>
                {TRAIL_MARKERS.map((m, i) => {
                  const selected = activeStop === i;
                  return (
                    <TouchableOpacity
                      key={m.path}
                      activeOpacity={0.8}
                      onPress={() => selectStop(i)}
                      style={[
                        styles.stepRow,
                        {
                          borderColor: selected ? trailColor : theme.colors.border,
                          backgroundColor: selected ? theme.colors.background : 'transparent',
                        },
                      ]}
                    >
                      <View style={styles.stepRowBadge}>
                        <Text style={styles.stepRowBadgeText}>{i + 1}</Text>
                      </View>
                      <Text
                        numberOfLines={1}
                        style={[
                          styles.stepRowLabel,
                          { color: selected ? theme.colors.text : theme.colors.textSecondary },
                        ]}
                      >
                        {m.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ) : (
              <View style={styles.startWrap}>
                {!started ? (
                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={startTour}
                    style={[styles.startButton, { borderColor: trailColor }]}
                  >
                    <Text style={[styles.startButtonText, { color: trailColor }]}>Start</Text>
                  </TouchableOpacity>
                ) : activeStop != null && activeStop < TRAIL_MARKERS.length - 1 ? (
                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={nextStop}
                    style={[styles.startButton, { borderColor: trailColor }]}
                  >
                    <Text style={[styles.startButtonText, { color: trailColor }]}>Next step</Text>
                  </TouchableOpacity>
                ) : (
                  <Text style={[styles.playingText, { color: theme.colors.textSecondary }]}>
                    That's the whole trail — continue below.
                  </Text>
                )}
              </View>
            ))}

          {step === 2 &&
            (drilledTrail ? (
              /* Drilled into a trail: Back + its steps; tap a step to open its card. */
              <View style={styles.stepList}>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={backFromTrail}
                  style={styles.backRow}
                >
                  <Text style={[styles.backText, { color: theme.colors.textSecondary }]}>‹</Text>
                  <Text style={[styles.backTrailName, { color: drilledTrail.color }]}>
                    {drilledTrail.name}
                  </Text>
                </TouchableOpacity>
                {drilledSteps.map((s, i) => {
                  const selected = coverageStep === i;
                  return (
                    <TouchableOpacity
                      key={s.path}
                      activeOpacity={0.8}
                      onPress={() => selectCoverageStep(i)}
                      style={[
                        styles.stepRow,
                        {
                          borderColor: selected ? drilledTrail.color : theme.colors.border,
                          backgroundColor: selected ? theme.colors.background : 'transparent',
                        },
                      ]}
                    >
                      <View style={styles.stepRowBadge}>
                        <Text style={styles.stepRowBadgeText}>{i + 1}</Text>
                      </View>
                      <Text
                        numberOfLines={1}
                        style={[
                          styles.stepRowLabel,
                          { color: selected ? theme.colors.text : theme.colors.textSecondary },
                        ]}
                      >
                        {s.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ) : (
              /* Trail list — every trail is lit on the map; tap one to explore it. */
              <View style={styles.legend}>
                <Text style={[styles.legendHint, { color: theme.colors.textSecondary }]}>
                  Tap a trail to walk its steps.
                </Text>
                {coverageLayers.map((layer) => (
                  <TouchableOpacity
                    key={layer.id}
                    activeOpacity={0.8}
                    onPress={() => drillTrail(layer.id)}
                    style={[styles.legendRow, { borderColor: layer.color }]}
                  >
                    <View style={[styles.legendSwatch, { backgroundColor: layer.color }]} />
                    <Text style={[styles.legendName, { color: theme.colors.text }]}>
                      {layer.name}
                    </Text>
                    <Text style={[styles.legendToggle, { color: theme.colors.textTertiary }]}>›</Text>
                  </TouchableOpacity>
                ))}
              </View>
            ))}
        </ScrollView>

        {/* ── Nav row + progress (nav hidden while walking the trail) ── */}
        {!walkingTrail && (
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
        )}

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
    top: CARD_TOP,
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
  // Step 2: comprehension stat — big percentage + coverage bar.
  comprehension: {
    marginTop: 12,
    gap: 8,
  },
  comprehensionHead: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 10,
  },
  comprehensionPct: {
    fontSize: 30,
    fontWeight: '800',
  },
  comprehensionLabel: {
    flex: 1,
    fontSize: 13.5,
    lineHeight: 18,
  },
  comprehensionTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  comprehensionFill: {
    height: '100%',
    borderRadius: 4,
  },
  // Step 1 review mode + step 2 drilled-trail steps: tappable rows.
  stepList: {
    gap: 10,
  },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
    marginBottom: 2,
  },
  backText: {
    fontSize: 20,
    fontWeight: '600',
  },
  backTrailName: {
    fontSize: 15,
    fontWeight: '700',
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  // Matches the map/card numbered markers: white square, dark border + number.
  stepRowBadge: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#0b1020',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepRowBadgeText: {
    color: '#0b1020',
    fontSize: 13,
    fontWeight: '800',
  },
  stepRowLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
  },
  // Step 1: the drilling path shown as text (folder › folder › file) where the
  // title/body normally sit, building up in sync with the map highlights.
  breadcrumbRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 6,
  },
  // Stands in for the title + body block, so the panel height stays steady when
  // the walkthrough starts.
  breadcrumbHeader: {
    minHeight: 48,
    marginBottom: 6,
  },
  crumb: {
    fontSize: 15,
    fontWeight: '600',
  },
  crumbFile: {
    fontWeight: '700',
  },
  crumbSep: {
    fontSize: 15,
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
