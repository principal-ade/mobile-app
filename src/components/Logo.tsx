import React, { useEffect, useRef } from 'react';
import { Animated, Easing } from 'react-native';
import Svg, {
  Circle,
  Ellipse,
  Line,
  Defs,
  RadialGradient,
  Stop,
  G,
} from 'react-native-svg';
import { useTheme } from '@principal-ade/industry-theme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface LogoProps {
  width?: number;
  height?: number;
  color?: string;
  /** Color for orbiting particles (defaults to color) */
  particleColor?: string;
  /** Color for the "P" letter in the center (defaults to particleColor, then color) */
  letterColor?: string;
  opacity?: number;
  /** Color for horizontal latitude lines (defaults to color) */
  horizontalColor?: string;
  /** Color for vertical longitude lines (defaults to color) */
  verticalColor?: string;
  /** Color for diagonal grid lines (defaults to color) */
  diagonalColor?: string;
  /** Color for the main sphere outline (defaults to accentColor, then color) */
  outlineColor?: string;
  /** Whether to show the main sphere outline */
  showOutline?: boolean;
  /** Color for center axis lines (defaults to color) */
  axisColor?: string;
  /** Whether to show the background glow effect */
  showGlow?: boolean;
  /** Accent color for the outer sphere outline (defaults to color) */
  accentColor?: string;
  /** Disable animations for performance */
  animated?: boolean;
}

interface OrbitingParticleProps {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  color: string;
  duration: number;
  delay: number;
  isHorizontal: boolean;
}

function OrbitingParticle({
  cx,
  cy,
  rx,
  ry,
  color,
  duration,
  delay,
  isHorizontal,
}: OrbitingParticleProps) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(progress, {
        toValue: 1,
        duration,
        delay,
        easing: Easing.linear,
        useNativeDriver: false,
      })
    );
    animation.start();
    return () => animation.stop();
  }, [progress, duration, delay]);

  // Calculate position along ellipse using parametric equations
  // x = cx + rx * cos(θ), y = cy + ry * sin(θ)
  // Use 16 points for smooth ellipse tracing
  const steps = 16;
  const inputRange = Array.from({ length: steps + 1 }, (_, i) => i / steps);

  const xOutputRange = inputRange.map((t) => {
    const angle = t * 2 * Math.PI;
    return isHorizontal
      ? cx + rx * Math.cos(angle)
      : cx + rx * Math.sin(angle);
  });

  const yOutputRange = inputRange.map((t) => {
    const angle = t * 2 * Math.PI;
    return isHorizontal
      ? cy - ry * Math.sin(angle)
      : cy - ry * Math.cos(angle);
  });

  const x = progress.interpolate({
    inputRange,
    outputRange: xOutputRange,
  });

  const y = progress.interpolate({
    inputRange,
    outputRange: yOutputRange,
  });

  // Opacity: fade when on back side of sphere
  const opacity = progress.interpolate({
    inputRange: [0, 0.25, 0.5, 0.75, 1],
    outputRange: isHorizontal
      ? [1, 0.3, 0, 0.3, 1] // Horizontal: visible at right (0), fades at top/bottom
      : [0, 0.3, 1, 0.3, 0], // Vertical: visible at bottom (0.5)
  });

  return (
    <AnimatedCircle
      r={2.5}
      fill={color}
      cx={x}
      cy={y}
      opacity={opacity}
    />
  );
}

export function Logo({
  width = 150,
  height = 150,
  color: _color,
  particleColor,
  letterColor,
  opacity = 0.9,
  horizontalColor,
  verticalColor,
  diagonalColor,
  outlineColor,
  showOutline = true,
  axisColor,
  showGlow = false,
  accentColor,
  animated = true,
}: LogoProps) {
  const { theme } = useTheme();
  const color = _color || theme.colors.primary;
  const finalParticleColor = particleColor || color;
  const finalLetterColor = letterColor || particleColor || color;
  const finalHorizontalColor = horizontalColor || color;
  const finalVerticalColor = verticalColor || color;
  const finalDiagonalColor = diagonalColor || color;
  const finalOutlineColor = outlineColor || accentColor || color;
  const finalAxisColor = axisColor || color;

  return (
    <Svg
      width={width}
      height={height}
      viewBox="30 30 140 140"
      preserveAspectRatio="xMidYMid meet"
      style={{ opacity, minWidth: width, minHeight: height }}
    >
      <Defs>
        <RadialGradient id="sphereGlow" cx="50%" cy="50%" r="50%">
          <Stop offset="0%" stopColor={color} stopOpacity={0.3} />
          <Stop offset="100%" stopColor={color} stopOpacity={0} />
        </RadialGradient>
      </Defs>

      {/* Glow effect */}
      {showGlow && (
        <Circle cx={100} cy={100} r={80} fill="url(#sphereGlow)" opacity={0.5} />
      )}

      {/* Crosshair lines from edge to ellipses */}
      {/* Top */}
      <Line x1={100} y1={33} x2={100} y2={68} stroke={finalAxisColor} strokeWidth={1} opacity={0.7} />
      {/* Bottom */}
      <Line x1={100} y1={167} x2={100} y2={132} stroke={finalAxisColor} strokeWidth={1} opacity={0.7} />
      {/* Left */}
      <Line x1={33} y1={100} x2={68} y2={100} stroke={finalAxisColor} strokeWidth={1} opacity={0.7} />
      {/* Right */}
      <Line x1={167} y1={100} x2={132} y2={100} stroke={finalAxisColor} strokeWidth={1} opacity={0.7} />

      {/* Horizontal latitude lines */}
      <Ellipse
        cx={100}
        cy={100}
        rx={67}
        ry={32}
        fill="none"
        stroke={finalHorizontalColor}
        strokeWidth={1}
        opacity={0.7}
      />

      {/* Vertical longitude lines */}
      <Ellipse
        cx={100}
        cy={100}
        rx={32}
        ry={67}
        fill="none"
        stroke={finalVerticalColor}
        strokeWidth={1}
        opacity={0.7}
      />

      {/* Diagonal grid lines (angled ellipses) */}
      <G rotation={30} origin="100, 100">
        <Ellipse
          cx={100}
          cy={100}
          rx={67}
          ry={40}
          fill="none"
          stroke={finalDiagonalColor}
          strokeWidth={1}
          opacity={0.7}
        />
      </G>
      <G rotation={60} origin="100, 100">
        <Ellipse
          cx={100}
          cy={100}
          rx={67}
          ry={40}
          fill="none"
          stroke={finalDiagonalColor}
          strokeWidth={1}
          opacity={0.7}
        />
      </G>
      <G rotation={120} origin="100, 100">
        <Ellipse
          cx={100}
          cy={100}
          rx={67}
          ry={40}
          fill="none"
          stroke={finalDiagonalColor}
          strokeWidth={1}
          opacity={0.7}
        />
      </G>
      <G rotation={150} origin="100, 100">
        <Ellipse
          cx={100}
          cy={100}
          rx={67}
          ry={40}
          fill="none"
          stroke={finalDiagonalColor}
          strokeWidth={1}
          opacity={0.7}
        />
      </G>

      {/* Main sphere outline - rendered after ellipses so it appears on top */}
      {showOutline && (
        <Circle
          cx={100}
          cy={100}
          r={67}
          fill="none"
          stroke={finalOutlineColor}
          strokeWidth={1.5}
          opacity={0.9}
        />
      )}

      {/* "P" made of dots - vertical stem */}
      <Circle cx={90} cy={79} r={2.5} fill={finalLetterColor} opacity={0.9} />
      <Circle cx={90} cy={86} r={2.5} fill={finalLetterColor} opacity={0.9} />
      <Circle cx={90} cy={93} r={2.5} fill={finalLetterColor} opacity={0.9} />
      <Circle cx={90} cy={100} r={2.5} fill={finalLetterColor} opacity={0.9} />
      <Circle cx={90} cy={107} r={2.5} fill={finalLetterColor} opacity={0.9} />
      <Circle cx={90} cy={114} r={2.5} fill={finalLetterColor} opacity={0.9} />
      <Circle cx={90} cy={121} r={2.5} fill={finalLetterColor} opacity={0.9} />

      {/* "P" top horizontal */}
      <Circle cx={97} cy={79} r={2.5} fill={finalLetterColor} opacity={0.9} />
      <Circle cx={104} cy={79} r={2.5} fill={finalLetterColor} opacity={0.9} />

      {/* "P" bowl - right side */}
      <Circle cx={111} cy={86} r={2.5} fill={finalLetterColor} opacity={0.9} />
      <Circle cx={111} cy={93} r={2.5} fill={finalLetterColor} opacity={0.9} />

      {/* "P" bowl - middle horizontal */}
      <Circle cx={104} cy={100} r={2.5} fill={finalLetterColor} opacity={0.9} />
      <Circle cx={97} cy={100} r={2.5} fill={finalLetterColor} opacity={0.9} />

      {/* Orbiting particles - rendered last so they appear on top */}
      {animated && (
        <>
          <OrbitingParticle
            cx={100}
            cy={100}
            rx={67}
            ry={32}
            color={finalParticleColor}
            duration={8000}
            delay={0}
            isHorizontal={true}
          />
          <OrbitingParticle
            cx={100}
            cy={100}
            rx={32}
            ry={67}
            color={finalParticleColor}
            duration={8000}
            delay={0}
            isHorizontal={false}
          />
        </>
      )}
    </Svg>
  );
}

export default Logo;
