/**
 * The "grow out of the square" file preview for the Trails tutorial's step 0.
 *
 * When a building (or its tree row) is tapped, this overlays the map and plays
 * a genie transition: a square in the building's own color scales up from the
 * tapped position to fill the map area, then the code fades in over it. Closing
 * reverses the motion back into the square.
 *
 * `origin` and `canvasSize` are canvas-local pixels (origin = map top-left), so
 * this must be rendered as an absolute-fill child of the canvas wrapper.
 */

import React, { useEffect, useRef } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import type { Theme } from '@principal-ade/industry-theme';

import { TrailCodeSnippet } from '../../components/Trails/TrailCodeSnippet';
import type { CityBuilding } from '../../components/FileCity';
import type { TrailMarkerSnippet } from '../../types/Trail';
import type { TrailFileReader } from '../../services/TrailFileContentService';

/** Rect the preview grows from, in canvas-local pixels. */
export interface PreviewOrigin {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface LearnTrailsFilePreviewProps {
  building: CityBuilding;
  snippet: TrailMarkerSnippet;
  /** The building's color — the growing square wears it for continuity. */
  color: string;
  origin: PreviewOrigin;
  canvasSize: { width: number; height: number };
  readFile: TrailFileReader;
  accentColor: string;
  theme: Theme;
  onClose: () => void;
  /** Bump this from the parent to trigger the animated close externally. */
  closeSignal?: number;
}

const INSET = 16;
const DURATION = 1100;

export function LearnTrailsFilePreview({
  building,
  snippet,
  color,
  origin,
  canvasSize,
  readFile,
  accentColor,
  theme,
  onClose,
  closeSignal,
}: LearnTrailsFilePreviewProps) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(1, { duration: DURATION, easing: Easing.inOut(Easing.cubic) });
  }, [progress]);

  const close = () => {
    progress.value = withTiming(
      0,
      { duration: DURATION, easing: Easing.inOut(Easing.cubic) },
      (finished) => {
        if (finished) runOnJS(onClose)();
      },
    );
  };

  // A parent bump of `closeSignal` (e.g. re-tapping the file's tree row) runs
  // the same animated close as the ✕/backdrop. Skips the initial mount.
  const closeSignalReady = useRef(false);
  useEffect(() => {
    if (!closeSignalReady.current) {
      closeSignalReady.current = true;
      return;
    }
    close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [closeSignal]);

  // Target = the map area minus a margin. The square scales/translates between
  // this rect (p=1) and the tapped origin (p=0).
  const targetW = Math.max(1, canvasSize.width - INSET * 2);
  const targetH = Math.max(1, canvasSize.height - INSET * 2);
  const targetCx = canvasSize.width / 2;
  const targetCy = canvasSize.height / 2;
  const originCx = origin.x + origin.width / 2;
  const originCy = origin.y + origin.height / 2;
  const sx = Math.min(1, origin.width / targetW);
  const sy = Math.min(1, origin.height / targetH);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0, 1]),
  }));

  // The colored square: anchored at the target rect, scaled down to the origin
  // at p=0. Fades out near the end as the content panel covers it.
  const squareStyle = useAnimatedStyle(() => {
    const p = progress.value;
    return {
      opacity: interpolate(p, [0, 0.05, 0.92, 1], [0, 1, 1, 0]),
      borderRadius: interpolate(p, [0, 1], [Math.min(origin.width, origin.height) / 3, 18]),
      transform: [
        { translateX: interpolate(p, [0, 1], [originCx - targetCx, 0]) },
        { translateY: interpolate(p, [0, 1], [originCy - targetCy, 0]) },
        { scaleX: interpolate(p, [0, 1], [sx, 1]) },
        { scaleY: interpolate(p, [0, 1], [sy, 1]) },
      ],
    };
  });

  // The code panel: fades + settles in once the square has mostly grown.
  const contentStyle = useAnimatedStyle(() => {
    const p = progress.value;
    return {
      opacity: interpolate(p, [0.5, 1], [0, 1]),
      transform: [{ scale: interpolate(p, [0.5, 1], [0.97, 1]) }],
    };
  });

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, backdropStyle]}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={close} />
      </Animated.View>

      <Animated.View
        pointerEvents="none"
        style={[
          styles.layer,
          { left: INSET, top: INSET, width: targetW, height: targetH, backgroundColor: color },
          squareStyle,
        ]}
      />

      <Animated.View
        style={[
          styles.layer,
          styles.panel,
          {
            left: INSET,
            top: INSET,
            width: targetW,
            height: targetH,
            backgroundColor: theme.colors.background,
            borderColor: color,
          },
          contentStyle,
        ]}
      >
        <View style={[styles.accentBar, { backgroundColor: color }]} />
        {/* No filename here — TrailCodeSnippet renders its own path header. */}
        <View style={styles.topRow}>
          <TouchableOpacity onPress={close} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={[styles.close, { color: theme.colors.textSecondary }]}>✕</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.snippetWrap}>
          <TrailCodeSnippet
            filePath={building.path}
            snippet={snippet}
            readFile={readFile}
            eyebrowColor={accentColor}
          />
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  layer: {
    position: 'absolute',
    borderRadius: 18,
  },
  panel: {
    borderWidth: 1,
    overflow: 'hidden',
  },
  accentBar: {
    height: 4,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  close: {
    fontSize: 16,
    fontWeight: '600',
  },
  snippetWrap: {
    flex: 1,
  },
});
