import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { DirectThreeTest } from './DirectThreeTest';

const meta: Meta<typeof DirectThreeTest> = {
  title: 'Debug/DirectThreeTest',
  component: DirectThreeTest,
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;
type Story = StoryObj<typeof DirectThreeTest>;

export const Default: Story = {
  render: () => <DirectThreeTest />,
};
