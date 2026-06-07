import type { Preview } from '@storybook/react-native-web-vite';
import React from 'react';
import { ThemeProvider, iceTangerineDarkTheme } from '@principal-ade/industry-theme';

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    a11y: {
      test: 'todo',
    },
  },
  decorators: [
    (Story) => (
      <ThemeProvider theme={iceTangerineDarkTheme}>
        <Story />
      </ThemeProvider>
    ),
  ],
};

// Export for native Storybook
export const decorators = preview.decorators;
export const parameters = preview.parameters;

export default preview;
