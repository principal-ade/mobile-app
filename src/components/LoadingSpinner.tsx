import React from 'react';
import { View, StyleSheet } from 'react-native';
import { FileCityLogoAnimated } from './FileCityLogoAnimated';

interface LoadingSpinnerProps {
  size?: 'small' | 'large';
  /** Tint for the mark's primary files. Defaults to the theme primary. */
  color?: string;
}

export function LoadingSpinner({ size = 'large', color }: LoadingSpinnerProps) {
  const dimensions = size === 'small' ? 40 : 80;

  return (
    <View style={styles.container}>
      <FileCityLogoAnimated
        width={dimensions}
        height={dimensions}
        primary={color}
        background="transparent"
        rounded={false}
        loop
        // Snappier than the hero defaults so it reads as active loading.
        cellMs={70}
        pauseMs={320}
        loopHoldMs={650}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default LoadingSpinner;
