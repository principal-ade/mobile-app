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
import Animated, { FadeInUp, LinearTransition } from 'react-native-reanimated';
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
  TRAIL_NAME,
  TEAM_MEMBERS,
  teamMemberLayer,
  membersCoveringPath,
  learnFileContents,
} from '../../data/learnTrailsCity';
import { LearnTrailsAvatar } from './LearnTrailsAvatar';
import type { RootStackParamList } from '../../navigation/types';

const STEPS = [
  {
    title: "This is your codebase's file city",
    body: 'Its a view of the files on your computer colored by the type of file.',
  },
  {
    title: 'Codebases can feel like black boxes',
    body: 'It can be hard to know how things work across files. A trail is the fastest way to understand what is going on.',
  },
  {
    title: 'Watch your understanding grow',
    body: "As your team lays more trails, the map fills in — a living picture of what's understood and reviewed.",
  },
  {
    title: 'Together you cover everything',
    body: 'Each teammate understands part of the codebase. Tap an avatar to see their slice — together they cover the whole thing.',
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
// Steps 1 & 2 render the city as near-black "black boxes" so highlights read as
// colored (known) vs black (opaque) — the file colors are intentionally hidden.
const CITY_BLACK = '#0a0a0a';

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

// Comprehension after each coverage trail is laid (cumulative union of files
// over the total building count). Index 0 = nothing laid yet; the last entry is
// the final comprehension once every trail is on the map.
const COVERAGE_CUMULATIVE_PCT: number[] = (() => {
  const total = LEARN_CITY.buildings.length;
  const covered = new Set<string>();
  const out = [0];
  for (const layer of COVERAGE_LAYERS) {
    for (const item of layer.items) covered.add(item.path);
    out.push(total ? Math.round((covered.size / total) * 100) : 0);
  }
  return out;
})();
// Step 3 entrance: each trail layer pops in this many ms after the previous.
const LAYER_REVEAL_MS = 1200;

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

/** Human label for a file's kind — drives the step 0 color legend. */
function fileKind(path: string): string {
  if (/\.(test|spec)\.[jt]sx?$/i.test(path)) return 'Tests';
  switch (path.split('.').pop()?.toLowerCase()) {
    case 'ts':
    case 'tsx':
      return 'TypeScript';
    case 'js':
    case 'jsx':
      return 'JavaScript';
    case 'json':
      return 'JSON';
    case 'md':
      return 'Markdown';
    case 'css':
      return 'Styles';
    default:
      return 'Config';
  }
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
  // Steps 1 & 2 use a black-box copy of the city so highlights read as colored vs
  // black — the trail / coverage fills color buildings in; the rest stay black.
  const blackCity = useMemo(
    () => ({
      ...LEARN_CITY,
      buildings: LEARN_CITY.buildings.map((b) => ({ ...b, color: CITY_BLACK })),
    }),
    [],
  );
  // Step 0 color legend — distinct file-type colors present in the city, in the
  // same getFileColor() the canvas paints buildings with, most-common first.
  const fileLegend = useMemo(() => {
    const byColor = new Map<string, { color: string; label: string; count: number }>();
    for (const b of LEARN_CITY.buildings) {
      const color = getFileColor(b.path);
      const entry = byColor.get(color);
      if (entry) entry.count++;
      else byColor.set(color, { color, label: fileKind(b.path), count: 1 });
    }
    return [...byColor.values()].sort((a, b) => b.count - a.count);
  }, []);

  const [step, setStep] = useState<0 | 1 | 2 | 3>(0);
  // Step 0 panel toggle: the file tree or the color legend.
  const [step0View, setStep0View] = useState<'tree' | 'legend'>('legend');
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
  // Mirror of pathNodes for the morph effect to read the *current* breadcrumb as
  // its starting point without depending on it (which would re-fire the effect).
  const pathNodesRef = useRef<PathNode[]>([]);
  const [lineShown, setLineShown] = useState(false);
  const [cardShown, setCardShown] = useState(false);
  // Highest stop completed so far (-1 = none yet). The step list reveals stops
  // up to reachedStop + 1, so only the next step is ever shown ahead.
  const [reachedStop, setReachedStop] = useState(-1);
  const [leaderLine, setLeaderLine] = useState<{
    stopX: number;
    stopY: number;
    cardX: number;
    cardEdgeY: number;
  } | null>(null);
  // Step 3 (coverage): the trail drilled into (by layer id), and which of its
  // steps is selected. All trails are lit; drilling just reveals steps.
  const [coverageTrailId, setCoverageTrailId] = useState<string | null>(null);
  const [coverageStep, setCoverageStep] = useState<number | null>(null);
  // Step 3 entrance animation: how many trail layers have populated so far, and
  // the comprehension percentage currently displayed (counts up to the target).
  const [coverageRevealed, setCoverageRevealed] = useState(0);
  const [displayPct, setDisplayPct] = useState(0);
  // Step 4 (team coverage): the isolated teammate (null = everyone / full
  // coverage), and the file tapped on the map (its coverers fill the panel).
  const [teamSelected, setTeamSelected] = useState<string | null>(null);
  const [coveredFile, setCoveredFile] = useState<string | null>(null);
  // Step 4 — one filled layer per teammate (their color). Selecting a teammate
  // shows only their layer; otherwise all four light up = full coverage.
  const teamLayers = useMemo<HighlightLayer[]>(
    () => TEAM_MEMBERS.map((m, i) => teamMemberLayer(m, 50 - i * 10)),
    [],
  );
  const teamMember = teamSelected
    ? TEAM_MEMBERS.find((m) => m.id === teamSelected) ?? null
    : null;

  const goToStep = (next: 0 | 1 | 2 | 3) => {
    setOpenedFile(null);
    setOpenOrigin(null);
    setActiveStop(null);
    setStarted(false);
    setPathNodes([]);
    setLineShown(false);
    setCardShown(false);
    setReachedStop(-1);
    setLeaderLine(null);
    setCoverageTrailId(null);
    setCoverageStep(null);
    setCoverageRevealed(0);
    setDisplayPct(0);
    setTeamSelected(null);
    setCoveredFile(null);
    setStep(next);
  };

  // Step 3 entrance: lay the trail layers one at a time on the map.
  useEffect(() => {
    if (step !== 2) return;
    setCoverageTrailId(null);
    setCoverageStep(null);
    setCoverageRevealed(0);
    setDisplayPct(0);
    const timers: ReturnType<typeof setTimeout>[] = [];
    for (let k = 1; k <= COVERAGE_LAYERS.length; k++) {
      timers.push(setTimeout(() => setCoverageRevealed(k), k * LAYER_REVEAL_MS));
    }
    return () => timers.forEach(clearTimeout);
  }, [step]);

  // Tick the displayed percentage toward the coverage laid so far (counts up).
  // Step 2 counts up as trails reveal; step 3 shows the team's coverage — 100%
  // for everyone, or the isolated teammate's share of the city.
  const teamTotal = LEARN_CITY.buildings.length;
  const teamPct = teamMember
    ? Math.round((teamMember.files.length / teamTotal) * 100)
    : 100;
  const targetPct =
    step === 2
      ? COVERAGE_CUMULATIVE_PCT[coverageRevealed] ?? 0
      : step === 3
        ? teamPct
        : 0;
  useEffect(() => {
    if (displayPct === targetPct) return;
    const dir = displayPct < targetPct ? 1 : -1;
    const t = setTimeout(() => setDisplayPct((p) => p + dir), 22);
    return () => clearTimeout(t);
  }, [displayPct, targetPct]);

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

  // Keep the ref in step with the rendered breadcrumb.
  useEffect(() => {
    pathNodesRef.current = pathNodes;
  }, [pathNodes]);

  // Begin the walkthrough at the first stop (breadcrumb grows from empty).
  const startTour = useCallback(() => {
    setPathNodes([]);
    setLineShown(false);
    setCardShown(false);
    setReachedStop(-1);
    setLeaderLine(null);
    setActiveStop(0);
    setStarted(true);
  }, []);

  // Tap a step row to walk to it — the breadcrumb morphs from wherever it is now
  // into that stop's path (forward to the next, or back to an earlier one). Hide
  // the current card/line in the same update so the new stop's card doesn't flash
  // before the morph restarts.
  const walkToStop = useCallback((index: number) => {
    setLineShown(false);
    setCardShown(false);
    setLeaderLine(null);
    setActiveStop(index);
  }, []);

  // Per-stop reveal: morph the breadcrumb from its *current* path into the active
  // stop's (retract the diverging tail to the shared prefix, then extend), one
  // node per tick, then the leader line, then the card. Completing a stop bumps
  // reachedStop, which reveals the next row.
  useEffect(() => {
    if (step !== 1 || !started || activeStop == null) return;

    const target = stopNodes(TRAIL_MARKERS[activeStop].path);
    const prev = pathNodesRef.current;
    const frames = morphFrames(prev, target);
    const stop = activeStop;

    setLineShown(false);
    setCardShown(false);
    setLeaderLine(null);

    const timers: ReturnType<typeof setTimeout>[] = [];
    frames.forEach((frame, idx) => {
      timers.push(setTimeout(() => setPathNodes(frame), (idx + 1) * REVEAL_STEP_MS));
    });

    const afterFrames = (frames.length + 1) * REVEAL_STEP_MS;
    timers.push(
      setTimeout(() => {
        setLeaderLine(computeLeaderLine(TRAIL_MARKERS[stop].path, stop === 0));
        setLineShown(true);
      }, afterFrames),
    );
    timers.push(
      setTimeout(() => {
        setCardShown(true);
        setReachedStop((r) => Math.max(r, stop)); // stop done → reveal the next row
      }, afterFrames + REVEAL_STEP_MS),
    );

    return () => timers.forEach(clearTimeout);
  }, [step, started, activeStop, computeLeaderLine]);

  // Numbered trail badges: one per completed stop (reachedStop + 1 of them).
  const highlightRevealed = step === 1 && started ? reachedStop + 1 : 0;

  // Step 1 city: black, except trail files the breadcrumb has reached — those
  // take their real file-type (suffix) color as their *base* color, so the
  // primary breadcrumb border draws on top of it. Completed stops stay colored.
  const trailCity = useMemo(() => {
    const colored = new Set(TRAIL_MARKERS.slice(0, reachedStop + 1).map((m) => m.path));
    for (const n of pathNodes) if (n.type === 'file') colored.add(n.path);
    if (colored.size === 0) return blackCity;
    return {
      ...LEARN_CITY,
      buildings: LEARN_CITY.buildings.map((b) => ({
        ...b,
        color: colored.has(b.path) ? getFileColor(b.path) : CITY_BLACK,
      })),
    };
  }, [reachedStop, pathNodes, blackCity]);

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
  // True once every trail layer has finished populating in the entrance animation.
  const coverageDone = coverageRevealed >= COVERAGE_LAYERS.length;

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
      // The morphing breadcrumb path — folders + the current file — as primary
      // borders, tracing the route to the stop being walked. The file's suffix
      // color comes from the city's base color (trailCity), so it shows *under*
      // this border the moment the border reaches the file.
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
      // Trails light up one at a time on entry (coverageRevealed), then all stay
      // lit; a selected step gets a bright border over its trail-colored fill.
      const layers: HighlightLayer[] = coverageLayers.slice(0, coverageRevealed);
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
    if (step === 3) {
      // Team coverage: all teammates lit = full coverage; isolating one shows
      // only their files. A tapped file gets a bright border over its fill.
      const base = teamMember
        ? teamLayers.filter((l) => l.id === teamMember.id)
        : teamLayers;
      const layers: HighlightLayer[] = [...base];
      if (coveredFile) {
        layers.push({
          id: 'team-selected-file',
          name: 'Selected file',
          enabled: true,
          color: '#ffffff',
          opacity: 1,
          borderWidth: 2,
          priority: 200,
          items: [{ path: coveredFile, type: 'file', renderStrategy: 'border' }],
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
  }, [step, pathNodes, openedFile, openFolders, trailColor, coverageLayers, coverageRevealed, selectedCoverageStep, teamLayers, teamMember, coveredFile, theme.colors.accent]);

  // Numbered badges: the revealed trail in step 1; the drilled trail's steps in
  // step 2 (so a coverage trail's stops are numbered once you open it).
  const markerTrail =
    step === 1
      ? TRAIL_MARKERS.slice(0, highlightRevealed).map((m) => m.path)
      : step === 2 && drilledSteps.length > 0
        ? drilledSteps.map((s) => s.path)
        : undefined;
  const markerTrailColor = step === 2 && drilledTrail ? drilledTrail.color : trailColor;
  // No isolation dimming — the grey city stays visible; color marks the trail.
  const isolationMode = 'none';
  // The map holds completely still through the walkthrough — the markers,
  // trail, and cards reveal over a static city, with no camera movement.
  const zoomToPath = null;

  const stepInfo = STEPS[step];
  // While mid-walkthrough (last stop not yet reached), hide the Back/Next nav so
  // the only controls are the step rows. The nav returns once the final stop is
  // reached, so the user can continue to step 2.
  const walkingTrail =
    step === 1 && started && reachedStop < TRAIL_MARKERS.length - 1;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* ── The city (persistent; only props change per step) ── */}
      <View style={styles.canvasWrap} onLayout={onCanvasLayout}>
        <FileCityCanvas
          ref={canvasRef}
          cityData={step === 0 ? LEARN_CITY : step === 1 ? trailCity : blackCity}
          backgroundColor={theme.colors.background}
          highlightLayers={highlightLayers}
          isolationMode={isolationMode}
          markerTrail={markerTrail}
          markerTrailColor={markerTrailColor}
          zoomToPath={zoomToPath}
          enableZoom={step !== 1}
          enablePan={step !== 1}
          dimmedPaths={dimmedPaths}
          onBuildingPress={
            step === 0
              ? openFile
              : step === 3
                ? (b) => setCoveredFile(b.path)
                : undefined
          }
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
          /* Once the walkthrough starts, the title/body give way to the trail
             name + the morphing path breadcrumb (folder › folder › file). */
          <View style={styles.breadcrumbHeader}>
            <Text style={[styles.trailName, { color: theme.colors.text }]}>{TRAIL_NAME}</Text>
            <View style={styles.breadcrumbRow}>
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
          </View>
        ) : (
          <>
            <Text style={[styles.title, { color: theme.colors.text }]}>
              {/* Normal text; "file city" is accent, the other key words primary. */}
              {stepInfo.title.split(/(file city|trails?|understanding|codebases?)/i).map((part, i) => {
                if (/^file city$/i.test(part)) {
                  return (
                    <Text key={i} style={{ color: theme.colors.accent }}>
                      {part}
                    </Text>
                  );
                }
                // "codebase" is only a highlighted keyword after step 0; in
                // step 0 it sits next to the accented "file city" and we let
                // that phrase be the only colored words.
                if (step === 0 && /^codebases?$/i.test(part)) {
                  return part;
                }
                if (/^(trails?|understanding|codebases?)$/i.test(part)) {
                  return (
                    <Text key={i} style={{ color: trailColor }}>
                      {part}
                    </Text>
                  );
                }
                return part;
              })}
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
                {displayPct}%
              </Text>
              <Text style={[styles.comprehensionLabel, { color: theme.colors.textSecondary }]}>
                comprehension — files these trails cover
              </Text>
            </View>
            <View style={[styles.comprehensionTrack, { backgroundColor: theme.colors.border }]}>
              <View
                style={[
                  styles.comprehensionFill,
                  { width: `${displayPct}%`, backgroundColor: trailColor },
                ]}
              />
            </View>
          </View>
        )}

        {/* Step 4 coverage payoff: 100% together, or the isolated teammate's share. */}
        {step === 3 && (
          <View style={styles.comprehension}>
            <View style={styles.comprehensionHead}>
              <Text
                style={[
                  styles.comprehensionPct,
                  { color: teamMember ? teamMember.color : trailColor },
                ]}
              >
                {displayPct}%
              </Text>
              <Text style={[styles.comprehensionLabel, { color: theme.colors.textSecondary }]}>
                {teamMember
                  ? `understood by ${teamMember.name}`
                  : 'understood by the team — together'}
              </Text>
            </View>
            <View style={[styles.comprehensionTrack, { backgroundColor: theme.colors.border }]}>
              <View
                style={[
                  styles.comprehensionFill,
                  {
                    width: `${displayPct}%`,
                    backgroundColor: teamMember ? teamMember.color : trailColor,
                  },
                ]}
              />
            </View>
          </View>
        )}

        {/* Step 4 teammate row — tap to isolate a teammate, "Everyone" for full. */}
        {step === 3 && (
          <View style={styles.teamRow}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => {
                setTeamSelected(null);
                setCoveredFile(null);
              }}
              style={[
                styles.everyonePill,
                {
                  borderColor: theme.colors.border,
                  backgroundColor: teamSelected == null ? theme.colors.background : 'transparent',
                },
              ]}
            >
              <Text
                style={[
                  styles.everyoneText,
                  { color: teamSelected == null ? theme.colors.text : theme.colors.textSecondary },
                ]}
              >
                Everyone
              </Text>
            </TouchableOpacity>
            {TEAM_MEMBERS.map((m) => (
              <LearnTrailsAvatar
                key={m.id}
                member={m}
                size={40}
                selected={teamSelected === m.id}
                dimmed={teamSelected != null && teamSelected !== m.id}
                onPress={() => {
                  setTeamSelected((cur) => (cur === m.id ? null : m.id));
                  setCoveredFile(null);
                }}
              />
            ))}
          </View>
        )}

        {/* Step 0 Files/Legend toggle — fixed above the scrollable content. */}
        {step === 0 && (
          <View style={[styles.segmented, { borderColor: theme.colors.border }]}>
            {(['legend', 'tree'] as const).map((view) => {
              const active = step0View === view;
              return (
                <TouchableOpacity
                  key={view}
                  activeOpacity={0.8}
                  onPress={() => setStep0View(view)}
                  style={[styles.segItem, active && { backgroundColor: theme.colors.background }]}
                >
                  <Text
                    style={[
                      styles.segText,
                      { color: active ? theme.colors.text : theme.colors.textSecondary },
                    ]}
                  >
                    {view === 'tree' ? 'Files' : 'Legend'}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        <ScrollView
          style={styles.stepArea}
          contentContainerStyle={styles.stepAreaContent}
          showsVerticalScrollIndicator={false}
        >
          {step === 0 &&
            (step0View === 'tree' ? (
              <FileTree
                city={LEARN_CITY}
                selectedPath={openedFile?.path ?? null}
                onFilePress={toggleFile}
                onVisibleFilesChange={handleVisibleFiles}
                onOpenFoldersChange={handleOpenFolders}
              />
            ) : (
              <View style={styles.fileLegend}>
                {fileLegend.map((e) => (
                  <View key={e.color} style={styles.fileLegendRow}>
                    <View style={[styles.legendSwatch, { backgroundColor: e.color }]} />
                    <Text style={[styles.fileLegendLabel, { color: theme.colors.text }]}>
                      {e.label}
                    </Text>
                    <Text style={[styles.fileLegendCount, { color: theme.colors.textTertiary }]}>
                      {e.count}
                    </Text>
                  </View>
                ))}
              </View>
            ))}

          {step === 1 &&
            (!started ? (
              <View style={styles.startWrap}>
                {/* Name the trail up front so the walk has context. */}
                <View style={styles.trailIntro}>
                  <Text style={[styles.trailIntroCaption, { color: theme.colors.textTertiary }]}>
                    THE TRAIL YOU'LL WALK
                  </Text>
                  <Text style={[styles.trailIntroName, { color: theme.colors.text }]}>
                    {TRAIL_NAME}
                  </Text>
                </View>
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={startTour}
                  style={[styles.startButton, { borderColor: trailColor }]}
                >
                  <Text style={[styles.startButtonText, { color: trailColor }]}>Start</Text>
                </TouchableOpacity>
              </View>
            ) : (
              /* The trail's stops as tappable rows, revealed one ahead: stops
                 completed so far plus the next. Tapping morphs to that stop. */
              <View style={styles.stepList}>
                {TRAIL_MARKERS.slice(0, Math.min(reachedStop + 2, TRAIL_MARKERS.length)).map(
                  (m, i) => {
                    const selected = activeStop === i;
                    const isNext = i === reachedStop + 1; // not yet completed
                    return (
                      <TouchableOpacity
                        key={m.path}
                        activeOpacity={0.8}
                        onPress={() => walkToStop(i)}
                        style={[
                          styles.stepRow,
                          {
                            borderColor:
                              selected || isNext ? trailColor : theme.colors.border,
                            backgroundColor: selected
                              ? theme.colors.background
                              : 'transparent',
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
                            {
                              color: selected
                                ? theme.colors.text
                                : isNext
                                  ? trailColor
                                  : theme.colors.textSecondary,
                            },
                          ]}
                        >
                          {/* The upcoming stop stays a mystery until it's walked. */}
                          {isNext && !selected ? 'Next' : m.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  },
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
              /* Trail list — each card appears in sync with its map trail as the
                 entrance animation lays them down; tap one to explore it. */
              <View style={styles.legend}>
                <Text style={[styles.legendHint, { color: theme.colors.textSecondary }]}>
                  {coverageDone ? 'Tap a trail to walk its steps.' : 'Laying trails over the city…'}
                </Text>
                {coverageLayers.slice(0, coverageRevealed).reverse().map((layer) => (
                  <Animated.View
                    key={layer.id}
                    entering={FadeInUp.duration(450)}
                    layout={LinearTransition.duration(450)}
                  >
                    <TouchableOpacity
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
                  </Animated.View>
                ))}
              </View>
            ))}

          {step === 3 &&
            (coveredFile ? (
              /* A file was tapped: name it + show the teammates who cover it. */
              <View style={styles.coveredFile}>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => setCoveredFile(null)}
                  style={styles.backRow}
                >
                  <Text style={[styles.backText, { color: theme.colors.textSecondary }]}>‹</Text>
                  <Text
                    numberOfLines={1}
                    style={[styles.backTrailName, { color: theme.colors.text }]}
                  >
                    {coveredFile.split('/').pop()}
                  </Text>
                </TouchableOpacity>
                <Text style={[styles.legendHint, { color: theme.colors.textSecondary }]}>
                  Understood by
                </Text>
                <View style={styles.coveredAvatars}>
                  {membersCoveringPath(coveredFile).map((m) => (
                    <View key={m.id} style={styles.coveredAvatarRow}>
                      <LearnTrailsAvatar member={m} size={32} />
                      <Text style={[styles.coveredAvatarName, { color: theme.colors.text }]}>
                        {m.name}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : (
              <Text style={[styles.legendHint, { color: theme.colors.textSecondary }]}>
                Tap a teammate to isolate their coverage, or tap a file to see who understands it.
              </Text>
            ))}
        </ScrollView>

        {/* ── Nav row + progress (nav hidden while walking the trail) ── */}
        {!walkingTrail && (
          <View style={styles.navRow}>
            <View style={styles.navSideLeft}>
              {step > 0 && (
                <TouchableOpacity
                  style={styles.navLink}
                  onPress={() => goToStep((step - 1) as 0 | 1 | 2)}
                >
                  <Text style={[styles.navLinkText, { color: theme.colors.textSecondary }]}>
                    Back
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.navSideRight}>
              {step < 3 ? (
                <TouchableOpacity
                  style={[styles.primaryButton, { backgroundColor: theme.colors.primary }]}
                  onPress={() => goToStep((step + 1) as 1 | 2 | 3)}
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
  // Start screen: names the trail you're about to walk.
  trailIntro: {
    alignItems: 'center',
    gap: 4,
  },
  trailIntroCaption: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
  },
  trailIntroName: {
    fontSize: 20,
    fontWeight: '800',
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
  // Stands in for the title + body block (trail name + path), so the panel
  // height stays steady when the walkthrough starts.
  breadcrumbHeader: {
    minHeight: 48,
    marginBottom: 6,
    gap: 4,
  },
  trailName: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.3,
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
  // Step 0: Files / Legend toggle.
  segmented: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 10,
    overflow: 'hidden',
    marginTop: 14,
  },
  segItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  segText: {
    fontSize: 14,
    fontWeight: '600',
  },
  // Step 0: file-type color legend rows.
  fileLegend: {
    gap: 12,
  },
  fileLegendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  fileLegendLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
  },
  fileLegendCount: {
    fontSize: 13,
    fontWeight: '600',
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
  // Step 4: teammate avatar row + file-coverage panel.
  teamRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 14,
    marginBottom: 4,
  },
  everyonePill: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1,
  },
  everyoneText: {
    fontSize: 14,
    fontWeight: '600',
  },
  coveredFile: {
    gap: 10,
  },
  coveredAvatars: {
    gap: 12,
  },
  coveredAvatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  coveredAvatarName: {
    fontSize: 15,
    fontWeight: '500',
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
