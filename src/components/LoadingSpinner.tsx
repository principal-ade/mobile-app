import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Logo } from './Logo';

interface LoadingSpinnerProps {
  size?: 'small' | 'large';
  color?: string;
}

export function LoadingSpinner({ size = 'large', color }: LoadingSpinnerProps) {
  const dimensions = size === 'small' ? 40 : 80;

  return (
    <View style={styles.container}>
      <Logo width={dimensions} height={dimensions} color={color} animated />
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
