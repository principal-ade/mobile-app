/**
 * IndustryMarkdown Component
 *
 * A simple, lightweight markdown renderer using react-native-marked.
 * Colors (text, link, code, border) are automatically pulled from the industry-theme.
 *
 * Features:
 * - Automatic theme color integration
 * - Monospace code blocks with theme-styled backgrounds
 * - Custom link handling
 * - Optional style overrides via customStyles prop
 * - Support for all standard markdown elements
 *
 * Note: This component uses simple monospace styling for code blocks without syntax
 * highlighting. For GitHub README rendering with full syntax highlighting, use WebView
 * with GitHub's HTML API (see docs/markdown-rendering-options.md).
 *
 * Usage:
 * ```tsx
 * <IndustryMarkdown>
 *   # Hello World
 *   This is **bold** and *italic* text.
 *
 *   ```javascript
 *   const hello = 'world';
 *   ```
 * </IndustryMarkdown>
 * ```
 */

import React, { useMemo } from 'react';
import { View, StyleSheet, Linking, Alert, Text, ViewStyle } from 'react-native';
import { useTheme } from '@principal-ade/industry-theme';
import Markdown, {
  Renderer,
  useMarkdown,
  type MarkedStyles,
} from 'react-native-marked';

export interface IndustryMarkdownProps {
  /** Markdown content to render */
  children: string;
  /** Callback when a link is clicked. If not provided, opens in browser. */
  onLinkPress?: (url: string) => void;
  /** Custom styles to override library defaults */
  customStyles?: Partial<MarkedStyles>;
  /** Container style */
  containerStyle?: ViewStyle;
}

export const IndustryMarkdown: React.FC<IndustryMarkdownProps> = ({
  children,
  onLinkPress,
  customStyles = {},
  containerStyle = {},
}) => {
  const { theme } = useTheme();

  // Create custom renderer for link handling
  const renderer = useMemo(() => {
    // Create a custom renderer class that extends the default
    class CustomRenderer extends Renderer {
      link(children: string | React.ReactNode[], href: string, styles?: object, _title?: string) {
        const handlePress = () => {
          if (onLinkPress) {
            onLinkPress(href);
          } else {
            // Default behavior: open in browser
            Linking.canOpenURL(href).then((supported) => {
              if (supported) {
                Linking.openURL(href);
              } else {
                Alert.alert('Cannot open URL', `Unable to open: ${href}`);
              }
            });
          }
        };

        return (
          <Text
            key={`link-${href}`}
            style={styles}
            onPress={handlePress}
          >
            {children}
          </Text>
        );
      }
    }

    return new CustomRenderer();
  }, [onLinkPress]);

  // Styles for code blocks with theme colors
  const defaultStyles: Partial<MarkedStyles> = useMemo(() => ({
    // Inline code
    codespan: {
      backgroundColor: theme.colors.backgroundSecondary || theme.colors.muted,
      fontFamily: theme.fonts.monospace,
      fontSize: theme.fontSizes[1],
      paddingHorizontal: theme.space[1],
      paddingVertical: 2,
      borderRadius: theme.radii[1],
    },
    // Code blocks
    code: {
      backgroundColor: theme.colors.backgroundSecondary || theme.colors.muted,
      fontFamily: theme.fonts.monospace,
      fontSize: theme.fontSizes[1],
      padding: theme.space[3],
      borderRadius: theme.radii[2],
      marginVertical: theme.space[2],
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    ...customStyles,
  }), [theme, customStyles]);

  return (
    <View style={[styles.container, containerStyle]}>
      <Markdown
        value={children}
        styles={defaultStyles}
        renderer={renderer}
        theme={{
          colors: {
            text: theme.colors.text,
            link: theme.colors.primary,
            code: theme.colors.primary,
            border: theme.colors.border,
          },
        }}
        flatListProps={{
          contentContainerStyle: {
            backgroundColor: 'transparent',
          },
          style: {
            backgroundColor: 'transparent',
          },
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    // Container uses theme from parent
  },
});

export interface IndustryMarkdownInlineProps {
  /** Markdown content to render */
  children: string;
  /** Callback when a link is clicked. If not provided, opens in browser. */
  onLinkPress?: (url: string) => void;
  /** Container style */
  containerStyle?: ViewStyle;
}

/**
 * Same look as `IndustryMarkdown`, but renders via the `useMarkdown` hook
 * into a plain `View` instead of the library's `FlatList`-backed component.
 * Use when the markdown is being placed inside another `ScrollView` /
 * `FlatList` and the nested-virtualized-list warning would otherwise fire.
 * For standalone bodies, prefer `IndustryMarkdown` so windowing kicks in.
 */
export const IndustryMarkdownInline: React.FC<IndustryMarkdownInlineProps> = ({
  children,
  onLinkPress,
  containerStyle = {},
}) => {
  const { theme } = useTheme();

  const renderer = useMemo(() => {
    class CustomRenderer extends Renderer {
      link(
        linkChildren: string | React.ReactNode[],
        href: string,
        linkStyles?: object,
        _title?: string,
      ) {
        const handlePress = () => {
          if (onLinkPress) {
            onLinkPress(href);
          } else {
            Linking.canOpenURL(href).then((supported) => {
              if (supported) {
                Linking.openURL(href);
              } else {
                Alert.alert('Cannot open URL', `Unable to open: ${href}`);
              }
            });
          }
        };
        return (
          <Text key={`link-${href}`} style={linkStyles} onPress={handlePress}>
            {linkChildren}
          </Text>
        );
      }
    }
    return new CustomRenderer();
  }, [onLinkPress]);

  const inlineStyles: Partial<MarkedStyles> = useMemo(
    () => ({
      codespan: {
        backgroundColor:
          theme.colors.backgroundSecondary || theme.colors.muted,
        fontFamily: theme.fonts.monospace,
        fontSize: theme.fontSizes[1],
        paddingHorizontal: theme.space[1],
        paddingVertical: 2,
        borderRadius: theme.radii[1],
      },
      code: {
        backgroundColor:
          theme.colors.backgroundSecondary || theme.colors.muted,
        fontFamily: theme.fonts.monospace,
        fontSize: theme.fontSizes[1],
        padding: theme.space[3],
        borderRadius: theme.radii[2],
        marginVertical: theme.space[2],
        borderWidth: 1,
        borderColor: theme.colors.border,
      },
    }),
    [theme],
  );

  const nodes = useMarkdown(children, {
    renderer,
    styles: inlineStyles,
    theme: {
      colors: {
        text: theme.colors.text,
        link: theme.colors.primary,
        code: theme.colors.primary,
        border: theme.colors.border,
      },
    },
  });

  return <View style={containerStyle}>{nodes}</View>;
};
