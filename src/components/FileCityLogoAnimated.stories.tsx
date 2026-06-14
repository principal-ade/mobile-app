import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import React, { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { FileCityLogoAnimated } from './FileCityLogoAnimated';

const meta: Meta<typeof FileCityLogoAnimated> = {
  title: 'Components/FileCityLogoAnimated',
  component: FileCityLogoAnimated,
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof FileCityLogoAnimated>;

const Stage: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <View style={{ backgroundColor: '#1a1a1a', padding: 20 }}>{children}</View>
);

const Tile: React.FC<{ label: string; children: React.ReactNode }> = ({
  label,
  children,
}) => (
  <View style={{ alignItems: 'center' }}>
    {children}
    <Text style={{ color: '#fff', marginTop: 8 }}>{label}</Text>
  </View>
);

export const Default: Story = {
  render: () => (
    <Stage>
      <FileCityLogoAnimated width={160} height={160} mark="P" />
    </Stage>
  ),
};

export const Marks: Story = {
  name: 'Marks (P / AI / PAI)',
  render: () => (
    <View
      style={{
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 20,
        backgroundColor: '#1a1a1a',
        padding: 20,
        maxWidth: 360,
      }}
    >
      <Tile label="P">
        <FileCityLogoAnimated width={120} height={120} mark="P" />
      </Tile>
      <Tile label="AI">
        <FileCityLogoAnimated width={120} height={120} mark="AI" />
      </Tile>
      <Tile label="PAI">
        <FileCityLogoAnimated width={120} height={120} mark="PAI" />
      </Tile>
    </View>
  ),
};

export const GradualBuild: Story = {
  name: 'Gradual heatmap build (buildSteps 3)',
  render: () => (
    <Stage>
      <FileCityLogoAnimated
        width={160}
        height={160}
        mark="PAI"
        buildSteps={3}
        cellMs={120}
      />
    </Stage>
  ),
};

export const NoConnectors: Story = {
  render: () => (
    <Stage>
      <FileCityLogoAnimated width={160} height={160} mark="P" connectors={false} />
    </Stage>
  ),
};

export const CustomColors: Story = {
  render: () => (
    <Stage>
      <FileCityLogoAnimated
        width={160}
        height={160}
        mark="P"
        primary="#22d3ee"
        accent="#f472b6"
      />
    </Stage>
  ),
};

/** Tap to bump `playKey` and replay the whole build from scratch. */
export const Replay: Story = {
  render: () => {
    const Demo = () => {
      const [key, setKey] = useState(0);
      return (
        <View style={{ alignItems: 'center', backgroundColor: '#1a1a1a', padding: 20 }}>
          <FileCityLogoAnimated width={180} height={180} mark="PAI" playKey={key} />
          <Pressable
            onPress={() => setKey((k) => k + 1)}
            style={{
              marginTop: 12,
              paddingHorizontal: 16,
              paddingVertical: 8,
              backgroundColor: '#334155',
              borderRadius: 8,
            }}
          >
            <Text style={{ color: '#fff' }}>Replay</Text>
          </Pressable>
        </View>
      );
    };
    return <Demo />;
  },
};
