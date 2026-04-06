import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Logo } from './Logo';

// Wrapper to test mount/remount behavior
const MountTester: React.FC<{
  width?: number;
  height?: number;
  animated?: boolean;
}> = ({ width = 120, height = 120, animated = true }) => {
  const [mountKey, setMountKey] = useState(0);
  const [isMounted, setIsMounted] = useState(true);

  const triggerRemount = useCallback(() => {
    setMountKey((k) => k + 1);
  }, []);

  const toggleMount = useCallback(() => {
    setIsMounted((m) => !m);
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.controls}>
        <Pressable style={styles.button} onPress={triggerRemount}>
          <Text style={styles.buttonText}>Remount (key change)</Text>
        </Pressable>
        <Pressable style={styles.button} onPress={toggleMount}>
          <Text style={styles.buttonText}>{isMounted ? 'Unmount' : 'Mount'}</Text>
        </Pressable>
      </View>

      <Text style={styles.info}>Mount key: {mountKey}</Text>
      <Text style={styles.info}>Mounted: {isMounted ? 'yes' : 'no'}</Text>

      <View style={[styles.logoContainer, { width, height }]}>
        {isMounted && (
          <Logo
            key={mountKey}
            width={width}
            height={height}
            animated={animated}
          />
        )}
      </View>

      <Text style={styles.hint}>
        Watch the logo when clicking "Remount" - does it grow/shrink?
      </Text>
    </View>
  );
};

// Test with a fixed-size wrapper
const FixedWrapperTest: React.FC<{
  width?: number;
  height?: number;
  animated?: boolean;
}> = ({ width = 120, height = 120, animated = true }) => {
  const [mountKey, setMountKey] = useState(0);

  const triggerRemount = useCallback(() => {
    setMountKey((k) => k + 1);
  }, []);

  return (
    <View style={styles.container}>
      <Pressable style={styles.button} onPress={triggerRemount}>
        <Text style={styles.buttonText}>Remount</Text>
      </Pressable>

      <Text style={styles.info}>With fixed wrapper (width/height on container)</Text>

      <View
        style={[
          styles.logoContainer,
          styles.fixedWrapper,
          { width, height },
        ]}
      >
        <View style={{ width, height }}>
          <Logo
            key={mountKey}
            width={width}
            height={height}
            animated={animated}
          />
        </View>
      </View>
    </View>
  );
};

// Rapid mount/unmount test
const RapidMountTest: React.FC = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [mountKey, setMountKey] = useState(0);

  const startRapidMount = useCallback(() => {
    setIsRunning(true);
    let count = 0;
    const interval = setInterval(() => {
      setMountKey((k) => k + 1);
      count++;
      if (count >= 10) {
        clearInterval(interval);
        setIsRunning(false);
      }
    }, 500);
  }, []);

  return (
    <View style={styles.container}>
      <Pressable
        style={[styles.button, isRunning && styles.buttonDisabled]}
        onPress={startRapidMount}
        disabled={isRunning}
      >
        <Text style={styles.buttonText}>
          {isRunning ? 'Running...' : 'Rapid remount (10x)'}
        </Text>
      </Pressable>

      <View style={[styles.logoContainer, { width: 120, height: 120 }]}>
        <Logo key={mountKey} width={120} height={120} animated={false} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    alignItems: 'center',
    gap: 16,
  },
  controls: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: '#007AFF',
    borderRadius: 8,
  },
  buttonDisabled: {
    backgroundColor: '#999',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
  },
  info: {
    fontSize: 12,
    color: '#666',
  },
  hint: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    maxWidth: 250,
  },
  logoContainer: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1a1a1a',
  },
  fixedWrapper: {
    overflow: 'hidden',
  },
});

const meta: Meta<typeof Logo> = {
  title: 'Components/Logo',
  component: Logo,
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof Logo>;

export const Default: Story = {
  render: () => (
    <View style={{ backgroundColor: '#1a1a1a', padding: 20 }}>
      <Logo />
    </View>
  ),
};

export const SmallSize: Story = {
  render: () => (
    <View style={{ backgroundColor: '#1a1a1a', padding: 20 }}>
      <Logo width={80} height={80} />
    </View>
  ),
};

export const LargeSize: Story = {
  render: () => (
    <View style={{ backgroundColor: '#1a1a1a', padding: 20 }}>
      <Logo width={200} height={200} />
    </View>
  ),
};

export const NoAnimation: Story = {
  render: () => (
    <View style={{ backgroundColor: '#1a1a1a', padding: 20 }}>
      <Logo width={120} height={120} animated={false} />
    </View>
  ),
};

export const MountTest: Story = {
  name: 'Mount/Remount Test',
  render: () => <MountTester />,
};

export const MountTestNoAnimation: Story = {
  name: 'Mount Test (No Animation)',
  render: () => <MountTester animated={false} />,
};

export const FixedWrapperMountTest: Story = {
  render: () => <FixedWrapperTest animated={false} />,
};

export const RapidMount: Story = {
  name: 'Rapid Mount Test',
  render: () => <RapidMountTest />,
};

export const SizeComparison: Story = {
  render: () => (
    <View style={{ flexDirection: 'row', gap: 20, backgroundColor: '#1a1a1a', padding: 20 }}>
      <View style={{ alignItems: 'center' }}>
        <Logo width={60} height={60} animated={false} />
        <Text style={{ color: '#fff', marginTop: 8 }}>60x60</Text>
      </View>
      <View style={{ alignItems: 'center' }}>
        <Logo width={120} height={120} animated={false} />
        <Text style={{ color: '#fff', marginTop: 8 }}>120x120</Text>
      </View>
      <View style={{ alignItems: 'center' }}>
        <Logo width={180} height={180} animated={false} />
        <Text style={{ color: '#fff', marginTop: 8 }}>180x180</Text>
      </View>
    </View>
  ),
};
