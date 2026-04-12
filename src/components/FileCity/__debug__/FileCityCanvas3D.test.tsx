/**
 * Simple 3D Test Component - Minimal Three.js scene to test WebGL
 *
 * This renders a simple spinning cube to verify that:
 * 1. expo-gl is working
 * 2. @react-three/fiber is rendering
 * 3. Basic 3D rendering works on device
 */

import React, { useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Canvas, useFrame } from '@react-three/fiber/native';
import * as THREE from 'three';

function SpinningCube() {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.x += delta;
      meshRef.current.rotation.y += delta * 0.5;
    }
  });

  return (
    <mesh ref={meshRef} position={[0, 0, 0]}>
      <boxGeometry args={[2, 2, 2]} />
      <meshStandardMaterial color="hotpink" />
    </mesh>
  );
}

export function Simple3DTest() {
  console.log('[Simple3DTest] Rendering');

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Simple 3D Test (R3F)</Text>
        <Text style={styles.subtitle}>You should see a spinning pink cube</Text>
      </View>
      <View style={styles.canvasContainer}>
        <Canvas
          camera={{ position: [0, 0, 5], fov: 75 }}
        >
          <ambientLight intensity={0.5} />
          <pointLight position={[10, 10, 10]} />
          <SpinningCube />
        </Canvas>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    padding: 16,
    backgroundColor: '#1a1a2e',
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a3e',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    color: '#94a3b8',
  },
  canvasContainer: {
    flex: 1,
  },
});
