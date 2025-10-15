import React from 'react';
import Markdown from 'react-native-markdown-display';
import { useTheme } from '@a24z/industry-theme';

interface MarkdownRendererProps {
  content: string;
}

/**
 * Temporary markdown renderer using react-native-markdown-display.
 * TODO: Replace with themed-markdown once React Native support is added.
 * See dependency task: themed-markdown
 */
export default function MarkdownRenderer({ content }: MarkdownRendererProps) {
  const { theme } = useTheme();

  return (
    <Markdown
      style={{
        body: { color: theme.colors.text },
        heading1: {
          color: theme.colors.text,
          fontSize: 28,
          fontWeight: 'bold',
          marginBottom: 12,
          marginTop: 16,
        },
        heading2: {
          color: theme.colors.text,
          fontSize: 24,
          fontWeight: 'bold',
          marginBottom: 10,
          marginTop: 14,
        },
        heading3: {
          color: theme.colors.text,
          fontSize: 20,
          fontWeight: 'bold',
          marginBottom: 8,
          marginTop: 12,
        },
        heading4: {
          color: theme.colors.text,
          fontSize: 18,
          fontWeight: 'bold',
          marginBottom: 6,
          marginTop: 10,
        },
        heading5: {
          color: theme.colors.text,
          fontSize: 16,
          fontWeight: 'bold',
          marginBottom: 4,
          marginTop: 8,
        },
        heading6: {
          color: theme.colors.text,
          fontSize: 14,
          fontWeight: 'bold',
          marginBottom: 4,
          marginTop: 6,
        },
        strong: {
          fontWeight: 'bold',
          color: theme.colors.text,
        },
        em: {
          fontStyle: 'italic',
          color: theme.colors.text,
        },
        link: {
          color: theme.colors.primary,
          textDecorationLine: 'underline',
        },
        blockquote: {
          backgroundColor: theme.colors.muted,
          borderLeftColor: theme.colors.primary,
          borderLeftWidth: 4,
          paddingLeft: 12,
          paddingVertical: 8,
          marginVertical: 8,
        },
        code_inline: {
          backgroundColor: theme.colors.muted,
          color: theme.colors.accent,
          paddingHorizontal: 6,
          paddingVertical: 2,
          borderRadius: 4,
          fontFamily: 'Courier',
        },
        code_block: {
          backgroundColor: theme.colors.muted,
          color: theme.colors.text,
          padding: 12,
          borderRadius: 8,
          marginVertical: 8,
          fontFamily: 'Courier',
        },
        fence: {
          backgroundColor: theme.colors.muted,
          color: theme.colors.text,
          padding: 12,
          borderRadius: 8,
          marginVertical: 8,
          fontFamily: 'Courier',
        },
        list_item: {
          color: theme.colors.text,
          marginVertical: 4,
        },
        bullet_list: {
          color: theme.colors.text,
          marginVertical: 8,
        },
        ordered_list: {
          color: theme.colors.text,
          marginVertical: 8,
        },
        hr: {
          backgroundColor: theme.colors.border,
          height: 1,
          marginVertical: 16,
        },
        table: {
          borderColor: theme.colors.border,
          borderWidth: 1,
          marginVertical: 8,
        },
        th: {
          backgroundColor: theme.colors.muted,
          color: theme.colors.text,
          fontWeight: 'bold',
          padding: 8,
          borderColor: theme.colors.border,
        },
        td: {
          color: theme.colors.text,
          padding: 8,
          borderColor: theme.colors.border,
        },
        paragraph: {
          color: theme.colors.text,
          marginVertical: 6,
          lineHeight: 22,
        },
      }}
    >
      {content}
    </Markdown>
  );
}
