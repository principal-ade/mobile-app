import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import React from 'react';
import { View } from 'react-native';
import { useTheme } from '@principal-ade/industry-theme';

import { TrailBriefCard } from './TrailBriefCard';
import { trailPayloadToBriefProps } from './trailBriefAdapter';
import type { TrailPayload, TrailSignOff } from '../../types/Trail';

// ---------------------------------------------------------------------------
// Harness — centers the card inside the viewport with the same muted
// background the modal would paint behind it. Lets the card render at
// real size without the modal chrome on top.
//
// `presentation: 'screen'` flips the harness to a full-bleed flex View;
// the card owns its own internal route scroll, so wrapping in a
// ScrollView here would re-introduce the nested-virtualization warning.
// ---------------------------------------------------------------------------
const CardHarness: React.FC<
  React.ComponentProps<typeof TrailBriefCard>
> = (props) => {
  const { theme } = useTheme();
  if (props.presentation === 'screen') {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
        <TrailBriefCard {...props} />
      </View>
    );
  }
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: theme.colors.background,
        padding: 16,
        justifyContent: 'center',
      }}
    >
      <TrailBriefCard {...props} />
    </View>
  );
};

const SUMMARY_BODY = `**Login currently writes the session before the API call settles** — so a network failure mid-request leaves an orphaned session row.

Walk the three markers and decide whether the call order should be inverted.`;

const STOPS = [
  {
    id: 'm-login',
    label: 'login() entry point',
    sourcePath: 'src/auth/login.ts',
    description:
      'Public entry. Validates credentials, then delegates to `createSession` before awaiting the remote `/login` call.',
  },
  {
    id: 'm-create-session',
    label: 'createSession() writes before API settles',
    sourcePath: 'src/auth/session.ts',
    kind: 'subject' as const,
    description:
      '**This is the race.** The session row is persisted *before* the API call resolves — a failure mid-flight leaves an orphan that the next login picks up.',
  },
  {
    id: 'm-api-client',
    label: 'API client retries swallow the failure',
    sourcePath: 'src/api/client.ts',
    description:
      'Retry middleware coerces any 5xx into a resolved promise after exhausting retries, masking the failure from `login()`.',
  },
];

const SIGN_OFFS: TrailSignOff[] = [
  {
    id: 'sign-1',
    author: 'Alice Hoffman',
    signedAt: '2026-05-08T14:22:00Z',
    comment: 'Direction looks right — left a note on the API ordering.',
  },
  {
    id: 'sign-2',
    author: 'Bob Chen',
    signedAt: '2026-05-09T09:10:00Z',
  },
  {
    id: 'sign-3',
    author: 'Carol Diaz',
    signedAt: '2026-05-10T16:48:00Z',
    comment: 'Agreed.',
  },
];

const BASE_ARGS: React.ComponentProps<typeof TrailBriefCard> = {
  body: SUMMARY_BODY,
  title: 'Login flow has a write-before-settle race',
  author: 'Fernando',
  createdAt: new Date(Date.now() - 1000 * 60 * 60 * 26).toISOString(),
  repoCount: 1,
  fileCount: 3,
  stops: STOPS,
};

const meta: Meta<typeof CardHarness> = {
  title: 'Trails/TrailBriefCard',
  component: CardHarness,
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;
type Story = StoryObj<typeof CardHarness>;

export const InformativeUnverified: Story = {
  args: { ...BASE_ARGS, purpose: 'informative' },
};

export const SharedRequestLgtm: Story = {
  args: {
    ...BASE_ARGS,
    isShared: true,
    request: 'Verify Direction',
    purpose: 'investigation',
  },
};

export const SignedByCurrentUser: Story = {
  args: {
    ...BASE_ARGS,
    isShared: true,
    request: 'Verify Direction',
    purpose: 'investigation',
    signOffs: SIGN_OFFS,
    signedByCurrentUser: true,
  },
};

export const SharedWithAllRosters: Story = {
  args: {
    ...BASE_ARGS,
    isShared: true,
    request: 'Verify Direction',
    purpose: 'investigation',
    signOffs: SIGN_OFFS,
    notedBy: ['Dani Reyes', 'Bob Chen'],
    notesByAuthor: {
      'Bob Chen': ['m-api-client'],
      'Dani Reyes': ['m-create-session'],
    },
  },
};

// Phone screen layout. The brief IS the screen — no card chrome, no
// maxWidth, body grows in flow, host ScrollView drives scrolling.
export const ScreenPresentation: Story = {
  args: {
    ...BASE_ARGS,
    isShared: true,
    request: 'Verify Direction',
    purpose: 'investigation',
    signOffs: SIGN_OFFS,
    notedBy: ['Dani Reyes', 'Bob Chen'],
    presentation: 'screen',
    expandInline: true,
  },
};

// Suppresses the REVIEWED BY / NOTES BY rows. Used when the brief is
// competing for vertical space with another zone.
export const HideCohortStrips: Story = {
  args: {
    ...BASE_ARGS,
    isShared: true,
    request: 'Verify Direction',
    purpose: 'investigation',
    signOffs: SIGN_OFFS,
    notedBy: ['Dani Reyes', 'Bob Chen'],
    hideCohortStrips: true,
  },
};

// ---------------------------------------------------------------------------
// Adapter-driven story. Unlike the stories above — which hand the card the
// already-flattened prop shape — this one starts from a raw `TrailPayload`
// (the exact envelope `getTrailById` returns) and runs it through
// `trailPayloadToBriefProps`, exercising the real fetch → adapter → card
// path including note-body extraction and snippet anchor captioning.
//
// Note bodies render in a stop's expandable region, so TAP A STOP (or the
// 00 Overview row for the summary-scoped note) to reveal its notes — the
// same interaction the description preview uses.
// ---------------------------------------------------------------------------
const RAW_PAYLOAD: TrailPayload = {
  id: 'trail-notes-demo',
  title: 'Login flow has a write-before-settle race',
  purpose: 'investigation',
  share: { id: 'share-1' },
  request: 'Verify Direction',
  author: 'Fernando',
  summary: SUMMARY_BODY,
  createdAt: '2026-06-03T09:00:00Z',
  updatedAt: '2026-06-04T12:00:00Z',
  markers: [
    {
      id: 'm-login',
      label: 'login() entry point',
      sourcePath: 'src/auth/login.ts',
      description: STOPS[0].description,
    },
    {
      id: 'm-create-session',
      label: 'createSession() writes before API settles',
      sourcePath: 'src/auth/session.ts',
      kind: 'subject',
      description: STOPS[1].description,
    },
    {
      id: 'm-api-client',
      label: 'API client retries swallow the failure',
      sourcePath: 'src/api/client.ts',
      description: STOPS[2].description,
    },
  ],
  views: [{ kind: 'linear' }],
  notes: [
    // Summary-scoped markdown note — surfaces under the 00 Overview row.
    {
      id: 'note-summary',
      kind: 'markdown',
      scope: { kind: 'summary' },
      anchor: { kind: 'text-quote', exact: 'write-before-settle race' },
      body: 'Worth deciding whether this is a release blocker before we even touch the call order.',
      author: 'Dani Reyes',
      createdAt: '2026-06-03T10:15:00Z',
      updatedAt: '2026-06-03T10:15:00Z',
    },
    // Markdown note scoped to a marker description — no location caption.
    {
      id: 'note-login-desc',
      kind: 'markdown',
      scope: { kind: 'description', markerId: 'm-login' },
      anchor: { kind: 'text-quote', exact: 'delegates to `createSession`' },
      body: 'This delegation is the whole problem — it commits before we know the call will succeed.',
      author: 'Bob Chen',
      createdAt: '2026-06-03T11:00:00Z',
      updatedAt: '2026-06-03T11:00:00Z',
    },
    // Snippet slice note — caption renders as `src/auth/session.ts:12–18`.
    {
      id: 'note-session-slice',
      kind: 'snippet',
      scope: { markerId: 'm-create-session' },
      anchor: {
        kind: 'slice',
        ranges: [
          {
            startLine: 12,
            endLine: 18,
            startLineText: 'await persistSession(row)',
            endLineText: '}',
          },
        ],
      },
      body: 'Move this write **below** the awaited `/login` call so a network failure never leaves an orphan row.',
      author: 'Dani Reyes',
      createdAt: '2026-06-03T12:30:00Z',
      updatedAt: '2026-06-03T12:30:00Z',
    },
    // Snippet diff note — caption renders as `src/api/client.ts:42`.
    {
      id: 'note-client-diff',
      kind: 'snippet',
      scope: { markerId: 'm-api-client' },
      anchor: { kind: 'diff', side: 'additions', lineNumber: 42 },
      body: 'Coercing 5xx into a resolved promise is what hides the failure from `login()`.',
      author: 'Bob Chen',
      createdAt: '2026-06-03T13:45:00Z',
      updatedAt: '2026-06-03T13:45:00Z',
    },
  ],
};

export const AdapterDrivenWithNotes: Story = {
  args: {
    ...trailPayloadToBriefProps(RAW_PAYLOAD),
    presentation: 'screen',
    expandInline: true,
  },
};

// ---------------------------------------------------------------------------
// Code-snippet story. Stops carry slice snippets; a mock `readFile` stands
// in for the GitHub-backed reader the screen injects. TAP A STOP to expand
// it — the snippet renders below the description, with `focusLine` tinted.
// ---------------------------------------------------------------------------
const SESSION_SOURCE = `export async function createSession(userId: string): Promise<Session> {
  const id = crypto.randomUUID();
  const token = await signToken(userId);
  const row: Session = { id, userId, token };
  await persistSession(row);
  return row;
}`;

const LOGIN_SOURCE = `export async function login(email: string, password: string) {
  const creds = validate(email, password);
  const session = await createSession(creds.userId);
  const res = await api.post('/login', creds);
  return { session, res };
}`;

const MOCK_SOURCES: Record<string, string> = {
  'src/auth/session.ts': SESSION_SOURCE,
  'src/auth/login.ts': LOGIN_SOURCE,
};

const mockReadFile = (path: string) =>
  new Promise<string>((resolve, reject) => {
    setTimeout(() => {
      const contents = MOCK_SOURCES[path];
      if (contents) resolve(contents);
      else reject(new Error(`No mock source for ${path}`));
    }, 500);
  });

const SNIPPET_STOPS = [
  {
    ...STOPS[0],
    snippet: {
      kind: 'slice' as const,
      startLine: 1,
      endLine: 3,
      focusLine: 3,
      contextLines: 1,
    },
  },
  {
    ...STOPS[1],
    snippet: {
      kind: 'slice' as const,
      startLine: 4,
      endLine: 5,
      focusLine: 5,
      contextLines: 1,
    },
  },
  STOPS[2],
];

export const WithCodeSnippets: Story = {
  args: {
    ...BASE_ARGS,
    stops: SNIPPET_STOPS,
    purpose: 'informative',
    presentation: 'screen',
    expandInline: true,
    readFile: mockReadFile,
  },
};
