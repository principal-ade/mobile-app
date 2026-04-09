import type { Preview } from '@storybook/react-native-web-vite';
import React from 'react';
import { ThemeProvider } from '@principal-ade/industry-theme';
import { iceTangerineDarkTheme } from '../src/themes/iceTangerineDark';

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

export default preview;
