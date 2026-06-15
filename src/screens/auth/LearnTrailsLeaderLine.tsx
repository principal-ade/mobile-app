/**
 * A dashed right-angle (elbow) connector that "draws" from a trail stop on the
 * map out to its caption card, used in step 2's per-stop reveal. It runs
 * horizontally out of the stop, turns 90°, and meets the card's near edge.
 * Deliberately dashed + neutral so it reads as a callout pointer, never the
 * solid trail connector.
 *
 * Built from two animated SVG <Line>s (numeric x2/y2 animation — animating a
 * Polyline's `points` string via Reanimated does not update). Coordinates are
 * canvas-local px; render as an absolute-fill child of the canvas wrapper.
 */

import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Svg, { Line } from 'react-native-svg';
import Animated, {
  Easing,
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

const AnimatedLine = Animated.createAnimatedComponent(Line);

interface LearnTrailsLeaderLineProps {
  /** Stop (the line draws outward from here). */
  stopX: number;
  stopY: number;
  /** Where the connector meets the card edge (its turn column). */
  cardX: number;
  cardEdgeY: number;
  color: string;
  /** Map size, so the SVG canvas matches the overlay it lives in. */
  width: number;
  height: number;
}

export function LearnTrailsLeaderLine({
  stopX,
  stopY,
  cardX,
  cardEdgeY,
  color,
  width,
  height,
}: LearnTrailsLeaderLineProps) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(1, { duration: 460, easing: Easing.out(Easing.cubic) });
  }, [progress]);

  // Elbow: stop → horizontal to the card's column → vertical to the card edge.
  const hLen = Math.abs(cardX - stopX);
  const vLen = Math.abs(cardEdgeY - stopY);
  const total = hLen + vLen || 1;
  const hDir = cardX >= stopX ? 1 : -1;
  const vDir = cardEdgeY >= stopY ? 1 : -1;

  // Horizontal leg grows first; the vertical leg follows once it's complete.
  const hProps = useAnimatedProps(() => {
    const drawn = total * progress.value;
    return { x2: stopX + hDir * Math.min(drawn, hLen) };
  });
  const vProps = useAnimatedProps(() => {
    const drawn = total * progress.value;
    const v = Math.max(0, Math.min(drawn - hLen, vLen));
    return { y2: stopY + vDir * v };
  });

  const dash = { strokeWidth: 1.5, strokeDasharray: '3 5', strokeLinecap: 'round' as const, opacity: 0.85 };

  return (
    <Svg pointerEvents="none" style={StyleSheet.absoluteFill} width={width} height={height}>
      <AnimatedLine x1={stopX} y1={stopY} y2={stopY} animatedProps={hProps} stroke={color} {...dash} />
      <AnimatedLine x1={cardX} y1={stopY} x2={cardX} animatedProps={vProps} stroke={color} {...dash} />
    </Svg>
  );
}
