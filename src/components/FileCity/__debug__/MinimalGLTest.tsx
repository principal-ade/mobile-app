/**
 * Minimal GL Test - Direct expo-gl without React Three Fiber
 *
 * This tests if WebGL rendering works at all by drawing a triangle
 * directly using expo-gl without any abstractions.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { GLView, type ExpoWebGLRenderingContext } from 'expo-gl';

export function MinimalGLTest() {
  const onContextCreate = (gl: ExpoWebGLRenderingContext) => {
    console.log('[MinimalGLTest] GL Context created');

    // Vertex shader
    const vertexShaderSource = `
      attribute vec4 position;
      void main() {
        gl_Position = position;
      }
    `;

    // Fragment shader (pink color)
    const fragmentShaderSource = `
      precision mediump float;
      void main() {
        gl_FragColor = vec4(1.0, 0.4, 0.7, 1.0); // Hot pink
      }
    `;

    // Create shaders
    const vertexShader = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vertexShader, vertexShaderSource);
    gl.compileShader(vertexShader);

    const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fragmentShader, fragmentShaderSource);
    gl.compileShader(fragmentShader);

    // Create program
    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    gl.useProgram(program);

    // Create triangle vertices
    const vertices = new Float32Array([
      0.0, 0.5,    // Top
      -0.5, -0.5,  // Bottom left
      0.5, -0.5    // Bottom right
    ]);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    const position = gl.getAttribLocation(program, 'position');
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

    // Clear and draw
    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    // Flush
    gl.flush();
    gl.endFrameEXP();

    console.log('[MinimalGLTest] Triangle drawn');
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Minimal GL Test</Text>
        <Text style={styles.subtitle}>You should see a pink triangle</Text>
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
  },
  glView: {
    flex: 1,
  },
});
