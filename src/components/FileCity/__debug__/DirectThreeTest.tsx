/**
 * Direct Three.js Test - Using expo-three directly
 *
 * This bypasses React Three Fiber and uses Three.js directly
 * with expo-three to see if the issue is with R3F or WebGL itself.
 */

import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { GLView } from 'expo-gl';
import { Renderer } from 'expo-three';
import * as THREE from 'three';

export function DirectThreeTest() {
  const animationFrameRef = useRef<number | null>(null);

  const onContextCreate = async (gl: any) => {
    console.log('[DirectThreeTest] GL Context created');
    console.log('[DirectThreeTest] GL size:', gl.drawingBufferWidth, 'x', gl.drawingBufferHeight);

    // Create renderer
    const renderer = new Renderer({ gl });
    renderer.setSize(gl.drawingBufferWidth, gl.drawingBufferHeight);
    renderer.setClearColor(0x222222, 1); // Dark gray background

    // Create scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x222222);

    // Create camera
    const camera = new THREE.PerspectiveCamera(
      75,
      gl.drawingBufferWidth / gl.drawingBufferHeight,
      0.1,
      1000
    );
    camera.position.set(0, 0, 5);
    camera.lookAt(0, 0, 0);

    // Create cube with basic material (doesn't need lighting)
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshBasicMaterial({
      color: 0xff69b4,
      wireframe: false
    });
    const cube = new THREE.Mesh(geometry, material);
    scene.add(cube);

    console.log('[DirectThreeTest] Cube created at:', cube.position);
    console.log('[DirectThreeTest] Camera position:', camera.position);
    console.log('[DirectThreeTest] Scene children:', scene.children.length);

    // Render loop
    const render = () => {
      animationFrameRef.current = requestAnimationFrame(render);

      // Rotate cube
      cube.rotation.x += 0.01;
      cube.rotation.y += 0.01;

      // Render
      renderer.render(scene, camera);
      gl.endFrameEXP();
    };

    console.log('[DirectThreeTest] Starting render loop');
    render();
  };

  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Direct Three.js Test</Text>
        <Text style={styles.subtitle}>Using expo-three Renderer directly</Text>
        <Text style={styles.subtitle}>You should see a spinning pink cube</Text>
      </View>
      <GLView
        style={styles.glView}
        onContextCreate={onContextCreate}
      />
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
    marginBottom: 2,
  },
  glView: {
    flex: 1,
  },
});
