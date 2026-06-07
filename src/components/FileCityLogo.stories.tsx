import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import React from 'react';
import { View, Text } from 'react-native';
import { FileCityLogo } from './FileCityLogo';

const meta: Meta<typeof FileCityLogo> = {
  title: 'Components/FileCityLogo',
  component: FileCityLogo,
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof FileCityLogo>;

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
      <FileCityLogo />
    </Stage>
  ),
};

export const Marks: Story = {
  name: 'Marks (P / AI / PAI / lockup / none)',
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
        <FileCityLogo width={120} height={120} mark="P" />
      </Tile>
      <Tile label="AI">
        <FileCityLogo width={120} height={120} mark="AI" />
      </Tile>
      <Tile label="PAI">
        <FileCityLogo width={120} height={120} mark="PAI" />
      </Tile>
      <Tile label="lockup">
        <FileCityLogo width={120} height={120} mark="lockup" />
      </Tile>
      <Tile label="none">
        <FileCityLogo width={120} height={120} mark="none" />
      </Tile>
      <Tile label="none (no highlight)">
        <FileCityLogo width={120} height={120} mark="none" highlight={false} />
      </Tile>
    </View>
  ),
};

export const Gradients: Story = {
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
      <Tile label="diagonal">
        <FileCityLogo width={120} height={120} gradient="diagonal" />
      </Tile>
      <Tile label="vertical">
        <FileCityLogo width={120} height={120} gradient="vertical" />
      </Tile>
      <Tile label="horizontal">
        <FileCityLogo width={120} height={120} gradient="horizontal" />
      </Tile>
      <Tile label="scatter">
        <FileCityLogo width={120} height={120} gradient="scatter" />
      </Tile>
    </View>
  ),
};

export const Trail: Story = {
  render: () => (
    <Stage>
      <FileCityLogo width={160} height={160} mark="P" trail />
    </Stage>
  ),
};

export const AiCard: Story = {
  name: 'AI Card',
  render: () => (
    <Stage>
      <FileCityLogo width={160} height={160} mark="P" aiCard />
    </Stage>
  ),
};

export const Margin: Story = {
  name: 'Margin (0 packs the glyph)',
  render: () => (
    <View
      style={{
        flexDirection: 'row',
        gap: 20,
        backgroundColor: '#1a1a1a',
        padding: 20,
      }}
    >
      <Tile label="margin 1 (default)">
        <FileCityLogo width={120} height={120} mark="P" margin={1} />
      </Tile>
      <Tile label="margin 0">
        <FileCityLogo width={120} height={120} mark="P" margin={0} />
      </Tile>
    </View>
  ),
};

export const SizeComparison: Story = {
  render: () => (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: 20,
        backgroundColor: '#1a1a1a',
        padding: 20,
      }}
    >
      <Tile label="60">
        <FileCityLogo width={60} height={60} />
      </Tile>
      <Tile label="120">
        <FileCityLogo width={120} height={120} />
      </Tile>
      <Tile label="180">
        <FileCityLogo width={180} height={180} />
      </Tile>
    </View>
  ),
};

export const CustomColors: Story = {
  render: () => (
    <View
      style={{
        flexDirection: 'row',
        gap: 20,
        backgroundColor: '#1a1a1a',
        padding: 20,
      }}
    >
      <Tile label="amber on slate">
        <FileCityLogo
          width={120}
          height={120}
          mark="P"
          primary="#fbbf24"
          color="#cbd5e1"
          background="#0f172a"
        />
      </Tile>
      <Tile label="accent trail">
        <FileCityLogo
          width={120}
          height={120}
          mark="P"
          trail
          primary="#22d3ee"
          accent="#f472b6"
        />
      </Tile>
    </View>
  ),
};

export const Square: Story = {
  name: 'No rounded corners',
  render: () => (
    <Stage>
      <FileCityLogo width={140} height={140} mark="P" rounded={false} />
    </Stage>
  ),
};

export const Transparent: Story = {
  name: 'Transparent background',
  render: () => (
    <View style={{ backgroundColor: '#3b0764', padding: 20 }}>
      <FileCityLogo
        width={140}
        height={140}
        mark="P"
        background="transparent"
        rounded={false}
      />
    </View>
  ),
};
