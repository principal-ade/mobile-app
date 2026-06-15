/**
 * Renders a trail marker's code snippet inside the brief.
 *
 * Mirrors the slicing logic of the web `TrailSnippetView`
 * (`industry-themed-file-city-panels/.../overlays/TrailSnippetView.tsx`):
 * read the file, slice it to `[startLine, endLine]` padded by
 * `contextLines`, rewrite the gutter to show true file line numbers, and
 * call out `focusLine`. The web path draws through Pierre's DOM `<File>`
 * (shadow DOM, not portable to RN); here we render the slice as plain
 * monospace `<Text>` rows.
 *
 * Syntax highlighting runs through `shikiHighlighter` — a
 * `react-native-shiki-engine` (native Oniguruma) core with a JavaScript
 * fallback, per the `t3code` "Mobile renders code with Shiki" trail.
 * Tokenizing is off the render path: rows render as plain monospace until
 * the tokens resolve (and stay that way if highlighting fails or the
 * grammar is plain `text`), so the snippet is always readable.
 *
 * Slice snippets resolve their contents through `readFile` (GitHub at the
 * authored commit). Diff snippets carry their own `oldContents` /
 * `newContents` and need no reader; the post-change side renders as a plain
 * slice (inline +/- coloring is deferred to a later pass).
 */

import React from 'react';
import { View, Text, ScrollView, Pressable, TextStyle, StyleProp, ViewStyle } from 'react-native';
import { useTheme, type Theme } from '@principal-ade/industry-theme';

import type { TrailMarkerSnippet } from '../../types/Trail';
import type { TrailFileReader } from '../../services/TrailFileContentService';
import {
  highlightToLines,
  type ShikiThemeName,
  type ThemedToken,
} from './shikiHighlighter';
import { withAlpha } from './colorMix';

export interface TrailCodeSnippetProps {
  /** Repo-relative path; passed to `readFile` for slice snippets. */
  filePath?: string;
  /** The marker's snippet (slice or diff). */
  snippet: TrailMarkerSnippet;
  /** Host file reader — required for slice snippets, unused for diffs. */
  readFile?: TrailFileReader;
  /** Trail eyebrow color — tints the focus line + chrome. */
  eyebrowColor: string;
  /** Optional overrides merged onto the snippet's outer container (e.g. to
   *  drop the default top margin or a border edge when embedded in a card). */
  containerStyle?: StyleProp<ViewStyle>;
  /** When set, renders a close (✕) button in the snippet header. */
  onClose?: () => void;
}

interface SnippetLine {
  /** True file line number (1-based) shown in the gutter. */
  num: number;
  text: string;
  focus: boolean;
}

interface SlicedSnippet {
  lines: SnippetLine[];
  /** Widest gutter label, for fixed-width alignment. */
  gutterWidth: number;
}

/**
 * Slice a full file's text to the snippet window. Shared by slice and diff
 * snippets — both address lines by absolute file position.
 */
function sliceContents(
  contents: string,
  startLine: number,
  endLine: number,
  contextLines: number,
  focusLine: number | undefined,
): SlicedSnippet {
  const allLines = contents.split('\n');
  const total = allLines.length;
  const safeStart = Math.max(1, Math.min(startLine, total));
  const safeEnd = Math.max(safeStart, Math.min(endLine, total));
  const sliceStart = Math.max(1, safeStart - contextLines);
  const sliceEnd = Math.min(total, safeEnd + contextLines);

  const lines: SnippetLine[] = [];
  for (let n = sliceStart; n <= sliceEnd; n += 1) {
    lines.push({
      num: n,
      text: allLines[n - 1] ?? '',
      focus: focusLine != null && n === focusLine,
    });
  }
  return { lines, gutterWidth: String(sliceEnd).length };
}

type LoadState =
  | { status: 'loading' }
  | { status: 'ready'; slice: SlicedSnippet }
  | { status: 'error'; message: string; canRetry: boolean };

export const TrailCodeSnippet: React.FC<TrailCodeSnippetProps> = ({
  filePath,
  snippet,
  readFile,
  eyebrowColor,
  containerStyle,
  onClose,
}) => {
  const { theme } = useTheme();
  const [attempt, setAttempt] = React.useState(0);

  // Diff snippets carry their contents inline — slice them synchronously so
  // they never flash a loading state. The post-change side is preferred;
  // fall back to the pre-change side when the resolver hasn't filled
  // `newContents` yet.
  const inlineSlice = React.useMemo<SlicedSnippet | null>(() => {
    if (snippet.kind !== 'diff') return null;
    const source = snippet.newContents ?? snippet.oldContents ?? '';
    return sliceContents(
      source,
      snippet.startLine,
      snippet.endLine,
      snippet.contextLines ?? 2,
      snippet.focusLine,
    );
  }, [snippet]);

  const [state, setState] = React.useState<LoadState>(() =>
    inlineSlice
      ? { status: 'ready', slice: inlineSlice }
      : { status: 'loading' },
  );

  React.useEffect(() => {
    if (inlineSlice) {
      setState({ status: 'ready', slice: inlineSlice });
      return;
    }
    if (snippet.kind !== 'slice') return;
    if (!filePath || !readFile) {
      setState({
        status: 'error',
        message: 'No source available for this snippet.',
        canRetry: false,
      });
      return;
    }

    let cancelled = false;
    setState({ status: 'loading' });
    readFile(filePath)
      .then((contents) => {
        if (cancelled) return;
        setState({
          status: 'ready',
          slice: sliceContents(
            contents,
            snippet.startLine,
            snippet.endLine,
            snippet.contextLines ?? 2,
            snippet.focusLine,
          ),
        });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const status =
          typeof err === 'object' && err != null && 'status' in err
            ? (err as { status?: number }).status
            : undefined;
        const message =
          status === 401
            ? 'Sign in to load source for this snippet.'
            : status === 403
              ? "You don't have access to this file's repository."
              : status === 404
                ? 'Source file not found at the authored commit.'
                : err instanceof Error
                  ? err.message
                  : 'Failed to load source.';
        setState({ status: 'error', message, canRetry: status !== 401 && status !== 403 });
      });
    return () => {
      cancelled = true;
    };
    // `attempt` is included so the retry button can force a re-fetch.
  }, [inlineSlice, snippet, filePath, readFile, attempt]);

  // Syntax highlighting. Tokenize the resolved slice off the render path;
  // until the tokens land (or if tokenizing fails) the rows render as plain
  // monospace, so the snippet is always readable. Keyed on the slice's text
  // so re-tokenizing only happens when the visible code actually changes.
  const themeName = pickShikiTheme(theme.colors.background);
  const sliceCode =
    state.status === 'ready'
      ? state.slice.lines.map((l) => l.text).join('\n')
      : null;
  const [tokensByLine, setTokensByLine] = React.useState<
    ThemedToken[][] | null
  >(null);

  React.useEffect(() => {
    if (sliceCode == null) {
      setTokensByLine(null);
      return;
    }
    let cancelled = false;
    setTokensByLine(null);
    highlightToLines(sliceCode, filePath, themeName)
      .then((lines) => {
        if (!cancelled) setTokensByLine(lines);
      })
      .catch(() => {
        // Leave tokens null — rows fall back to plain monospace.
        if (!cancelled) setTokensByLine(null);
      });
    return () => {
      cancelled = true;
    };
  }, [sliceCode, filePath, themeName]);

  const rangeLabel = formatRange(snippet);

  return (
    <View
      style={[
        {
          marginTop: 8,
          borderWidth: 1,
          borderColor: withAlpha(eyebrowColor, 0.3),
          borderRadius: theme.radii[1],
          backgroundColor: theme.colors.background,
          overflow: 'hidden',
        },
        containerStyle,
      ]}
    >
      <SnippetHeader
        theme={theme}
        eyebrowColor={eyebrowColor}
        filePath={filePath}
        rangeLabel={rangeLabel}
        isDiff={snippet.kind === 'diff'}
        onClose={onClose}
      />
      {state.status === 'loading' ? (
        <SnippetMessage theme={theme} text="Loading source…" />
      ) : state.status === 'error' ? (
        <SnippetError
          theme={theme}
          message={state.message}
          onRetry={
            state.canRetry ? () => setAttempt((a) => a + 1) : undefined
          }
        />
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator
          contentContainerStyle={{ paddingVertical: 6 }}
        >
          <View>
            {state.slice.lines.map((line, idx) => (
              <CodeRow
                key={line.num}
                theme={theme}
                eyebrowColor={eyebrowColor}
                line={line}
                gutterWidth={state.slice.gutterWidth}
                tokens={tokensByLine?.[idx]}
              />
            ))}
          </View>
        </ScrollView>
      )}
    </View>
  );
};

// ===========================================================================
// Sub-components
// ===========================================================================

const SnippetHeader: React.FC<{
  theme: Theme;
  eyebrowColor: string;
  filePath?: string;
  rangeLabel: string | null;
  isDiff: boolean;
  onClose?: () => void;
}> = ({ theme, eyebrowColor, filePath, rangeLabel, isDiff, onClose }) => (
  <View
    style={{
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingVertical: 6,
      paddingHorizontal: 10,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
      backgroundColor: theme.colors.backgroundSecondary,
    }}
  >
    <Text
      style={{
        flex: 1,
        minWidth: 0,
        fontFamily: theme.fonts.monospace,
        fontSize: theme.fontSizes[0],
        color: theme.colors.textSecondary,
        letterSpacing: 0.3,
      }}
      numberOfLines={1}
      ellipsizeMode="middle"
    >
      {filePath ?? 'snippet'}
      {rangeLabel ? (
        <Text style={{ color: theme.colors.textTertiary }}>{`  ${rangeLabel}`}</Text>
      ) : null}
    </Text>
    {isDiff ? (
      <Text
        style={{
          fontFamily: theme.fonts.monospace,
          fontSize: theme.fontSizes[0],
          color: eyebrowColor,
          letterSpacing: 0.6,
        }}
      >
        DIFF
      </Text>
    ) : null}
    {onClose ? (
      <Pressable
        onPress={onClose}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        accessibilityRole="button"
        accessibilityLabel="Close snippet"
      >
        <Text
          style={{
            fontSize: theme.fontSizes[1],
            fontWeight: '600',
            color: theme.colors.textSecondary,
          }}
        >
          ✕
        </Text>
      </Pressable>
    ) : null}
  </View>
);

const CodeRow: React.FC<{
  theme: Theme;
  eyebrowColor: string;
  line: SnippetLine;
  gutterWidth: number;
  /** Shiki tokens for this line; absent until highlighting resolves. */
  tokens?: ThemedToken[];
}> = ({ theme, eyebrowColor, line, gutterWidth, tokens }) => {
  const focusBg = withAlpha(eyebrowColor, 0.16);
  return (
    <View style={{ flexDirection: 'row' }}>
      <Text
        style={{
          width: gutterWidth * 9 + 16,
          textAlign: 'right',
          paddingRight: 10,
          fontFamily: theme.fonts.monospace,
          fontSize: theme.fontSizes[0],
          lineHeight: theme.fontSizes[0] * 1.55,
          color: line.focus ? eyebrowColor : theme.colors.textTertiary,
          backgroundColor: line.focus ? focusBg : 'transparent',
        }}
      >
        {line.num}
      </Text>
      <CodeLineText
        theme={theme}
        text={line.text}
        tokens={tokens}
        focus={line.focus}
        focusBg={focusBg}
      />
    </View>
  );
};

// Shiki `FontStyle` bitmask (Italic = 1, Bold = 2, Underline = 4).
const FONT_STYLE_ITALIC = 1;
const FONT_STYLE_BOLD = 2;
const FONT_STYLE_UNDERLINE = 4;

/**
 * One rendered code line. When shiki `tokens` are present each is a colored
 * `<Text>` run; otherwise the whole line renders as a single monospace run
 * (the state before tokens resolve, or when highlighting failed / the
 * grammar is plain `text`).
 */
const CodeLineText: React.FC<{
  theme: Theme;
  text: string;
  tokens?: ThemedToken[];
  focus: boolean;
  focusBg: string;
}> = ({ theme, text, tokens, focus, focusBg }) => {
  const lineStyle: TextStyle = {
    paddingRight: 14,
    fontFamily: theme.fonts.monospace,
    fontSize: theme.fontSizes[0],
    lineHeight: theme.fontSizes[0] * 1.55,
    color: theme.colors.text,
    backgroundColor: focus ? focusBg : 'transparent',
  };

  if (tokens && tokens.length > 0) {
    return (
      <Text style={lineStyle}>
        {tokens.map((token, i) => (
          <Text key={i} style={tokenStyle(token)}>
            {token.content}
          </Text>
        ))}
      </Text>
    );
  }

  return (
    <Text style={lineStyle}>
      {/* Render a space for blank lines so the focus band still paints. */}
      {text.length > 0 ? text : ' '}
    </Text>
  );
};

function tokenStyle(token: ThemedToken): TextStyle {
  const style: TextStyle = {};
  if (token.color) style.color = token.color;
  const fs = token.fontStyle ?? 0;
  if (fs & FONT_STYLE_ITALIC) style.fontStyle = 'italic';
  if (fs & FONT_STYLE_BOLD) style.fontWeight = 'bold';
  if (fs & FONT_STYLE_UNDERLINE) style.textDecorationLine = 'underline';
  return style;
}

const SnippetMessage: React.FC<{ theme: Theme; text: string }> = ({
  theme,
  text,
}) => (
  <Text
    style={{
      paddingVertical: 14,
      paddingHorizontal: 12,
      fontFamily: theme.fonts.monospace,
      fontSize: theme.fontSizes[0],
      color: theme.colors.textTertiary,
    }}
  >
    {text}
  </Text>
);

const SnippetError: React.FC<{
  theme: Theme;
  message: string;
  onRetry?: () => void;
}> = ({ theme, message, onRetry }) => (
  <View
    style={{
      paddingVertical: 12,
      paddingHorizontal: 12,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    }}
  >
    <Text
      style={{
        flex: 1,
        fontFamily: theme.fonts.body,
        fontSize: theme.fontSizes[0],
        color: theme.colors.textSecondary,
        lineHeight: theme.fontSizes[0] * 1.5,
      }}
    >
      {message}
    </Text>
    {onRetry ? (
      <Pressable
        onPress={onRetry}
        hitSlop={8}
        accessibilityRole="button"
        style={{
          paddingVertical: 4,
          paddingHorizontal: 10,
          borderRadius: theme.radii[1],
          borderWidth: 1,
          borderColor: theme.colors.border,
        }}
      >
        <Text
          style={{
            fontFamily: theme.fonts.monospace,
            fontSize: theme.fontSizes[0],
            color: theme.colors.textSecondary,
            fontWeight: String(
              theme.fontWeights.medium,
            ) as TextStyle['fontWeight'],
          }}
        >
          Retry
        </Text>
      </Pressable>
    ) : null}
  </View>
);

/** `12–48` for multi-line windows, `12` for a single line. */
function formatRange(snippet: TrailMarkerSnippet): string | null {
  const { startLine, endLine } = snippet;
  if (startLine == null) return null;
  return startLine === endLine ? `${startLine}` : `${startLine}–${endLine}`;
}

/**
 * Pick the shiki theme that matches the app theme by the luminance of its
 * background — a dark surface gets `github-dark`, a light one `github-light`
 * — so highlighted code reads on whatever surface the brief is painting.
 */
function pickShikiTheme(background: string): ShikiThemeName {
  const hex = background.trim().replace('#', '');
  const full =
    hex.length === 3
      ? hex
          .split('')
          .map((c) => c + c)
          .join('')
      : hex;
  if (full.length < 6) return 'github-light';
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  if ([r, g, b].some(Number.isNaN)) return 'github-light';
  // Rec. 601 relative luminance.
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance < 0.5 ? 'github-dark' : 'github-light';
}
