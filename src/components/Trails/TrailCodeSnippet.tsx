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
 * PHASE 1 (this file): no syntax highlighting — every line is a single
 * monospace run. The renderer is deliberately split so PHASE 2 swaps only
 * `CodeLineText` for `react-native-shiki-engine`-tokenized spans (per the
 * `t3code` "Mobile renders code with Shiki" trail) without touching the
 * load / slice / layout code around it.
 *
 * Slice snippets resolve their contents through `readFile` (GitHub at the
 * authored commit). Diff snippets carry their own `oldContents` /
 * `newContents` and need no reader; phase 1 renders the post-change side
 * as a plain slice (inline +/- coloring is deferred to a later pass).
 */

import React from 'react';
import { View, Text, ScrollView, Pressable, TextStyle } from 'react-native';
import { useTheme, type Theme } from '@principal-ade/industry-theme';

import type { TrailMarkerSnippet } from '../../types/Trail';
import type { TrailFileReader } from '../../services/TrailFileContentService';
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

  const rangeLabel = formatRange(snippet);

  return (
    <View
      style={{
        marginTop: 8,
        borderWidth: 1,
        borderColor: withAlpha(eyebrowColor, 0.3),
        borderRadius: theme.radii[1],
        backgroundColor: theme.colors.background,
        overflow: 'hidden',
      }}
    >
      <SnippetHeader
        theme={theme}
        eyebrowColor={eyebrowColor}
        filePath={filePath}
        rangeLabel={rangeLabel}
        isDiff={snippet.kind === 'diff'}
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
            {state.slice.lines.map((line) => (
              <CodeRow
                key={line.num}
                theme={theme}
                eyebrowColor={eyebrowColor}
                line={line}
                gutterWidth={state.slice.gutterWidth}
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
}> = ({ theme, eyebrowColor, filePath, rangeLabel, isDiff }) => (
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
  </View>
);

const CodeRow: React.FC<{
  theme: Theme;
  eyebrowColor: string;
  line: SnippetLine;
  gutterWidth: number;
}> = ({ theme, eyebrowColor, line, gutterWidth }) => {
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
        focus={line.focus}
        focusBg={focusBg}
      />
    </View>
  );
};

/**
 * Seam for PHASE 2. Today: one monospace run for the whole line. Later:
 * map shiki tokens to colored `<Text>` children here — nothing else in
 * this file changes.
 */
const CodeLineText: React.FC<{
  theme: Theme;
  text: string;
  focus: boolean;
  focusBg: string;
}> = ({ theme, text, focus, focusBg }) => (
  <Text
    style={{
      paddingRight: 14,
      fontFamily: theme.fonts.monospace,
      fontSize: theme.fontSizes[0],
      lineHeight: theme.fontSizes[0] * 1.55,
      color: theme.colors.text,
      backgroundColor: focus ? focusBg : 'transparent',
    }}
  >
    {/* Render a space for blank lines so the focus band still paints. */}
    {text.length > 0 ? text : ' '}
  </Text>
);

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
