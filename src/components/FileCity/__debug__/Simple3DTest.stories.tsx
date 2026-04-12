import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { Simple3DTest } from './FileCityCanvas3D.test';

const meta: Meta<typeof Simple3DTest> = {
  title: 'Debug/Simple3DTest',
  component: Simple3DTest,
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;
type Story = StoryObj<typeof Simple3DTest>;

export const Default: Story = {
  render: () => <Simple3DTest />,
};
