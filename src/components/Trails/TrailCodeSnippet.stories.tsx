import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import React from 'react';
import { View } from 'react-native';
import { useTheme } from '@principal-ade/industry-theme';

import { TrailCodeSnippet } from './TrailCodeSnippet';
import { GitHubFileContentError } from '../../services/TrailFileContentService';
import type { TrailMarkerSnippet } from '../../types/Trail';

// ---------------------------------------------------------------------------
// Harness — pads the snippet on the card's secondary background so the
// bordered container reads the way it does inside an expanded route row.
// ---------------------------------------------------------------------------
const Harness: React.FC<React.ComponentProps<typeof TrailCodeSnippet>> = (
  props,
) => {
  const { theme } = useTheme();
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: theme.colors.backgroundSecondary,
        padding: 16,
        justifyContent: 'center',
      }}
    >
      <TrailCodeSnippet {...props} />
    </View>
  );
};

// A believable source file so the slice + gutter offset read realistically.
const SESSION_TS = `import { db } from '../db';
import { signToken } from './token';

export interface Session {
  id: string;
  userId: string;
  token: string;
}

/**
 * Persist a new session row and return it. NOTE: this writes before the
 * remote /login call has settled — see the trail.
 */
export async function createSession(userId: string): Promise<Session> {
  const id = crypto.randomUUID();
  const token = await signToken(userId);
  const row: Session = { id, userId, token };
  await persistSession(row);
  return row;
}

async function persistSession(row: Session): Promise<void> {
  await db.sessions.insert(row);
}`;

const SLICE_SNIPPET: TrailMarkerSnippet = {
  kind: 'slice',
  startLine: 14,
  endLine: 20,
  focusLine: 18,
  contextLines: 2,
};

const DIFF_SNIPPET: TrailMarkerSnippet = {
  kind: 'diff',
  startLine: 14,
  endLine: 20,
  focusLine: 18,
  contextLines: 2,
  oldContents: SESSION_TS,
  newContents: SESSION_TS.replace(
    'await persistSession(row);\n  return row;',
    'const result = await loginRemote(userId);\n  await persistSession(row);\n  return row;',
  ),
};

const EYEBROW = '#a855f7';

/** Resolves after a short delay so the loading state is observable. */
const slowReadFile = (contents: string) => (_path: string) =>
  new Promise<string>((resolve) => setTimeout(() => resolve(contents), 600));

/** Never resolves — parks the snippet in its loading state. */
const hangingReadFile = (_path: string) => new Promise<string>(() => {});

const failingReadFile = (status: number) => (_path: string) =>
  Promise.reject(new GitHubFileContentError(`HTTP ${status}`, status));

const meta: Meta<typeof Harness> = {
  title: 'Trails/TrailCodeSnippet',
  component: Harness,
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof Harness>;

export const Slice: Story = {
  args: {
    filePath: 'src/auth/session.ts',
    snippet: SLICE_SNIPPET,
    readFile: slowReadFile(SESSION_TS),
    eyebrowColor: EYEBROW,
  },
};

export const Diff: Story = {
  args: {
    filePath: 'src/auth/session.ts',
    snippet: DIFF_SNIPPET,
    eyebrowColor: '#f97316',
  },
};

export const Loading: Story = {
  args: {
    filePath: 'src/auth/session.ts',
    snippet: SLICE_SNIPPET,
    readFile: hangingReadFile,
    eyebrowColor: EYEBROW,
  },
};

export const NoAccess: Story = {
  args: {
    filePath: 'src/auth/session.ts',
    snippet: SLICE_SNIPPET,
    readFile: failingReadFile(403),
    eyebrowColor: EYEBROW,
  },
};

export const NotFound: Story = {
  args: {
    filePath: 'src/auth/session.ts',
    snippet: SLICE_SNIPPET,
    readFile: failingReadFile(404),
    eyebrowColor: EYEBROW,
  },
};

// Slice snippet with no reader wired — the "no source available" state.
export const NoReader: Story = {
  args: {
    filePath: 'src/auth/session.ts',
    snippet: SLICE_SNIPPET,
    eyebrowColor: EYEBROW,
  },
};
