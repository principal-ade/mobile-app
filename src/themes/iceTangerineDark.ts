/**
 * Ice Tangerine Dark Theme
 *
 * Dark variant of iceTangerineTheme - deep charcoal with ice blue undertones,
 * tangerine primary accent, and teal secondary.
 */

import type { Theme } from '@principal-ade/industry-theme';

export const iceTangerineDarkTheme: Theme = {
  // Spacing scale (used for margin, padding, etc.)
  space: [0, 4, 8, 16, 32, 64, 128, 256, 512],

  // Typography
  fonts: {
    body: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    heading:
      '"Space Grotesk", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    monospace: '"Fira Code", "SF Mono", Monaco, Inconsolata, monospace',
  },

  fontSizes: [12, 14, 16, 18, 20, 24, 32, 48, 64, 96],

  fontScale: 1.0,

  fontWeights: {
    body: 400,
    heading: 600,
    bold: 700,
    light: 300,
    medium: 500,
    semibold: 600,
  },

  lineHeights: {
    body: 1.6,
    heading: 1.3,
    tight: 1.25,
    relaxed: 1.75,
  },

  // Layout
  breakpoints: ['640px', '768px', '1024px', '1280px'],
  sizes: [16, 32, 64, 128, 256, 512, 768, 1024, 1536],
  radii: [0, 2, 4, 6, 8, 12, 16, 24],
  shadows: [
    'none',
    '0 1px 3px 0 rgba(0, 0, 0, 0.3)',
    '0 4px 6px -1px rgba(0, 0, 0, 0.35)',
    '0 10px 15px -3px rgba(0, 0, 0, 0.35)',
    '0 20px 25px -5px rgba(0, 0, 0, 0.4)',
    '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
  ],
  zIndices: [0, 1, 10, 20, 30, 40, 50],

  // Colors - Dark with ice blue undertones, tangerine/teal accents
  colors: {
    // Base colors
    text: '#e8f4f6', // Ice blue tinted white
    background: '#0c1520', // Deep charcoal with blue undertone
    primary: '#ff6b35', // Bright tangerine - primary action color
    secondary: '#ff8c5a', // Lighter tangerine for hover
    accent: '#0893d2', // Bright teal accent
    highlight: '#1a2a35', // Dark ice blue highlight
    muted: '#1e2d38', // Muted dark blue

    // Status colors
    success: '#10b981', // Emerald green
    warning: '#f59e0b', // Amber
    error: '#ef4444', // Red
    info: '#0893d2', // Bright teal (matches accent)

    // Additional semantic colors
    border: '#243442', // Dark ice blue border
    backgroundSecondary: '#131f2a', // Slightly lighter dark
    backgroundTertiary: '#1a2935', // Even lighter dark
    backgroundLight: '#111c26', // Subtle lighter
    backgroundHover: '#2a1a15', // Tangerine-tinted hover
    surface: '#131f2a', // Dark surface for cards
    textSecondary: '#a8c5cc', // Muted ice blue for secondary text
    textTertiary: '#7a9ea8', // Darker ice blue
    textMuted: '#5a7f8a', // Even darker ice blue

    // Search highlight colors
    highlightBg: '#3d2015', // Dark tangerine highlight
    highlightBorder: '#ff6b35', // Tangerine border

    // Text on primary background
    textOnPrimary: '#ffffff', // White text on tangerine primary
    // Text on secondary background
    textOnSecondary: '#0c1520', // Dark text on lighter tangerine
    // Text on accent background
    textOnAccent: '#ffffff', // White text on teal accent
  },

  // Component variants
  buttons: {
    primary: {
      color: '#ffffff', // White text on tangerine
      bg: 'primary',
      borderWidth: 0,
      '&:hover': {
        bg: 'secondary',
      },
    },
    secondary: {
      color: 'accent',
      bg: 'transparent',
      borderWidth: 1,
      borderStyle: 'solid',
      borderColor: 'accent',
      '&:hover': {
        bg: 'highlight',
      },
    },
    ghost: {
      color: 'text',
      bg: 'transparent',
      '&:hover': {
        bg: 'backgroundHover',
      },
    },
  },

  text: {
    heading: {
      fontFamily: 'heading',
      fontWeight: 'heading',
      lineHeight: 'heading',
    },
    body: {
      fontFamily: 'body',
      fontWeight: 'body',
      lineHeight: 'body',
    },
    caption: {
      fontSize: 1,
      color: 'textSecondary',
    },
  },

  cards: {
    primary: {
      bg: 'surface',
      border: '1px solid',
      borderColor: 'border',
      borderRadius: 3,
    },
    secondary: {
      bg: 'backgroundSecondary',
      border: '1px solid',
      borderColor: 'accent',
      borderRadius: 3,
    },
  },
};
