import React, { useEffect, useRef } from 'react';
import { Animated, Easing } from 'react-native';
import Svg, {
  Circle,
  Ellipse,
  Line,
  Path,
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
  particleColor?: string;
  opacity?: number;
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

  // Calculate position along ellipse
  const x = progress.interpolate({
    inputRange: [0, 0.25, 0.5, 0.75, 1],
    outputRange: isHorizontal
      ? [cx + rx, cx, cx - rx, cx, cx + rx]
      : [cx, cx + rx, cx, cx - rx, cx],
  });

  const y = progress.interpolate({
    inputRange: [0, 0.25, 0.5, 0.75, 1],
    outputRange: isHorizontal
      ? [cy, cy - ry, cy, cy + ry, cy]
      : [cy - ry, cy, cy + ry, cy, cy - ry],
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
  particleColor: _particleColor,
  opacity = 0.9,
  animated = true,
}: LogoProps) {
  const { theme } = useTheme();
  const lineColor = theme.colors.primary;
  const dotColor = '#FFFFFF';
  const pulseAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    if (!animated) return;

    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.8,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.3,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim, animated]);

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
          <Stop offset="0%" stopColor={lineColor} stopOpacity={0.3} />
          <Stop offset="100%" stopColor={lineColor} stopOpacity={0} />
        </RadialGradient>
      </Defs>

      {/* Glow effect */}
      <Circle cx={100} cy={100} r={80} fill="url(#sphereGlow)" opacity={0.5} />

      {/* Orbiting particles - horizontal ellipses */}
      {animated && (
        <>
          <OrbitingParticle
            cx={100}
            cy={100}
            rx={67}
            ry={27}
            color={dotColor}
            duration={8000}
            delay={1000}
            isHorizontal={true}
          />
          <OrbitingParticle
            cx={100}
            cy={100}
            rx={67}
            ry={40}
            color={dotColor}
            duration={8000}
            delay={2000}
            isHorizontal={true}
          />
          <OrbitingParticle
            cx={100}
            cy={100}
            rx={67}
            ry={53}
            color={dotColor}
            duration={8000}
            delay={3000}
            isHorizontal={true}
          />

          {/* Orbiting particles - vertical ellipses */}
          <OrbitingParticle
            cx={100}
            cy={100}
            rx={27}
            ry={67}
            color={dotColor}
            duration={8000}
            delay={1500}
            isHorizontal={false}
          />
          <OrbitingParticle
            cx={100}
            cy={100}
            rx={40}
            ry={67}
            color={dotColor}
            duration={8000}
            delay={2500}
            isHorizontal={false}
          />
          <OrbitingParticle
            cx={100}
            cy={100}
            rx={53}
            ry={67}
            color={dotColor}
            duration={8000}
            delay={3500}
            isHorizontal={false}
          />
        </>
      )}

      {/* "P" made of dots at center - vertical stem */}
      <Circle cx={93} cy={85} r={2} fill={dotColor} opacity={0.9} />
      <Circle cx={93} cy={90} r={2} fill={dotColor} opacity={0.9} />
      <Circle cx={93} cy={95} r={2} fill={dotColor} opacity={0.9} />
      <Circle cx={93} cy={100} r={2} fill={dotColor} opacity={0.9} />
      <Circle cx={93} cy={105} r={2} fill={dotColor} opacity={0.9} />
      <Circle cx={93} cy={110} r={2} fill={dotColor} opacity={0.9} />
      <Circle cx={93} cy={115} r={2} fill={dotColor} opacity={0.9} />

      {/* "P" top horizontal */}
      <Circle cx={98} cy={85} r={2} fill={dotColor} opacity={0.9} />
      <Circle cx={103} cy={85} r={2} fill={dotColor} opacity={0.9} />

      {/* "P" bowl - right side */}
      <Circle cx={108} cy={90} r={2} fill={dotColor} opacity={0.9} />
      <Circle cx={108} cy={95} r={2} fill={dotColor} opacity={0.9} />

      {/* "P" bowl - middle horizontal */}
      <Circle cx={103} cy={100} r={2} fill={dotColor} opacity={0.9} />
      <Circle cx={98} cy={100} r={2} fill={dotColor} opacity={0.9} />

      {/* Main sphere outline */}
      <Circle
        cx={100}
        cy={100}
        r={67}
        fill="none"
        stroke={lineColor}
        strokeWidth={1.5}
        opacity={0.9}
      />

      {/* Horizontal latitude lines */}
      <Path
        d="M 33,100 A 67,13 0 0,1 73,88.1"
        fill="none"
        stroke={lineColor}
        strokeWidth={1}
        opacity={0.7}
      />
      <Path
        d="M 127,88.1 A 67,13 0 0,1 167,100"
        fill="none"
        stroke={lineColor}
        strokeWidth={1}
        opacity={0.7}
      />
      <Path
        d="M 33,100 A 67,13 0 0,0 73,111.9"
        fill="none"
        stroke={lineColor}
        strokeWidth={1}
        opacity={0.7}
      />
      <Path
        d="M 127,111.9 A 67,13 0 0,0 167,100"
        fill="none"
        stroke={lineColor}
        strokeWidth={1}
        opacity={0.7}
      />

      {/* Full horizontal ellipses */}
      <Ellipse
        cx={100}
        cy={100}
        rx={67}
        ry={27}
        fill="none"
        stroke={lineColor}
        strokeWidth={1}
        opacity={0.7}
      />
      <Ellipse
        cx={100}
        cy={100}
        rx={67}
        ry={40}
        fill="none"
        stroke={lineColor}
        strokeWidth={1}
        opacity={0.7}
      />
      <Ellipse
        cx={100}
        cy={100}
        rx={67}
        ry={53}
        fill="none"
        stroke={lineColor}
        strokeWidth={1}
        opacity={0.7}
      />

      {/* Vertical longitude lines */}
      <Path
        d="M 100,33 A 13,67 0 0,0 87,73"
        fill="none"
        stroke={lineColor}
        strokeWidth={1}
        opacity={0.7}
      />
      <Path
        d="M 113,73 A 13,67 0 0,0 100,33"
        fill="none"
        stroke={lineColor}
        strokeWidth={1}
        opacity={0.7}
      />
      <Path
        d="M 100,167 A 13,67 0 0,1 87,127"
        fill="none"
        stroke={lineColor}
        strokeWidth={1}
        opacity={0.7}
      />
      <Path
        d="M 113,127 A 13,67 0 0,1 100,167"
        fill="none"
        stroke={lineColor}
        strokeWidth={1}
        opacity={0.7}
      />

      {/* Full vertical ellipses */}
      <Ellipse
        cx={100}
        cy={100}
        rx={27}
        ry={67}
        fill="none"
        stroke={lineColor}
        strokeWidth={1}
        opacity={0.7}
      />
      <Ellipse
        cx={100}
        cy={100}
        rx={40}
        ry={67}
        fill="none"
        stroke={lineColor}
        strokeWidth={1}
        opacity={0.7}
      />
      <Ellipse
        cx={100}
        cy={100}
        rx={53}
        ry={67}
        fill="none"
        stroke={lineColor}
        strokeWidth={1}
        opacity={0.7}
      />

      {/* Diagonal grid lines (rotated ellipses) */}
      <G rotation={30} origin="100, 100">
        <Ellipse
          cx={100}
          cy={100}
          rx={67}
          ry={33}
          fill="none"
          stroke={lineColor}
          strokeWidth={1}
          opacity={0.6}
        />
      </G>
      <G rotation={60} origin="100, 100">
        <Ellipse
          cx={100}
          cy={100}
          rx={67}
          ry={33}
          fill="none"
          stroke={lineColor}
          strokeWidth={1}
          opacity={0.6}
        />
      </G>
      <G rotation={120} origin="100, 100">
        <Ellipse
          cx={100}
          cy={100}
          rx={67}
          ry={33}
          fill="none"
          stroke={lineColor}
          strokeWidth={1}
          opacity={0.6}
        />
      </G>
      <G rotation={150} origin="100, 100">
        <Ellipse
          cx={100}
          cy={100}
          rx={67}
          ry={33}
          fill="none"
          stroke={lineColor}
          strokeWidth={1}
          opacity={0.6}
        />
      </G>

      {/* Center horizontal line - broken into segments around P */}
      <Line
        x1={33}
        y1={100}
        x2={73}
        y2={100}
        stroke={lineColor}
        strokeWidth={1.5}
        opacity={0.8}
      />
      <Line
        x1={127}
        y1={100}
        x2={167}
        y2={100}
        stroke={lineColor}
        strokeWidth={1.5}
        opacity={0.8}
      />

      {/* Center vertical line - broken into segments around P */}
      <Line
        x1={100}
        y1={33}
        x2={100}
        y2={73}
        stroke={lineColor}
        strokeWidth={1.5}
        opacity={0.8}
      />
      <Line
        x1={100}
        y1={127}
        x2={100}
        y2={167}
        stroke={lineColor}
        strokeWidth={1.5}
        opacity={0.8}
      />
    </Svg>
  );
}

export default Logo;
