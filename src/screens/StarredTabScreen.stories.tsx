import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { StarredTabScreen } from './StarredTabScreen';
import { NavigationContainer } from '@react-navigation/native';
import React from 'react';

const meta: Meta<typeof StarredTabScreen> = {
  title: 'Screens/StarredTabScreen',
  component: StarredTabScreen,
  decorators: [
    (Story) => (
      <NavigationContainer>
        <Story />
      </NavigationContainer>
    ),
  ],
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithMockData: Story = {
  render: () => {
    // This would normally come from context/API
    return <StarredTabScreen />;
  },
};
