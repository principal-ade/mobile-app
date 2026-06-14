import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo } from 'react-native';
import {
  Path,
  Circle,
  Rect,
  G,
  Defs,
  ClipPath,
  LinearGradient,
  Stop,
} from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  Easing,
  interpolate,
  Extrapolation,
  type SharedValue,
} from 'react-native-reanimated';
import { useTheme } from '@principal-ade/industry-theme';
import {
  computeFileCityLayout,
  fileCityLabel,
  FileCityPanel,
  type FileCityLogoProps,
} from './FileCityLogo';

/**
 * React Native port of the web `FileCityLogoAnimated` from the
 * `logo-component` workspace. The squares accumulate like a heatmap: each
 * tick a batch of cells gets a "sample" added; letter cells weigh more so
 * they take several samples to reach full intensity while city files
 * resolve quickly. Once the summed weights fill in, the logo holds, an
 * accent-dotted trail threads the active group, and a sheen sweeps across.
 *
 * The accumulation state machine is a faithful port of the web original.
 * The web version drove its embellishments with CSS keyframes + SVG masks;
 * here they run on `react-native-reanimated`. One deliberate simplification:
 * the connector draws on as a solid accent line (the web's dashed "code
 * trail" used an animated mask, which RN-svg can't animate reliably).
 */

export interface FileCityLogoAnimatedProps extends FileCityLogoProps {
  /**
   * Min / max number of cells in each group. The cells in a group reveal
   * one at a time (`cellMs` apart); then the build holds for `pauseMs`
   * before the next group. Default 5–10.
   */
  batchMin?: number;
  batchMax?: number;
  /** Milliseconds between cells within a group. Default 185. */
  cellMs?: number;
  /** Milliseconds to hold after a group completes, before the next. Default 900. */
  pauseMs?: number;
  /**
   * Draw a connector line threading the cells of the active group in reveal
   * order — it grows as each cell appears, then fades out during the pause.
   * Default true.
   */
  connectors?: boolean;
  /** Connector color. Defaults to the accent (falling back to primary). */
  connectorColor?: string;
  /**
   * How many samples a full-weight (letter) cell needs before it reaches
   * full intensity. City files need proportionally fewer (by their lower
   * weight), so the letter builds up gradually while the city pops in.
   * Default 1 — every square is touched exactly once and pops to full.
   * Raise it (e.g. 3) for the gradual heatmap build-up. */
  buildSteps?: number;
  /** Start playing on mount. Default true. */
  autoPlay?: boolean;
  /**
   * Replay forever: once the heatmap resolves, hold for `loopHoldMs` and
   * then rebuild from scratch. Use this for loading indicators. Default false.
   */
  loop?: boolean;
  /** How long the resolved logo holds before a `loop` restart. Default 1500. */
  loopHoldMs?: number;
  /** Replay key — change this value to restart the animation. */
  playKey?: string | number;
  /** Called once the heatmap has fully resolved. */
  onComplete?: () => void;
}

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedG = Animated.createAnimatedComponent(G);
const AnimatedRect = Animated.createAnimatedComponent(Rect);

function mulberry32(seed: number) {
  let t = seed;
  return () => {
    t = (t + 0x6d2b79f5) | 0;
    let r = t;
    r = Math.imul(r ^ (r >>> 15), r | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

/** Easing for the per-cell fill-in so each sample lands softly. */
const ease = (t: number) => 1 - Math.pow(1 - t, 2);

/**
 * One accent node-dot on the active trail. It pops in (scale + fade) as the
 * connector's draw-on progress sweeps past its position along the path.
 */
function TrailDot({
  progress,
  thr,
  window: win,
  cx,
  cy,
  r,
  fill,
}: {
  progress: SharedValue<number>;
  thr: number;
  window: number;
  cx: number;
  cy: number;
  r: number;
  fill: string;
}) {
  const animatedProps = useAnimatedProps(() => {
    const t = interpolate(
      progress.value,
      [thr, thr + win],
      [0, 1],
      Extrapolation.CLAMP,
    );
    return { r: r * (0.2 + 0.8 * t), opacity: t };
  });
  return <AnimatedCircle cx={cx} cy={cy} r={r} fill={fill} animatedProps={animatedProps} />;
}

export function FileCityLogoAnimated(props: FileCityLogoAnimatedProps) {
  const { theme: appTheme } = useTheme();
  const uid = useId().replace(/:/g, '');
  const {
    width = 150,
    height = 150,
    batchMin = 5,
    batchMax = 10,
    cellMs = 185,
    pauseMs = 900,
    buildSteps = 1,
    connectors = true,
    connectorColor,
    autoPlay = true,
    loop = false,
    loopHoldMs = 1500,
    playKey,
    onComplete,
  } = props;

  // The trail line is a light grey (close to white); the nodes it threads
  // to are marked with accent-colored dots so the destinations pop.
  const trailColor = connectorColor ?? '#e5e7eb';
  const dotColor =
    props.accent ??
    props.theme?.colors.accent ??
    appTheme?.colors.accent ??
    props.primary ??
    props.theme?.colors.primary ??
    appTheme?.colors.primary ??
    '#22d3ee';

  const { cells, extras, bgColor, baseColor, rounded, opacity, mark } = useMemo(
    () => computeFileCityLayout({ theme: appTheme, ...props }),
    // Re-derive only when an input that affects layout changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      appTheme,
      props.mark,
      props.primary,
      props.accent,
      props.color,
      props.background,
      props.theme,
      props.cells,
      props.highlight,
      props.trail,
      props.gradient,
      props.rounded,
      props.margin,
      props.aiCard,
      props.opacity,
      props.squareRadius,
    ],
  );

  // Per-cell number of samples to fully reveal it (>=1; letter cells take
  // `buildSteps`, city cells proportionally fewer by their weight).
  const stepsFor = useMemo(
    () => cells.map((cell) => Math.max(1, Math.round(cell.weight * buildSteps))),
    [cells, buildSteps],
  );

  // The pool of pending samples: each cell index repeated `steps` times,
  // shuffled deterministically so the batches scatter across the grid,
  // then sliced into groups of `batchMin`..`batchMax`.
  const groups = useMemo(() => {
    const p: number[] = [];
    stepsFor.forEach((n, i) => {
      for (let k = 0; k < n; k++) p.push(i);
    });
    const shuffle = mulberry32(0x5eed + cells.length);
    for (let i = p.length - 1; i > 0; i--) {
      const j = Math.floor(shuffle() * (i + 1));
      [p[i], p[j]] = [p[j], p[i]];
    }
    const sizeRand = mulberry32(0xb47c4 + cells.length);
    const g: number[][] = [];
    let i = 0;
    while (i < p.length) {
      const size = batchMin + Math.floor(sizeRand() * (batchMax - batchMin + 1));
      g.push(p.slice(i, i + size));
      i += size;
    }
    return g;
  }, [stepsFor, cells.length, batchMin, batchMax]);

  // `progress[i]` = samples applied to cell i. Once every group has been
  // walked the animation is done and the logo holds.
  const [progress, setProgress] = useState<number[]>(() => cells.map(() => 0));
  const [done, setDone] = useState(false);
  // The connector for the active group: which group it traces, and whether
  // it's drawing on (during the reveal) or fading out (during the pause).
  const [conn, setConn] = useState<{ group: number; fading: boolean } | null>(null);
  // Bumped after each resolved-and-held cycle to restart the build when
  // `loop` is set (acts like an internal `playKey`).
  const [loopTick, setLoopTick] = useState(0);
  const groupRef = useRef(0);
  const memberRef = useRef(0);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  // Respect the OS "reduce motion" setting: jump straight to the resolved
  // logo instead of playing the build.
  const [reduceMotion, setReduceMotion] = useState(false);
  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then((v) => {
      if (mounted) setReduceMotion(v);
    });
    const sub = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setReduceMotion,
    );
    return () => {
      mounted = false;
      sub?.remove?.();
    };
  }, []);

  // Drive the accumulation. Re-runs whenever the layout, timing, or the
  // explicit `playKey` changes — that's our "replay."
  useEffect(() => {
    groupRef.current = 0;
    memberRef.current = 0;
    setProgress(cells.map(() => 0));
    setConn(null);
    setDone(false);

    if (!autoPlay || cells.length === 0 || reduceMotion) {
      setProgress(stepsFor.slice());
      setDone(true);
      onCompleteRef.current?.();
      return;
    }

    let timer: ReturnType<typeof setTimeout>;
    let fadeTimer: ReturnType<typeof setTimeout>;
    // The trail fade should finish inside the pause; hold the finished trail
    // on screen for a beat (linger) before it dissolves.
    const fadeMs = Math.max(120, Math.min(pauseMs - 60, 360));
    const lingerMs = Math.max(0, Math.min(pauseMs - fadeMs - 40, 450));

    // Reveal one cell per step. Within a group the steps are `cellMs`
    // apart; finishing a group schedules the next one after `pauseMs`.
    const step = () => {
      const gi = groupRef.current;
      if (gi >= groups.length) {
        setDone(true);
        onCompleteRef.current?.();
        return;
      }
      const group = groups[gi];
      const mi = memberRef.current;
      const idx = group[mi];
      setProgress((prev) => {
        const next = prev.slice();
        next[idx] = Math.min(stepsFor[idx], next[idx] + 1);
        return next;
      });

      const lastInGroup = mi + 1 >= group.length;
      // Start the connector drawing on when the group begins.
      if (mi === 0) setConn({ group: gi, fading: false });
      if (lastInGroup) {
        // The trail is fully drawn — hold it for `lingerMs`, then flip to
        // fading so it dissolves before the next group begins.
        fadeTimer = setTimeout(
          () => setConn({ group: gi, fading: true }),
          lingerMs,
        );
        groupRef.current = gi + 1;
        memberRef.current = 0;
        timer = setTimeout(step, pauseMs);
      } else {
        memberRef.current = mi + 1;
        timer = setTimeout(step, cellMs);
      }
    };

    timer = setTimeout(step, cellMs);
    return () => {
      clearTimeout(timer);
      clearTimeout(fadeTimer);
    };
     
  }, [cells, groups, stepsFor, cellMs, pauseMs, autoPlay, reduceMotion, playKey, loopTick]);

  // Loop: once resolved, hold the finished logo for `loopHoldMs`, then bump
  // `loopTick` to replay the whole build. Skipped under reduce-motion.
  useEffect(() => {
    if (!done || !loop || reduceMotion) return;
    const t = setTimeout(() => setLoopTick((n) => n + 1), loopHoldMs);
    return () => clearTimeout(t);
  }, [done, loop, reduceMotion, loopHoldMs]);

  // Connector geometry — the path through the active group's cell centers.
  const sq = cells.length ? cells[0].sq : 1;
  const centerOf = (idx: number) => ({
    x: cells[idx].x + cells[idx].sq / 2,
    y: cells[idx].y + cells[idx].sq / 2,
  });
  const connGroup = conn ? groups[conn.group] : null;
  // Build a gently-curved path through the node centers (Catmull-Rom →
  // cubic Béziers). It still passes exactly through every dot, just with a
  // soft bend between them. `k` is the curve strength — small keeps it
  // subtle. Returns the `d` string *and* the curve's true length (sampled
  // per segment) — react-native-svg doesn't honor `pathLength` on native, so
  // the draw-on dash must span the actual length, not a straight-line
  // estimate (the curve bows out, so a straight-line sum falls short and the
  // line stops before the last dot).
  const smoothPath = (pts: { x: number; y: number }[]) => {
    if (pts.length < 2) return null;
    if (pts.length === 2) {
      const len = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
      return { d: `M ${pts[0].x} ${pts[0].y} L ${pts[1].x} ${pts[1].y}`, len };
    }
    const k = 0.2;
    const SAMPLES = 16;
    let d = `M ${pts[0].x} ${pts[0].y}`;
    let len = 0;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i - 1] ?? pts[i];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[i + 2] ?? p2;
      const cp1x = p1.x + (p2.x - p0.x) * k;
      const cp1y = p1.y + (p2.y - p0.y) * k;
      const cp2x = p2.x - (p3.x - p1.x) * k;
      const cp2y = p2.y - (p3.y - p1.y) * k;
      d += ` C ${cp1x} ${cp1y} ${cp2x} ${cp2y} ${p2.x} ${p2.y}`;
      // Sample the cubic to accumulate its arc length.
      let px = p1.x;
      let py = p1.y;
      for (let s = 1; s <= SAMPLES; s++) {
        const t = s / SAMPLES;
        const mt = 1 - t;
        const bx =
          mt * mt * mt * p1.x +
          3 * mt * mt * t * cp1x +
          3 * mt * t * t * cp2x +
          t * t * t * p2.x;
        const by =
          mt * mt * mt * p1.y +
          3 * mt * mt * t * cp1y +
          3 * mt * t * t * cp2y +
          t * t * t * p2.y;
        len += Math.hypot(bx - px, by - py);
        px = bx;
        py = by;
      }
    }
    return { d, len };
  };
  const connPts =
    connGroup && connGroup.length > 1
      ? connGroup.map((idx) => centerOf(idx))
      : null;
  const conn2 = connPts ? smoothPath(connPts) : null;
  const connectorPath = conn2?.d ?? null;
  // True curve length — the draw-on dash spans this so the offset reaching 0
  // (at connProgress 1) leaves the line fully drawn to the last node.
  const pathLen = conn2?.len ?? 1;
  // Draw the trail on across the group's reveal (so the line reaches each
  // cell about as it lights up); fade should finish inside the pause.
  const drawMs = connGroup ? Math.max(cellMs, (connGroup.length - 1) * cellMs) : 0;
  const fadeMs = Math.max(120, Math.min(pauseMs - 60, 360));

  const showTrail = !!(connectors && connectorPath && conn && !done);

  // ── Reanimated drivers ──────────────────────────────────────────────
  // `connProgress` draws the connector on (0 → 1) over `drawMs` when a
  // group starts; `trailOpacity` fades the whole trail during the pause;
  // `sheenX` sweeps the sheen once the heatmap resolves.
  const connProgress = useSharedValue(0);
  const trailOpacity = useSharedValue(0);
  const sheenX = useSharedValue(0);

  // Start/stop the connector draw + fade as the active group changes.
  const group = conn?.group;
  const fading = conn?.fading;
  useEffect(() => {
    if (group == null) return;
    if (fading) {
      trailOpacity.value = withTiming(0, {
        duration: fadeMs,
        easing: Easing.linear,
      });
    } else {
      connProgress.value = 0;
      trailOpacity.value = 1;
      connProgress.value = withTiming(1, {
        duration: drawMs,
        easing: Easing.linear,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [group, fading]);

  // Sweep the sheen once when the heatmap finishes resolving.
  useEffect(() => {
    if (done && !reduceMotion) {
      sheenX.value = 0;
      sheenX.value = withTiming(1, {
        duration: 1100,
        easing: Easing.inOut(Easing.ease),
      });
    } else {
      sheenX.value = 0;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done, reduceMotion]);

  const trailDrawProps = useAnimatedProps(() => ({
    strokeDashoffset: pathLen * (1 - connProgress.value),
  }));
  const trailFadeProps = useAnimatedProps(() => ({ opacity: trailOpacity.value }));
  const sheenProps = useAnimatedProps(() => ({ x: -140 + 240 * sheenX.value }));

  const lineW = Math.max(0.6, sq * 0.12);
  const dotR = Math.max(1.4, sq * 0.27);
  const segCount = connGroup ? connGroup.length - 1 : 0;
  // Window (in draw-progress units) over which each dot pops — mirrors the
  // web's 220ms pop relative to the full draw.
  const dotWindow = drawMs > 0 ? Math.min(1, 220 / drawMs) : 1;

  return (
    <FileCityPanel
      width={width}
      height={height}
      bgColor={bgColor}
      baseColor={baseColor}
      rounded={rounded}
      opacity={opacity}
      label={fileCityLabel(mark)}
    >
      {/* Base pass: every cell, revealed by its accumulated samples. */}
      {cells.map((cell, i) => {
        const reveal = done ? 1 : ease(progress[i] / stepsFor[i]);
        if (reveal <= 0) return null;
        return (
          <Rect
            key={cell.key}
            x={cell.x}
            y={cell.y}
            width={cell.sq}
            height={cell.sq}
            rx={cell.rx}
            fill={cell.fill}
            fillOpacity={reveal}
            stroke={cell.stroke}
            strokeWidth={cell.strokeWidth}
            strokeOpacity={reveal}
          />
        );
      })}

      {/* The trail line and its accent node-dots ride on top of the city. */}
      {showTrail ? (
        <AnimatedG animatedProps={trailFadeProps}>
          <AnimatedPath
            d={connectorPath!}
            fill="none"
            stroke={trailColor}
            strokeWidth={lineW}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={0.9}
            // Draw-on: one dash spanning the whole path, its offset pulled
            // from `pathLen` back to 0 as `connProgress` runs.
            strokeDasharray={`${pathLen}`}
            animatedProps={trailDrawProps}
          />
          {connGroup!.map((idx, i) => {
            const p = centerOf(idx);
            // Spread each dot's pop start across [0, 1 - dotWindow] so the
            // last node (i === segCount) finishes its pop exactly as the
            // draw reaches 1 — otherwise its window would start at 1.0 and
            // never fill in.
            const thr = segCount > 0 ? (i / segCount) * (1 - dotWindow) : 0;
            return (
              <TrailDot
                key={`dot-${idx}-${i}`}
                progress={connProgress}
                thr={thr}
                window={dotWindow}
                cx={p.x}
                cy={p.y}
                r={dotR}
                fill={dotColor}
              />
            );
          })}
        </AnimatedG>
      ) : null}

      {done ? extras : null}

      {/* Once resolved, a diagonal sheen sweeps across the mark — a bright
          band clipped to the blocks, translated left → right. */}
      {done && !reduceMotion ? (
        <>
          <Defs>
            <ClipPath id={`sheen-clip-${uid}`}>
              {cells.map((cell) => (
                <Rect
                  key={cell.key}
                  x={cell.x}
                  y={cell.y}
                  width={cell.sq}
                  height={cell.sq}
                  rx={cell.rx}
                />
              ))}
            </ClipPath>
            <LinearGradient id={`sheen-grad-${uid}`} x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0%" stopColor="#fff" stopOpacity={0} />
              <Stop offset="42%" stopColor="#fff" stopOpacity={0} />
              <Stop offset="50%" stopColor="#fff" stopOpacity={0.5} />
              <Stop offset="58%" stopColor="#fff" stopOpacity={0} />
              <Stop offset="100%" stopColor="#fff" stopOpacity={0} />
            </LinearGradient>
          </Defs>
          <G clipPath={`url(#sheen-clip-${uid})`} pointerEvents="none">
            <AnimatedRect
              x={-140}
              y={-20}
              width={140}
              height={140}
              fill={`url(#sheen-grad-${uid})`}
              animatedProps={sheenProps}
            />
          </G>
        </>
      ) : null}
    </FileCityPanel>
  );
}

export default FileCityLogoAnimated;
