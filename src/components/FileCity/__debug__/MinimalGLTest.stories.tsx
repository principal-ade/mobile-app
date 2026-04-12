import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { MinimalGLTest } from './MinimalGLTest';

const meta: Meta<typeof MinimalGLTest> = {
  title: 'Debug/MinimalGLTest',
  component: MinimalGLTest,
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;
type Story = StoryObj<typeof MinimalGLTest>;

export const Default: Story = {
  render: () => <MinimalGLTest />,
};
